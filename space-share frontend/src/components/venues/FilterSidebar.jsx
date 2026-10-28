import React from 'react';

const CITIES = ['Bengaluru', 'Delhi', 'Mumbai', 'Jaipur', 'Hyderabad', 'Pune'];

const FilterSidebar = ({ filters, onFilterChange, onReset }) => {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value, page: 1 });
  };

  return (
    <aside className="w-full lg:w-72 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-card h-fit space-y-6">
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
          <h2 className="font-headline font-bold text-lg text-on-surface">Filters</h2>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          Reset All
        </button>
      </div>

      {/* Search keyword */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
          Search
        </label>
        <div className="relative">
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Search venue name, area..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-on-surface-variant text-[18px]">
            search
          </span>
        </div>
      </div>

      {/* City */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
          City
        </label>
        <select
          value={filters.city || ''}
          onChange={(e) => handleChange('city', e.target.value)}
          className="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        >
          <option value="">All Cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Price per hour */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
          Price Range (₹ / hr)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[11px] text-on-surface-variant">Min ₹</span>
            <input
              type="number"
              placeholder="0"
              value={filters.min_price || ''}
              onChange={(e) => handleChange('min_price', e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <span className="text-[11px] text-on-surface-variant">Max ₹</span>
            <input
              type="number"
              placeholder="50,000"
              value={filters.max_price || ''}
              onChange={(e) => handleChange('max_price', e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Guest Capacity */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
          Guest Capacity
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[11px] text-on-surface-variant">Min Guests</span>
            <input
              type="number"
              placeholder="10"
              value={filters.min_capacity || ''}
              onChange={(e) => handleChange('min_capacity', e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <span className="text-[11px] text-on-surface-variant">Max Guests</span>
            <input
              type="number"
              placeholder="1000"
              value={filters.max_capacity || ''}
              onChange={(e) => handleChange('max_capacity', e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
