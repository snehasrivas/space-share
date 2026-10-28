import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import BookingCard from '../../components/bookings/BookingCard';
import EmptyState from '../../components/common/EmptyState';

const MyBookingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/bookings/my-bookings');
      setBookings(response.data?.data?.bookings || []);
    } catch (err) {
      console.error('Failed to load my bookings:', err);
      setError('Could not retrieve your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handlePayNow = (booking) => {
    navigate(`/bookings/${booking.id}/summary`);
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking reservation?')) {
      return;
    }

    try {
      await api.post(`/bookings/${bookingId}/cancel`);
      await fetchBookings();
    } catch (err) {
      console.error('Cancel booking error:', err);
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    }
  };

  // Filter tab logic
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'confirmed') return b.status === 'confirmed';
    if (activeTab === 'pending') return b.status === 'pending';
    if (activeTab === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-headline font-bold text-2xl sm:text-3xl text-on-surface">
          My Celebration Bookings
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
          Track reservation statuses, complete pending payments, or manage your bookings
        </p>
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
            {tab === 'all' ? 'All Bookings' : tab}
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
              onPayNow={handlePayNow}
              onCancel={handleCancel}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="event_busy"
          title="No bookings found"
          description={
            activeTab === 'all'
              ? 'You have not booked any venues yet. Explore top verified celebration spaces now!'
              : `You have no ${activeTab} bookings.`
          }
          actionLabel="Explore Venues"
          actionLink="/venues"
        />
      )}
    </div>
  );
};

export default MyBookingsPage;
