import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';

const BookingCard = ({ booking, onPayNow, onCancel, isOwnerView = false }) => {
  if (!booking) return null;

  const venue = booking.venues;
  const renter = booking.profiles;

  const isPendingUnpaid =
    booking.status === 'pending' && booking.payment_status === 'unpaid';

  const canCancel =
    booking.status !== 'cancelled' && booking.status !== 'completed';

  const canPay =
    !isOwnerView &&
    booking.payment_status === 'unpaid' &&
    booking.status !== 'cancelled';

  // Check if hold is expired
  const isHoldExpired =
    booking.hold_expires_at &&
    new Date(booking.hold_expires_at) < new Date() &&
    booking.payment_status === 'unpaid';

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-card flex flex-col md:flex-row justify-between gap-6 transition hover:shadow-floating">
      {/* Left Details */}
      <div className="space-y-3 flex-grow">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge type="booking" status={booking.status} />
          <StatusBadge type="payment" status={booking.payment_status} />
          {isHoldExpired && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-error/10 text-error border border-error/20">
              Hold Expired
            </span>
          )}
        </div>

        <div>
          <h3 className="font-headline font-bold text-xl text-on-surface">
            {venue?.title || venue?.name || 'Celebration Venue'}
          </h3>
          <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>
            {[venue?.address, venue?.city].filter(Boolean).join(', ') || 'India'}
          </p>
        </div>

        {/* Schedule & Timing */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-surface-container-low p-3.5 rounded-xl text-xs">
          <div>
            <span className="text-on-surface-variant block font-medium">Date</span>
            <span className="font-bold text-on-surface">{booking.booking_date}</span>
          </div>
          <div>
            <span className="text-on-surface-variant block font-medium">Time Slot</span>
            <span className="font-bold text-on-surface">
              {booking.start_time} - {booking.end_time}
            </span>
          </div>
          <div>
            <span className="text-on-surface-variant block font-medium">Total Amount</span>
            <span className="font-extrabold text-primary-container text-sm">
              ₹{Number(booking.total_amount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* If Owner View, show renter contact details */}
        {isOwnerView && renter && (
          <div className="text-xs bg-secondary-container/40 p-3 rounded-xl space-y-1">
            <span className="font-bold text-on-surface block">Renter Contact:</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-on-surface-variant">
              <span>Name: {renter.full_name || 'N/A'}</span>
              <span>Email: {renter.email || 'N/A'}</span>
              <span>Phone: {renter.phone || 'N/A'}</span>
            </div>
          </div>
        )}

        {/* Hold expiration warning */}
        {isPendingUnpaid && !isHoldExpired && booking.hold_expires_at && (
          <p className="text-xs text-amber-700 flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">timer</span>
            Hold expires at {new Date(booking.hold_expires_at).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Right Action buttons */}
      <div className="flex md:flex-col justify-end items-end gap-2 shrink-0 md:min-w-[140px]">
        {canPay && (
          <button
            onClick={() => onPayNow(booking)}
            className="w-full sm:w-auto md:w-full px-5 py-2.5 rounded-xl bg-primary-container text-white font-semibold hover:bg-primary transition shadow-sm text-sm flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            Pay Now
          </button>
        )}

        {canCancel && (
          <button
            onClick={() => onCancel(booking.id)}
            className="w-full sm:w-auto md:w-full px-4 py-2 rounded-xl bg-surface-container-high text-on-surface font-medium hover:bg-error/15 hover:text-error transition text-xs flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">cancel</span>
            Cancel Booking
          </button>
        )}

        {venue?.id && (
          <Link
            to={`/venues/${venue.id}`}
            className="w-full text-center text-xs font-semibold text-primary hover:underline py-1"
          >
            View Venue
          </Link>
        )}
      </div>
    </div>
  );
};

export default BookingCard;
