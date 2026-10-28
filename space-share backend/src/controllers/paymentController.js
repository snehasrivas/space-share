const crypto = require('crypto');
const Razorpay = require('razorpay');
const { supabaseAdmin, config } = require('../config/config');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Lazily initialised — avoids crash at startup if keys are missing during tests
let razorpayInstance = null;
const getRazorpay = () => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    });
  }
  return razorpayInstance;
};

/**
 * 1. Create a Razorpay order for a booking
 * SECURITY: Fetches booking row, verifies renter_id === req.user.id
 *           before creating the order. Stores razorpay_order_id on the booking.
 */
const createOrder = async (req, res, next) => {
  try {
    const { booking_id } = req.body;
    const userId = req.user.id;

    if (!booking_id) {
      return errorResponse(res, 'booking_id is required', 400);
    }

    // Fetch booking and verify renter ownership
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .maybeSingle();

    if (fetchError || !booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.renter_id !== userId) {
      return errorResponse(res, 'Forbidden: This booking does not belong to you', 403);
    }

    if (booking.payment_status === 'paid') {
      return errorResponse(res, 'This booking is already paid', 400);
    }

    if (booking.status === 'cancelled') {
      return errorResponse(res, 'Cannot pay for a cancelled booking', 400);
    }

    // Create Razorpay order (amount in paise)
    const amountInPaise = Math.round(Number(booking.total_amount) * 100);

    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: booking.id,
      notes: {
        booking_id: booking.id,
        renter_id: userId,
        venue_id: booking.venue_id,
      },
    };

    const razorpayOrder = await getRazorpay().orders.create(orderOptions);

    // Persist the razorpay_order_id on the booking
    await supabaseAdmin
      .from('bookings')
      .update({
        razorpay_order_id: razorpayOrder.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    return successResponse(
      res,
      {
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        booking_id: booking.id,
        key_id: config.razorpayKeyId,
      },
      'Razorpay order created successfully',
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Verify Razorpay payment signature (called from frontend after checkout)
 * SECURITY: HMAC SHA256 signature verification before marking as paid.
 *           Also verifies renter_id matches req.user.id.
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = req.body;
    const userId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_id) {
      return errorResponse(res, 'razorpay_order_id, razorpay_payment_id, razorpay_signature, and booking_id are required', 400);
    }

    // Fetch booking and verify renter ownership
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .maybeSingle();

    if (fetchError || !booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.renter_id !== userId) {
      return errorResponse(res, 'Forbidden: This booking does not belong to you', 403);
    }

    // Verify that the razorpay_order_id matches what we stored
    if (booking.razorpay_order_id && booking.razorpay_order_id !== razorpay_order_id) {
      return errorResponse(res, 'Order ID mismatch', 400);
    }

    // HMAC SHA256 signature verification
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return errorResponse(res, 'Payment verification failed: Invalid signature', 400);
    }

    // If booking was cancelled (e.g. hold expired), do NOT mark confirmed. Log for refund.
    if (booking.status === 'cancelled') {
      console.error(
        `[REFUND NEEDED] verifyPayment: booking ${booking.id} is cancelled. Payment ID: ${razorpay_payment_id}, Order ID: ${razorpay_order_id}, Amount: ${booking.total_amount}. Refund required.`
      );
      return errorResponse(
        res,
        'Booking has been cancelled due to expired hold. Payment received and logged for refund.',
        400
      );
    }

    // Signature valid — mark booking as paid
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_id: razorpay_payment_id,
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .select()
      .single();

    if (updateError) {
      return errorResponse(res, 'Signature verified but failed to update booking', 500, updateError.message);
    }

    return successResponse(
      res,
      { booking: updatedBooking },
      'Payment verified and booking confirmed'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Razorpay Webhook handler
 * SECURITY: No auth middleware — uses its own RAZORPAY_WEBHOOK_SECRET
 *           to verify the X-Razorpay-Signature header via HMAC SHA256.
 *           Acts as a server-to-server fallback if the frontend verify call fails.
 */
const webhook = async (req, res, next) => {
  try {
    const webhookSecret = config.razorpayWebhookSecret;
    const signature = req.headers['x-razorpay-signature'];

    if (!signature || !webhookSecret) {
      return res.status(400).json({ success: false, message: 'Missing webhook signature or secret' });
    }

    // Verify webhook signature using raw body
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body;
    const eventType = event.event;

    // Handle payment.captured event
    if (eventType === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (!payment) {
        return res.status(200).json({ success: true, message: 'No payment entity found, skipping' });
      }

      const razorpayOrderId = payment.order_id;
      const razorpayPaymentId = payment.id;

      if (!razorpayOrderId) {
        return res.status(200).json({ success: true, message: 'No order_id in payment, skipping' });
      }

      // Find the booking by razorpay_order_id
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id, payment_status, status, total_amount')
        .eq('razorpay_order_id', razorpayOrderId)
        .maybeSingle();

      if (booking) {
        if (booking.status === 'cancelled') {
          console.error(
            `[REFUND NEEDED] webhook payment.captured: booking ${booking.id} is cancelled. Payment ID: ${razorpayPaymentId}, Order ID: ${razorpayOrderId}, Amount: ${payment.amount ? payment.amount / 100 : booking.total_amount}. Refund required.`
          );
          return res.status(200).json({
            success: false,
            message: 'Booking has been cancelled due to expired hold. Payment logged for refund.',
          });
        }

        if (booking.payment_status !== 'paid') {
          await supabaseAdmin
            .from('bookings')
            .update({
              payment_status: 'paid',
              payment_id: razorpayPaymentId,
              status: 'confirmed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', booking.id);
        }
      }
    }

    // Always respond 200 to Razorpay so it doesn't retry
    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  webhook,
};
