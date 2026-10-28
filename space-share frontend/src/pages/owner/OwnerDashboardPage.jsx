import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';

const OwnerDashboardPage = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMyVenues = async () => {
    setLoading(true);
    try {
      const response = await api.get('/venues/my-venues');
      setVenues(response.data?.data?.venues || []);
    } catch (err) {
      console.error('Failed to load my venues:', err);
      setError('Could not retrieve your venues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyVenues();
  }, []);

  const handleDelete = async (venueId) => {
    if (!window.confirm('Are you sure you want to delete this venue? All images and details will be removed.')) {
      return;
    }

    try {
      await api.delete(`/venues/${venueId}`);
      await fetchMyVenues();
    } catch (err) {
      console.error('Delete venue error:', err);
      alert(err.response?.data?.message || 'Failed to delete venue.');
    }
  };

  const verifiedCount = venues.filter((v) => v.is_verified).length;
  const pendingCount = venues.length - verifiedCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline font-bold text-2xl sm:text-3xl text-on-surface">
            Host Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Manage your listed celebration properties, document verifications, and pricing
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/owner/bookings"
            className="px-4 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface font-semibold text-xs hover:bg-surface-container transition flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            Bookings Received
          </Link>
          <Link
            to="/owner/venues/new"
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-container transition shadow-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Add New Space
          </Link>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">storefront</span>
          </div>
          <div>
            <span className="text-xs text-on-surface-variant font-medium block">Total Properties</span>
            <span className="font-headline font-extrabold text-2xl text-on-surface">{venues.length}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-tertiary-container/15 text-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">verified</span>
          </div>
          <div>
            <span className="text-xs text-on-surface-variant font-medium block">Verified & Live</span>
            <span className="font-headline font-extrabold text-2xl text-tertiary">{verifiedCount}</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">hourglass_top</span>
          </div>
          <div>
            <span className="text-xs text-on-surface-variant font-medium block">Pending Verification</span>
            <span className="font-headline font-extrabold text-2xl text-amber-700">{pendingCount}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs mb-6">
          {error}
        </div>
      )}

      {/* Venues Table / Grid */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-surface-container-high rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : venues.length > 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low border-b border-outline-variant/20 uppercase tracking-wider text-on-surface-variant font-semibold">
                <tr>
                  <th className="py-4 px-6">Venue Space</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Pricing</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-medium">
                {venues.map((venue) => {
                  const coverImage =
                    venue.venue_images?.find((img) => img.is_cover)?.image_url ||
                    venue.venue_images?.[0]?.image_url ||
                    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=200&q=80';

                  return (
                    <tr key={venue.id} className="hover:bg-surface-container-low/50 transition">
                      {/* Venue Space Name & Thumb */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={coverImage}
                            alt=""
                            className="w-14 h-12 object-cover rounded-xl bg-surface-container-high shrink-0"
                          />
                          <div>
                            <span className="font-headline font-bold text-sm text-on-surface block">
                              {venue.title || venue.name}
                            </span>
                            <span className="text-[11px] text-on-surface-variant capitalize">
                              {venue.type} • {venue.capacity} guests max
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-4 px-6 text-on-surface-variant">
                        {venue.city || 'N/A'}, {venue.state || ''}
                      </td>

                      {/* Pricing */}
                      <td className="py-4 px-6 text-on-surface font-semibold">
                        ₹{Number(venue.price_per_hour || venue.price_per_day || venue.flat_price || 0).toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] text-on-surface-variant font-normal">
                          / {venue.pricing_type}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <StatusBadge
                          type="verification"
                          status={venue.is_verified ? 'verified' : 'pending'}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right space-x-2">
                        {!venue.is_verified && (
                          <Link
                            to={`/owner/venues/${venue.id}/verify`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 transition font-semibold text-[11px]"
                          >
                            <span className="material-symbols-outlined text-[14px]">upload_file</span>
                            Verify Documents
                          </Link>
                        )}

                        <Link
                          to={`/owner/venues/${venue.id}/edit`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-secondary-container transition font-semibold text-[11px]"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          Edit
                        </Link>

                        <button
                          onClick={() => handleDelete(venue.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-error hover:bg-error/10 transition font-semibold text-[11px]"
                          title="Delete venue"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon="add_business"
          title="No venues listed yet"
          description="Start earning by listing your lawn, terrace, banquet, or farmhouse on SpaceShare."
          actionLabel="Add Your First Space"
          actionLink="/owner/venues/new"
        />
      )}
    </div>
  );
};

export default OwnerDashboardPage;
