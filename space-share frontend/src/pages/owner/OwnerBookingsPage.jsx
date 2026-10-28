import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import BookingCard from '../../components/bookings/BookingCard';
import EmptyState from '../../components/common/EmptyState';

const OwnerBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const fetchVenueBookings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/bookings/venue-bookings');
      setBookings(response.data?.data?.bookings || []);
    } catch (err) {
      console.error('Failed to load venue bookings:', err);
      setError('Could not retrieve bookings for your venues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenueBookings();
  }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? The slot will be freed up.')) {
      return;
    }

    try {
      await api.post(`/bookings/${bookingId}/cancel`);
      await fetchVenueBookings();
    } catch (err) {
      console.error('Cancel booking error:', err);
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'confirmed') return b.status === 'confirmed';
    if (activeTab === 'pending') return b.status === 'pending';
    if (activeTab === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline font-bold text-2xl sm:text-3xl text-on-surface">
            Bookings Received
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Reservations and attendee details across all your listed celebration venues
          </p>
        </div>
        <Link
          to="/owner/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant/40 text-on-surface text-xs font-semibold hover:bg-surface-container transition"
        >
          <span className="material-symbols-outlined text-[16px]">store</span>
          My Venues
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30 gap-6 mb-8 overflow-x-auto text-xs font-semibold">
        {['all', 'confirmed', 'pending', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 capitalize transition-colors relative cursor-pointer ${
              activeTab === tab
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab === 'all' ? `All Reservations (${bookings.length})` : tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-surface-container-high rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onCancel={handleCancel}
              isOwnerView={true}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="event_busy"
          title="No reservations received yet"
          description={
            activeTab === 'all'
              ? 'When guests book your lawns and terraces, their reservations and contact information will appear here.'
              : `No ${activeTab} reservations found.`
          }
        />
      )}
    </div>
  );
};

export default OwnerBookingsPage;
