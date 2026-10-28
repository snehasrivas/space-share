import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import VenueCard from '../../components/venues/VenueCard';
import { VenueCardSkeleton } from '../../components/common/LoadingSkeleton';

const OCCASIONS = [
  { id: 'wedding', label: 'Weddings & Receptions', icon: 'favorite', bg: 'bg-amber-500/10 text-amber-700' },
  { id: 'birthday', label: 'Birthdays & Private Parties', icon: 'cake', bg: 'bg-primary/10 text-primary' },
  { id: 'corporate', label: 'Corporate & Mixers', icon: 'business_center', bg: 'bg-blue-500/10 text-blue-700' },
  { id: 'photoshoot', label: 'Photoshoots & Creative', icon: 'photo_camera', bg: 'bg-purple-500/10 text-purple-700' },
];

const VENUE_TYPES = [
  { id: 'lawn', label: 'Private Lawns', icon: 'park', img: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=400&q=80' },
  { id: 'terrace', label: 'Open-Air Terraces', icon: 'deck', img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=400&q=80' },
  { id: 'farmhouse', label: 'Farmhouses', icon: 'cottage', img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&q=80' },
  { id: 'rooftop', label: 'Rooftops', icon: 'roofing', img: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=400&q=80' },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [featuredVenues, setFeaturedVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useState({
    city: '',
    search: '',
  });

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await api.get('/venues?limit=6');
        setFeaturedVenues(response.data?.data?.venues || []);
      } catch (err) {
        console.error('Failed to load featured venues:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (searchParams.city) query.append('city', searchParams.city);
    if (searchParams.search) query.append('search', searchParams.search);
    navigate(`/venues?${query.toString()}`);
  };

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden pt-12 pb-20 md:pb-28 bg-surface-container-low border-b border-outline-variant/30">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-container/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-20" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-tertiary-container/10 rounded-full blur-3xl pointer-events-none -ml-24" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container shadow-sm text-xs font-bold">
              <span className="material-symbols-outlined text-[18px] text-primary">celebration</span>
              <span>India's Premier Celebration Spaces</span>
            </div>

            <h1 className="font-headline text-3xl sm:text-5xl font-extrabold text-on-surface tracking-tight leading-tight">
              Find the Perfect Space to Celebrate Life's Special Moments
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Rent verified private lawns, open-air terraces, boutique banquet halls, and sprawling farmhouses across India for birthdays, sangeets, and celebrations.
            </p>

            {/* Interactive Search Card */}
            <div className="w-full mt-6 bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-card border border-outline-variant/30 text-left">
              <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Field 1: City */}
                <div className="flex flex-col bg-surface-container-low rounded-xl p-3 hover:bg-surface-container transition">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-primary">location_on</span>
                    City
                  </label>
                  <select
                    value={searchParams.city}
                    onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
                    className="bg-transparent font-semibold text-sm text-on-surface focus:outline-none cursor-pointer py-1"
                  >
                    <option value="">All Indian Cities</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Delhi">Delhi NCR</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Jaipur">Jaipur</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Pune">Pune</option>
                  </select>
                </div>

                {/* Field 2: Search keyword */}
                <div className="flex flex-col bg-surface-container-low rounded-xl p-3 hover:bg-surface-container transition">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-primary">search</span>
                    Venue or Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Indiranagar, Farmhouse..."
                    value={searchParams.search}
                    onChange={(e) => setSearchParams({ ...searchParams, search: e.target.value })}
                    className="bg-transparent font-semibold text-sm text-on-surface focus:outline-none py-1 placeholder:text-on-surface-variant/50"
                  />
                </div>

                {/* Submit button */}
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-container transition shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">search</span>
                    <span>Explore Venues</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-xs font-medium text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5 text-tertiary">
                <span className="material-symbols-outlined text-[16px]">verified</span> 100% In-Person Verified
              </span>
              <span className="inline-flex items-center gap-1.5 text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-primary">currency_rupee</span> Direct Host ₹ Pricing
              </span>
              <span className="inline-flex items-center gap-1.5 text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span> Zero Surprise Fees
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Venues Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1 text-primary text-xs font-bold uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
              Handpicked Celebrations
            </div>
            <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">
              Featured Verified Spaces
            </h2>
          </div>
          <Link
            to="/venues"
            className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-container transition"
          >
            <span>Browse All Venues</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>

        {/* Venues Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <VenueCardSkeleton key={i} />
            ))}
          </div>
        ) : featuredVenues.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">storefront</span>
            <h3 className="font-headline font-bold text-lg text-on-surface">No Verified Venues Listed Yet</h3>
            <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
              Be the first to list a verified party lawn, terrace, or farmhouse on SpaceShare.
            </p>
            <Link
              to="/signup?role=owner"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-container transition"
            >
              List Your Venue
            </Link>
          </div>
        )}
      </section>

      {/* Popular Categories */}
      <section className="py-12 bg-surface-container-low border-y border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-headline text-xl sm:text-2xl font-bold text-on-surface text-center mb-8">
            Browse by Space Type
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {VENUE_TYPES.map((type) => (
              <Link
                key={type.id}
                to={`/venues?search=${type.id}`}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-card hover:shadow-floating transition"
              >
                <img
                  src={type.img}
                  alt={type.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    <span className="material-symbols-outlined text-[18px]">{type.icon}</span>
                    <span>{type.label}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface mb-2">
            How SpaceShare Works
          </h2>
          <p className="text-sm text-on-surface-variant">
            Seamlessly plan your next milestone event with complete verification and secure payments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-card">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 font-bold text-lg">
              1
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface mb-2">
              Discover & Filter
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Explore 100% verified private lawns, open terraces, and farmhouses filtered by city, guest capacity, and pricing.
            </p>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-card">
            <div className="w-12 h-12 rounded-xl bg-primary-container/20 text-primary-container flex items-center justify-center mx-auto mb-4 font-bold text-lg">
              2
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface mb-2">
              Reserve with 10-Min Hold
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Lock in your preferred date and time slot instantly with database-enforced conflict prevention and 10-minute hold.
            </p>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-card">
            <div className="w-12 h-12 rounded-xl bg-tertiary-container/20 text-tertiary flex items-center justify-center mx-auto mb-4 font-bold text-lg">
              3
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface mb-2">
              Pay Securely & Celebrate
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Checkout safely via Razorpay UPI, Cards, or Netbanking. Receive instant booking confirmation and host contact details.
            </p>
          </div>
        </div>
      </section>

      {/* Host CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-on-surface to-secondary p-8 sm:p-12 text-white shadow-modal flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-sm">
              <span className="material-symbols-outlined text-[16px] text-primary-container">store</span>
              Become a Verified Host
            </div>
            <h2 className="font-headline text-2xl sm:text-4xl font-extrabold tracking-tight">
              Have an Empty Lawn, Terrace, or Banquet Hall?
            </h2>
            <p className="text-sm text-white/80 leading-relaxed">
              Monetize your unused space by hosting family birthdays, intimate weddings, and social gatherings. Get direct ₹ payouts and verified guests.
            </p>
          </div>
          <Link
            to="/signup?role=owner"
            className="shrink-0 px-8 py-3.5 rounded-xl bg-primary-container text-white font-bold text-sm hover:bg-primary transition shadow-lg cursor-pointer"
          >
            List Your Space for Free
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
