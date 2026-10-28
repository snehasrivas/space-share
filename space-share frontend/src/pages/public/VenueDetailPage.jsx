import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';

const VenueDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);

  // Booking Form State
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('18:00');
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const response = await api.get(`/venues/${id}`);
        setVenue(response.data?.data?.venue || response.data?.data);
      } catch (err) {
        console.error('Failed to load venue details:', err);
        setError(err.response?.data?.message || 'Venue not found or unavailable');
      } finally {
        setLoading(false);
      }
    };

    fetchVenue();
  }, [id]);

  // Calculate pricing
  const calculateTotal = () => {
    if (!venue) return 0;
    if (venue.pricing_type === 'flat' && venue.flat_price) {
      return Number(venue.flat_price);
    }
    if (venue.pricing_type === 'daily' && venue.price_per_day) {
      return Number(venue.price_per_day);
    }

    // Default to hourly calculation
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const hours = Math.max(1, (endH + endM / 60) - (startH + startM / 60));
      const rate = Number(venue.price_per_hour || venue.price_per_day || venue.flat_price || 1000);
      return Math.round(hours * rate);
    }

    return Number(venue.price_per_hour || 0);
  };

  const totalAmount = calculateTotal();
  const isOwner = user && venue && venue.owner_id === user.id;

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');

    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (isOwner) {
      setBookingError('You cannot book your own venue.');
      return;
    }

    if (startTime >= endTime) {
      setBookingError('End time must be after start time.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        venue_id: venue.id,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        total_amount: totalAmount,
      };

      const response = await api.post('/bookings', payload);
      const newBooking = response.data?.data?.booking;

      if (newBooking) {
        navigate(`/bookings/${newBooking.id}/summary`);
      }
    } catch (err) {
      console.error('Booking creation error:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to reserve slot. It may already be booked.';
      setBookingError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-6">
        <div className="h-8 bg-surface-container-high rounded w-1/3" />
        <div className="h-96 bg-surface-container-high rounded-2xl" />
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="max-w-lg mx-auto my-20 p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card">
        <span className="material-symbols-outlined text-error text-5xl mb-3">error</span>
        <h2 className="text-xl font-bold font-headline mb-2">Venue Unavailable</h2>
        <p className="text-sm text-on-surface-variant mb-6">{error || 'Could not find this venue.'}</p>
        <Link to="/venues" className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold">
          Back to Browse Venues
        </Link>
      </div>
    );
  }

  const images = venue.venue_images && venue.venue_images.length > 0
    ? venue.venue_images
    : [{ id: 'default', image_url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80' }];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Title & Location Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {venue.is_verified && <StatusBadge type="verification" status="verified" />}
          {venue.type && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container capitalize">
              {venue.type}
            </span>
          )}
        </div>
        <h1 className="font-headline font-extrabold text-2xl sm:text-4xl text-on-surface">
          {venue.title || venue.name}
        </h1>
        <p className="text-sm text-on-surface-variant flex items-center gap-1.5 mt-2">
          <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
          {[venue.address, venue.city, venue.state, venue.zip_code].filter(Boolean).join(', ')}
        </p>
      </div>

      {/* Image Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
        <div className="lg:col-span-2 aspect-[16/10] rounded-2xl overflow-hidden bg-surface-container-high shadow-card border border-outline-variant/20">
          <img
            src={images[selectedImage]?.image_url}
            alt={venue.title}
            className="w-full h-full object-cover transition-all duration-300"
          />
        </div>
        <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto max-h-[460px]">
          {images.map((img, idx) => (
            <button
              key={img.id || idx}
              onClick={() => setSelectedImage(idx)}
              className={`relative rounded-xl overflow-hidden aspect-[16/10] shrink-0 lg:shrink cursor-pointer border-2 transition ${
                selectedImage === idx ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-75 hover:opacity-100'
              }`}
            >
              <img src={img.image_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Main Content & Reservation Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Left Venue Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Key Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-5 bg-surface-container-low rounded-2xl border border-outline-variant/20">
            <div>
              <span className="text-xs text-on-surface-variant font-medium block">Guest Capacity</span>
              <span className="font-headline font-bold text-base text-on-surface flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[18px] text-primary">groups</span>
                Up to {venue.capacity || 'N/A'} Guests
              </span>
            </div>
            <div>
              <span className="text-xs text-on-surface-variant font-medium block">Pricing Model</span>
              <span className="font-headline font-bold text-base text-on-surface capitalize mt-0.5 block">
                {venue.pricing_type || 'Hourly'}
              </span>
            </div>
            <div>
              <span className="text-xs text-on-surface-variant font-medium block">Verification</span>
              <span className="font-headline font-bold text-base text-tertiary flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                {venue.is_verified ? 'Verified Host' : 'Pending Review'}
              </span>
            </div>
          </div>

          {/* Description */}
          {venue.description && (
            <div className="space-y-3">
              <h2 className="font-headline font-bold text-xl text-on-surface">About this Venue</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                {venue.description}
              </p>
            </div>
          )}

          {/* Amenities */}
          {venue.amenities && venue.amenities.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-headline font-bold text-xl text-on-surface">Amenities & Facilities</h2>
              <div className="flex flex-wrap gap-2">
                {venue.amenities.map((amenity, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface-container-lowest border border-outline-variant/30 text-on-surface shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Event Types Supported */}
          {venue.venue_event_types && venue.venue_event_types.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-headline font-bold text-xl text-on-surface">Ideal For Occasions</h2>
              <div className="flex flex-wrap gap-2">
                {venue.venue_event_types.map((et) => (
                  <span
                    key={et.id}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container capitalize"
                  >
                    {et.event_type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Venue Rules */}
          {venue.rules && (
            <div className="space-y-3">
              <h2 className="font-headline font-bold text-xl text-on-surface">House Rules</h2>
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 text-xs text-on-surface-variant leading-relaxed whitespace-pre-line">
                {venue.rules}
              </div>
            </div>
          )}
        </div>

        {/* Right Sticky Booking Box */}
        <div className="sticky top-28 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-card space-y-5">
          <div className="flex items-baseline justify-between border-b border-outline-variant/20 pb-4">
            <div>
              <span className="font-headline font-extrabold text-2xl text-primary-container">
                ₹{Number(venue.price_per_hour || venue.price_per_day || venue.flat_price || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-on-surface-variant ml-1 font-medium">
                / {venue.pricing_type === 'hourly' ? 'hour' : venue.pricing_type === 'daily' ? 'day' : 'event'}
              </span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-tertiary-container/15 text-tertiary">
              Instant Hold
            </span>
          </div>

          {bookingError && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-xs text-error flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              <span>{bookingError}</span>
            </div>
          )}

          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Celebration Date
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Total Summary */}
            <div className="pt-3 border-t border-outline-variant/20 flex justify-between items-center text-sm">
              <span className="font-semibold text-on-surface">Estimated Total:</span>
              <span className="font-headline font-bold text-xl text-on-surface">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || isOwner}
              className="w-full py-3.5 px-4 rounded-xl bg-primary-container text-white font-bold text-sm hover:bg-primary transition shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Reserving Slot...</span>
                </>
              ) : isOwner ? (
                <span>Your Own Venue</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">lock_clock</span>
                  <span>Reserve & Pay</span>
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-center text-on-surface-variant leading-relaxed">
            Reserving locks the slot with a <strong>10-minute hold window</strong> to complete Razorpay payment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VenueDetailPage;
