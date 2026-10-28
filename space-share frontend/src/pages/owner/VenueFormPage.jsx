import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const VENUE_TYPES = [
  'lawn',
  'terrace',
  'hall',
  'rooftop',
  'farmhouse',
  'banquet',
  'garden',
  'pool_area',
  'other',
];

const EVENT_TYPES = [
  'wedding',
  'birthday',
  'corporate',
  'party',
  'reception',
  'conference',
  'exhibition',
  'photoshoot',
  'other',
];

const COMMON_AMENITIES = [
  'Power Backup / Generator',
  'Air Conditioning',
  'DJ Sound System',
  'Parking Bays',
  'Outside Catering Allowed',
  'Lawn Decorative Lighting',
  'Private Changing Rooms',
  'Clean Restrooms',
  'Swimming Pool Access',
  'Kitchen / Prep Area',
];

const VenueFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdVenueId, setCreatedVenueId] = useState(id || null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    type: 'lawn',
    description: '',
    capacity: 100,
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    zip_code: '',
    pricing_type: 'hourly',
    price_per_hour: 2500,
    price_per_day: '',
    flat_price: '',
    rules: '',
    amenities: [],
  });

  // Images state for Step 4
  const [images, setImages] = useState([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState(['party', 'birthday']);
  const [uploadingImage, setUploadingImage] = useState(false);

  // If edit mode, fetch venue
  useEffect(() => {
    if (!isEditMode) return;

    const fetchVenue = async () => {
      try {
        const response = await api.get(`/venues/${id}`);
        const v = response.data?.data?.venue || response.data?.data;
        if (v) {
          setFormData({
            title: v.title || v.name || '',
            type: v.type || 'lawn',
            description: v.description || '',
            capacity: v.capacity || 100,
            address: v.address || '',
            city: v.city || '',
            state: v.state || '',
            zip_code: v.zip_code || '',
            pricing_type: v.pricing_type || 'hourly',
            price_per_hour: v.price_per_hour || '',
            price_per_day: v.price_per_day || '',
            flat_price: v.flat_price || '',
            rules: v.rules || '',
            amenities: v.amenities || [],
          });
          setImages(v.venue_images || []);
          if (v.venue_event_types) {
            setSelectedEventTypes(v.venue_event_types.map((et) => et.event_type));
          }
        }
      } catch (err) {
        console.error('Failed to load venue for editing:', err);
        setError('Failed to load venue details');
      } finally {
        setLoading(false);
      }
    };

    fetchVenue();
  }, [id, isEditMode]);

  const toggleAmenity = (amenity) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  const toggleEventType = async (eventType) => {
    const venueIdToUse = createdVenueId || id;
    const exists = selectedEventTypes.includes(eventType);

    if (exists) {
      setSelectedEventTypes((prev) => prev.filter((et) => et !== eventType));
    } else {
      setSelectedEventTypes((prev) => [...prev, eventType]);
      if (venueIdToUse) {
        try {
          await api.post(`/venues/${venueIdToUse}/event-types`, { event_type: eventType });
        } catch (e) {
          console.warn('Failed to save event type immediately:', e);
        }
      }
    }
  };

  // Upload image to venue
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const venueIdToUse = createdVenueId || id;
    if (!venueIdToUse) {
      alert('Please complete the basic details first to upload photos.');
      return;
    }

    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append('image', file);

      const res = await api.post(`/venues/${venueIdToUse}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newImg = res.data?.data?.image;
      if (newImg) {
        setImages((prev) => [...prev, newImg]);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      alert(err.response?.data?.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    const venueIdToUse = createdVenueId || id;
    try {
      await api.delete(`/venues/${venueIdToUse}/images/${imageId}`);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      console.error('Failed to delete image:', err);
      alert('Failed to delete image.');
    }
  };

  // Save venue details (Steps 1 to 3)
  const handleSaveVenue = async (nextStep = null) => {
    setError('');
    setSaving(true);

    try {
      const payload = {
        title: formData.title,
        name: formData.title,
        type: formData.type,
        description: formData.description,
        capacity: Number(formData.capacity) || 50,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        pricing_type: formData.pricing_type,
        price_per_hour: formData.price_per_hour ? Number(formData.price_per_hour) : null,
        price_per_day: formData.price_per_day ? Number(formData.price_per_day) : null,
        flat_price: formData.flat_price ? Number(formData.flat_price) : null,
        rules: formData.rules,
        amenities: formData.amenities,
      };

      if (isEditMode || createdVenueId) {
        const venueIdToUse = createdVenueId || id;
        await api.put(`/venues/${venueIdToUse}`, payload);
      } else {
        const res = await api.post('/venues', payload);
        const newVenue = res.data?.data?.venue;
        if (newVenue) {
          setCreatedVenueId(newVenue.id);
        }
      }

      if (nextStep) {
        setCurrentStep(nextStep);
      } else {
        navigate('/owner/dashboard');
      }
    } catch (err) {
      console.error('Save venue error:', err);
      setError(err.response?.data?.message || 'Failed to save venue details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="h-8 bg-surface-container-high rounded w-1/4" />
        <div className="h-96 bg-surface-container-high rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Title */}
      <div className="mb-8">
        <h1 className="font-headline font-bold text-2xl sm:text-3xl text-on-surface">
          {isEditMode ? 'Edit Celebration Venue' : 'List a New Celebration Space'}
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
          Follow our 4-step wizard to setup your property specs, pricing, and high-res photography
        </p>
      </div>

      {/* Wizard Step Navigation Indicator */}
      <div className="grid grid-cols-4 gap-2 mb-8">
        {[
          { step: 1, label: 'Space Details', icon: 'info' },
          { step: 2, label: 'Location', icon: 'location_on' },
          { step: 3, label: 'Pricing & Rules', icon: 'currency_rupee' },
          { step: 4, label: 'Photos & Occasions', icon: 'photo_library' },
        ].map((item) => (
          <button
            key={item.step}
            onClick={() => {
              if (item.step <= currentStep || isEditMode || createdVenueId) {
                setCurrentStep(item.step);
              }
            }}
            className={`p-3 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
              currentStep === item.step
                ? 'bg-primary/10 border-primary text-primary'
                : item.step < currentStep
                ? 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                : 'bg-surface-container-low/50 border-outline-variant/20 text-on-surface-variant opacity-60'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <div className="hidden sm:block">
              <span className="text-[10px] font-bold uppercase tracking-wider block">Step {item.step}</span>
              <span className="text-xs font-semibold truncate">{item.label}</span>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Step Content Box */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/30 shadow-card">
        {/* STEP 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="font-headline font-bold text-lg text-on-surface border-b border-outline-variant/20 pb-3">
              Step 1: Venue Specifications
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Venue Title / Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Green Paradise Party Lawn & Terrace"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Property Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 capitalize cursor-pointer"
                >
                  {VENUE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Max Guest Capacity *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="e.g. 200"
                  className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Description & Highlights
              </label>
              <textarea
                rows={4}
                placeholder="Describe your celebration space, setting, ambiance, and unique features..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  if (!formData.title) {
                    setError('Venue title is required.');
                    return;
                  }
                  setCurrentStep(2);
                }}
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-container transition flex items-center gap-1 cursor-pointer"
              >
                <span>Next: Location</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Location */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="font-headline font-bold text-lg text-on-surface border-b border-outline-variant/20 pb-3">
              Step 2: Location Details
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Street Address *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sy No. 44, Sarjapur Main Road"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bengaluru"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  placeholder="e.g. Karnataka"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  PIN Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 560035"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface font-semibold text-xs"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!formData.address || !formData.city) {
                    setError('Address and city are required.');
                    return;
                  }
                  setCurrentStep(3);
                }}
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-container transition flex items-center gap-1 cursor-pointer"
              >
                <span>Next: Pricing & Rules</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Pricing & Rules */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="font-headline font-bold text-lg text-on-surface border-b border-outline-variant/20 pb-3">
              Step 3: Pricing & Amenities
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Pricing Model *
                </label>
                <select
                  value={formData.pricing_type}
                  onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer capitalize"
                >
                  <option value="hourly">Hourly (₹ / hour)</option>
                  <option value="daily">Daily (₹ / day)</option>
                  <option value="flat">Flat Rate (₹ / event)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Rate Amount (₹) *
                </label>
                {formData.pricing_type === 'hourly' && (
                  <input
                    type="number"
                    required
                    value={formData.price_per_hour}
                    onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })}
                    placeholder="e.g. 2500"
                    className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                )}
                {formData.pricing_type === 'daily' && (
                  <input
                    type="number"
                    required
                    value={formData.price_per_day}
                    onChange={(e) => setFormData({ ...formData, price_per_day: e.target.value })}
                    placeholder="e.g. 35000"
                    className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                )}
                {formData.pricing_type === 'flat' && (
                  <input
                    type="number"
                    required
                    value={formData.flat_price}
                    onChange={(e) => setFormData({ ...formData, flat_price: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                )}
              </div>
            </div>

            {/* Amenities Checklist */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                Available Amenities
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {COMMON_AMENITIES.map((amenity) => {
                  const checked = formData.amenities.includes(amenity);
                  return (
                    <label
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition select-none ${
                        checked
                          ? 'bg-primary/5 border-primary text-primary'
                          : 'bg-surface-container-low border-outline-variant/20 text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {checked ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      <span>{amenity}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Rules */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                House Rules & Timings
              </label>
              <textarea
                rows={3}
                placeholder="e.g. DJ permitted till 10 PM. Outside caterers welcome. Cleanliness deposit required."
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface font-semibold text-xs"
              >
                Back
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveVenue(4)}
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-container transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Save & Proceed to Photos</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Photos & Supported Occasions */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="font-headline font-bold text-lg text-on-surface border-b border-outline-variant/20 pb-3">
              Step 4: Photography & Supported Occasions
            </h2>

            {/* Supported Event Types */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                Supported Occasions
              </label>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((et) => {
                  const active = selectedEventTypes.includes(et);
                  return (
                    <button
                      type="button"
                      key={et}
                      onClick={() => toggleEventType(et)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition border cursor-pointer ${
                        active
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:border-primary'
                      }`}
                    >
                      {et}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Photo Upload Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Property Photos ({images.length})
                </label>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-container transition cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                  <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
              </div>

              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-surface-container-high border border-outline-variant/20 shadow-xs"
                    >
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 text-white hover:bg-error transition"
                        title="Delete photo"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-surface-container-low rounded-2xl border-2 border-dashed border-outline-variant/40">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-1">
                    photo_library
                  </span>
                  <p className="text-xs text-on-surface-variant font-medium">
                    No photos uploaded yet. High-quality lawn and terrace photos increase bookings by 3x.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-6 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface font-semibold text-xs"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => navigate('/owner/dashboard')}
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-container transition shadow-sm cursor-pointer"
              >
                Finish & Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueFormPage;
