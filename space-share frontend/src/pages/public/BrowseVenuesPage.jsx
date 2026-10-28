import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import VenueCard from '../../components/venues/VenueCard';
import FilterSidebar from '../../components/venues/FilterSidebar';
import { VenueCardSkeleton } from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';

const BrowseVenuesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [venues, setVenues] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Parse filters from URL
  const filters = {
    search: searchParams.get('search') || '',
    city: searchParams.get('city') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    min_capacity: searchParams.get('min_capacity') || '',
    max_capacity: searchParams.get('max_capacity') || '',
    page: Number(searchParams.get('page')) || 1,
    limit: 12,
  };

  const updateFilters = (newFilters) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.set(key, val);
      }
    });
    setSearchParams(params);
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (filters.city) query.append('city', filters.city);
        if (filters.search) query.append('search', filters.search);
        if (filters.min_price) query.append('min_price', filters.min_price);
        if (filters.max_price) query.append('max_price', filters.max_price);
        if (filters.min_capacity) query.append('min_capacity', filters.min_capacity);
        if (filters.max_capacity) query.append('max_capacity', filters.max_capacity);
        query.append('page', filters.page);
        query.append('limit', filters.limit);

        const response = await api.get(`/venues?${query.toString()}`);
        if (response.data?.data) {
          setVenues(response.data.data.venues || []);
          setTotal(response.data.data.total || 0);
        }
      } catch (err) {
        console.error('Failed to fetch venues:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [searchParams]);

  const totalPages = Math.ceil(total / filters.limit) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline font-bold text-2xl sm:text-3xl text-on-surface">
            Explore Celebration Venues
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Browse verified private lawns, open terraces, farmhouses, and banquet spaces
          </p>
        </div>

        {/* Mobile filter toggle button */}
        <button
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high text-on-surface font-semibold text-xs"
        >
          <span className="material-symbols-outlined text-[18px]">tune</span>
          Filters {Object.values(filters).filter(Boolean).length > 2 && '• Active'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Desktop Filter Sidebar */}
        <div className="hidden lg:block shrink-0">
          <FilterSidebar
            filters={filters}
            onFilterChange={updateFilters}
            onReset={handleResetFilters}
          />
        </div>

        {/* Mobile Drawer Filter */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 lg:hidden flex justify-end">
            <div className="w-full max-w-xs bg-surface-container-lowest h-full overflow-y-auto p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-base">Filters</h3>
                  <button
                    onClick={() => setMobileFilterOpen(false)}
                    className="p-1 rounded-full hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <FilterSidebar
                  filters={filters}
                  onFilterChange={(f) => {
                    updateFilters(f);
                    setMobileFilterOpen(false);
                  }}
                  onReset={() => {
                    handleResetFilters();
                    setMobileFilterOpen(false);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Venues Results Section */}
        <div className="flex-grow w-full">
          {/* Results Summary Bar */}
          <div className="flex items-center justify-between mb-4 text-xs text-on-surface-variant font-medium">
            <span>
              Showing {venues.length} of {total} verified venues
            </span>
            {filters.city && (
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                City: {filters.city}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <VenueCardSkeleton key={i} />
              ))}
            </div>
          ) : venues.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {venues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <button
                    disabled={filters.page <= 1}
                    onClick={() => updateFilters({ ...filters, page: filters.page - 1 })}
                    className="p-2 rounded-xl border border-outline-variant/30 text-on-surface disabled:opacity-30 hover:bg-surface-container transition"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <span className="text-xs font-semibold px-4 py-2 rounded-xl bg-surface-container-low">
                    Page {filters.page} of {totalPages}
                  </span>
                  <button
                    disabled={filters.page >= totalPages}
                    onClick={() => updateFilters({ ...filters, page: filters.page + 1 })}
                    className="p-2 rounded-xl border border-outline-variant/30 text-on-surface disabled:opacity-30 hover:bg-surface-container transition"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon="search_off"
              title="No venues match your criteria"
              description="Try broadening your city selection, price range, or guest capacity."
              actionLabel="Clear Filters"
              onAction={handleResetFilters}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowseVenuesPage;
