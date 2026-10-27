const { supabaseAdmin } = require('../config/config');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * 1. Create a booking
 * SECURITY: renter_id is set STRICTLY from req.user.id
 *           venue must be is_active AND is_verified
 */
const createBooking = async (req, res, next) => {
  try {
    const renterId = req.user.id;
    const { venue_id, booking_date, start_time, end_time, total_amount } = req.body;

    if (!venue_id || !booking_date || !start_time || !end_time || total_amount === undefined) {
      return errorResponse(res, 'venue_id, booking_date, start_time, end_time, and total_amount are required', 400);
    }

    // Fetch venue and verify it is active + verified
    const { data: venue, error: venueError } = await supabaseAdmin
      .from('venues')
      .select('id, owner_id, is_active, is_verified')
      .eq('id', venue_id)
      .maybeSingle();

    if (venueError || !venue) {
      return errorResponse(res, 'Venue not found', 404);
    }

    if (!venue.is_active) {
      return errorResponse(res, 'Venue is not currently active', 400);
    }

    if (!venue.is_verified) {
      return errorResponse(res, 'Venue is not yet verified', 400);
    }

    // Prevent owner from booking their own venue
    if (venue.owner_id === renterId) {
      return errorResponse(res, 'You cannot book your own venue', 400);
    }

    // Cancel expired unpaid holds for this venue so they don't block the slot
    // (DB exclusion constraint requires status change, not just time expiry)
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('venue_id', venue_id)
      .eq('status', 'pending')
      .eq('payment_status', 'unpaid')
      .lt('hold_expires_at', new Date().toISOString());

    // Check for overlapping bookings on the same date/time
    const { data: overlapping } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('venue_id', venue_id)
      .eq('booking_date', booking_date)
      .neq('status', 'cancelled')
      .lt('start_time', end_time)
      .gt('end_time', start_time)
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      return errorResponse(res, 'This time slot is already booked for the selected date', 409);
    }

    // Set a 10-minute hold window for payment
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const bookingPayload = {
      venue_id,
      renter_id: renterId,
      booking_date,
      start_time,
      end_time,
      total_amount: Number(total_amount),
      status: 'pending',
      payment_status: 'unpaid',
      hold_expires_at: holdExpiresAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: booking, error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert(bookingPayload)
      .select()
      .single();

    if (insertError) {
      return errorResponse(res, 'Failed to create booking', 500, insertError.message);
    }

    return successResponse(res, { booking }, 'Booking created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Get bookings for the current renter
 */
const getMyBookings = async (req, res, next) => {
  try {
    const renterId = req.user.id;

    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('*, venues(id, name, title, address, city)')
      .eq('renter_id', renterId)
      .order('created_at', { ascending: false });

    if (error) {
      return errorResponse(res, 'Failed to fetch bookings', 500, error.message);
    }

    return successResponse(res, { bookings: bookings || [] }, 'Bookings fetched successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Get bookings for venues owned by the current user
 * SECURITY: Only returns bookings for venues where owner_id matches req.user.id
 */
const getVenueOwnerBookings = async (req, res, next) => {
  try {
    const ownerId = req.user.id;

    // First, get all venue IDs owned by this user
    const { data: ownedVenues, error: venueError } = await supabaseAdmin
      .from('venues')
      .select('id')
      .eq('owner_id', ownerId);

    if (venueError) {
      return errorResponse(res, 'Failed to fetch owned venues', 500, venueError.message);
    }

    if (!ownedVenues || ownedVenues.length === 0) {
      return successResponse(res, { bookings: [] }, 'No venues found');
    }

    const venueIds = ownedVenues.map((v) => v.id);

    const { data: bookings, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*, venues(id, name, title, address, city), profiles:renter_id(id, full_name, email, phone)')
      .in('venue_id', venueIds)
      .order('created_at', { ascending: false });

    if (bookingError) {
      return errorResponse(res, 'Failed to fetch venue bookings', 500, bookingError.message);
    }

    return successResponse(res, { bookings: bookings || [] }, 'Venue bookings fetched successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Cancel a booking
 * SECURITY: Fetch booking first, then verify that the caller is
 *           either the renter OR the venue owner before writing.
 */
const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Fetch booking to verify ownership
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*, venues(id, owner_id)')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Check: caller must be the renter, the venue owner, or an admin
    const isRenter = booking.renter_id === userId;
    const isVenueOwner = booking.venues && booking.venues.owner_id === userId;

    if (!isRenter && !isVenueOwner && !isAdmin) {
      return errorResponse(res, 'Forbidden: You do not have permission to cancel this booking', 403);
    }

    if (booking.status === 'cancelled') {
      return errorResponse(res, 'Booking is already cancelled', 400);
    }

    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return errorResponse(res, 'Failed to cancel booking', 500, updateError.message);
    }

    return successResponse(res, { booking: updatedBooking }, 'Booking cancelled successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getVenueOwnerBookings,
  cancelBooking,
};
