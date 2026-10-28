import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';

const VenueCard = ({ venue }) => {
  if (!venue) return null;

  // Determine cover image
  const coverImage =
    venue.venue_images?.find((img) => img.is_cover)?.image_url ||
    venue.venue_images?.[0]?.image_url ||
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80';

  // Format pricing string
  const formatPrice = () => {
    if (venue.pricing_type === 'hourly' && venue.price_per_hour) {
      return {
        amount: `₹${Number(venue.price_per_hour).toLocaleString('en-IN')}`,
        unit: 'per hour',
      };
    }
    if (venue.pricing_type === 'daily' && venue.price_per_day) {
      return {
        amount: `₹${Number(venue.price_per_day).toLocaleString('en-IN')}`,
        unit: 'per day',
      };
    }
    if (venue.flat_price) {
      return {
        amount: `₹${Number(venue.flat_price).toLocaleString('en-IN')}`,
        unit: 'flat rate',
      };
    }
    if (venue.price_per_hour) {
      return {
        amount: `₹${Number(venue.price_per_hour).toLocaleString('en-IN')}`,
        unit: 'per hour',
      };
    }
    return { amount: 'Price on request', unit: '' };
  };

  const pricing = formatPrice();

  return (
    <Link
      to={`/venues/${venue.id}`}
      className="group bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/30 shadow-card hover:shadow-floating transition-all duration-300 flex flex-col"
    >
      {/* Venue Photo */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-container-high">
        <img
          src={coverImage}
          alt={venue.title || venue.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
          onError={(e) => {
            e.target.src =
              'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80';
          }}
        />
        {/* Verification Status Tag */}
        {venue.is_verified && (
          <div className="absolute top-3 left-3">
            <StatusBadge type="verification" status="verified" />
          </div>
        )}

        {/* Venue Type Tag */}
        {venue.type && (
          <div className="absolute top-3 right-3 bg-surface-container-lowest/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-on-surface capitalize shadow-sm">
            {venue.type}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow justify-between gap-3">
        <div>
          {/* Location */}
          <div className="flex items-center gap-1 text-xs font-medium text-on-surface-variant mb-1">
            <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
            <span className="truncate">
              {[venue.address, venue.city].filter(Boolean).join(', ') || 'India'}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-headline font-bold text-lg text-on-surface group-hover:text-primary transition-colors line-clamp-1">
            {venue.title || venue.name}
          </h3>

          {/* Capacity Spec */}
          {venue.capacity && (
            <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-1.5">
              <span className="material-symbols-outlined text-[15px]">groups</span>
              <span>Up to {venue.capacity} guests</span>
            </div>
          )}
        </div>

        {/* Pricing Line */}
        <div className="pt-3 border-t border-outline-variant/20 flex items-baseline justify-between mt-auto">
          <div>
            <span className="font-headline font-extrabold text-xl text-primary-container">
              {pricing.amount}
            </span>
            {pricing.unit && (
              <span className="text-xs text-on-surface-variant ml-1 font-medium">
                / {pricing.unit}
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
            View Details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </span>
        </div>
      </div>
    </Link>
  );
};

export default VenueCard;
