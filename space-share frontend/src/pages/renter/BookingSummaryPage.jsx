import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';

const BookingSummaryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Fetch the booking details
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await api.get('/bookings/my-bookings');
        const found = (response.data?.data?.bookings || []).find((b) => b.id === id);
        if (found) {
          setBooking(found);
          if (found.payment_status === 'paid') {
            setPaymentSuccess(true);
          }
        } else {
          setError('Booking reservation not found.');
        }
      } catch (err) {
        console.error('Failed to load booking:', err);
        setError('Failed to fetch booking details.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  // Razorpay Payment Handler
  const handlePayment = async () => {
    if (!booking) return;
    setError('');
    setPaying(true);

    try {
      // 1. Create order on backend
      const orderRes = await api.post('/payments/create-order', {
        booking_id: booking.id,
      });

      const orderData = orderRes.data?.data;
      if (!orderData || !orderData.order_id) {
        throw new Error('Failed to create Razorpay payment order');
      }

      // Check if Razorpay script loaded
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please refresh and try again.');
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: orderData.key_id, // Use ONLY key_id from create-order
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'SpaceShare',
        description: `Booking for ${booking.venues?.title || 'Celebration Venue'}`,
        order_id: orderData.order_id,
        prefill: {
          name: user?.user_metadata?.full_name || '',
          email: user?.email || '',
          contact: user?.user_metadata?.phone || '',
        },
        theme: {
          color: '#ae310a',
        },
        handler: async (response) => {
          try {
            setPaying(true);
            // 3. Verify payment signature on backend
            const verifyRes = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking_id: booking.id,
            });

            if (verifyRes.data?.success) {
              setPaymentSuccess(true);
              setBooking((prev) => ({
                ...prev,
                payment_status: 'paid',
                status: 'confirmed',
              }));
            }
          } catch (verifyErr) {
            console.error('Payment verification failed:', verifyErr);
            setError(
              verifyErr.response?.data?.message ||
              'Payment verification failed. Please contact support if your account was charged.'
            );
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (failRes) => {
        console.error('Razorpay payment failed:', failRes.error);
        setError(`Payment failed: ${failRes.error.description}`);
        setPaying(false);
      });

      rzp.open();
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Could not initiate payment. Please try again.'
      );
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 animate-pulse space-y-4">
        <div className="h-8 bg-surface-container-high rounded w-1/3" />
        <div className="h-64 bg-surface-container-high rounded-2xl" />
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card">
        <span className="material-symbols-outlined text-error text-5xl mb-2">cancel</span>
        <h2 className="text-xl font-bold font-headline mb-2">Booking Not Found</h2>
        <p className="text-sm text-on-surface-variant mb-6">{error}</p>
        <Link to="/venues" className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold">
          Explore Other Venues
        </Link>
      </div>
    );
  }

  const venue = booking.venues;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 w-full">
      <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-10 border border-outline-variant/30 shadow-modal">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-container/15 text-primary mb-3">
            <span className="material-symbols-outlined text-3xl">receipt_long</span>
          </div>
          <h1 className="font-headline font-bold text-2xl sm:text-3xl text-on-surface">
            {paymentSuccess ? 'Booking Confirmed!' : 'Review Booking & Pay'}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {paymentSuccess
              ? 'Your celebration venue reservation is secured and paid.'
              : 'Complete your Razorpay payment within the hold window to lock your reservation.'}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 flex items-start gap-3 text-error text-sm">
            <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/20 space-y-4 mb-6">
          <div className="flex justify-between items-start gap-4 border-b border-outline-variant/20 pb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">
                Selected Venue
              </span>
              <h2 className="font-headline font-bold text-lg text-on-surface">
                {venue?.title || venue?.name || 'Celebration Venue'}
              </h2>
              <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>
                {[venue?.address, venue?.city].filter(Boolean).join(', ')}
              </p>
            </div>
            <StatusBadge type="booking" status={booking.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-on-surface-variant font-medium block">Date</span>
              <span className="font-bold text-on-surface text-sm">{booking.booking_date}</span>
            </div>
            <div>
              <span className="text-on-surface-variant font-medium block">Slot Timing</span>
              <span className="font-bold text-on-surface text-sm">
                {booking.start_time} to {booking.end_time}
              </span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="pt-4 border-t border-outline-variant/20 flex justify-between items-center">
            <span className="font-semibold text-sm text-on-surface">Total Amount to Pay</span>
            <span className="font-headline font-extrabold text-2xl text-primary-container">
              ₹{Number(booking.total_amount).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Actions */}
        {paymentSuccess ? (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-tertiary-container/15 border border-tertiary/20 text-center text-tertiary font-bold text-sm flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-xl">check_circle</span>
              Payment Verified • Reservation Locked
            </div>
            <div className="flex gap-3">
              <Link
                to="/my-bookings"
                className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm text-center hover:bg-primary-container transition"
              >
                Go to My Bookings
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handlePayment}
              disabled={paying || booking.status === 'cancelled'}
              className="w-full py-3.5 px-6 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary-container transition shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {paying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Checkout...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">payment</span>
                  <span>Pay ₹{Number(booking.total_amount).toLocaleString('en-IN')} via Razorpay</span>
                </>
              )}
            </button>

            <p className="text-xs text-center text-on-surface-variant">
              Supports UPI, Credit/Debit Cards, Netbanking & Wallets securely through Razorpay.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingSummaryPage;
