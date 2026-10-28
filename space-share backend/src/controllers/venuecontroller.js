const { supabaseAdmin } = require('../config/config');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * 1. Public list of venues: filtered to is_active AND is_verified
 */
const getPublicVenues = async (req, res, next) => {
  try {
    const {
      city,
      min_price,
      max_price,
      min_capacity,
      max_capacity,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('venues')
      .select('*, venue_images(*), venue_event_types(*)', { count: 'exact' })
      .eq('is_active', true)
      .eq('is_verified', true);

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    if (min_price) {
      query = query.gte('price_per_hour', Number(min_price));
    }

    if (max_price) {
      query = query.lte('price_per_hour', Number(max_price));
    }

    if (min_capacity) {
      query = query.gte('capacity', Number(min_capacity));
    }

    if (max_capacity) {
      query = query.lte('capacity', Number(max_capacity));
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%,address.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    const { data: venues, count, error } = await query;

    if (error) {
      return errorResponse(res, 'Failed to fetch venues', 500, error.message);
    }

    return successResponse(
      res,
      {
        venues: venues || [],
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
      },
      'Venues fetched successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Public venue detail by ID
 * Must be is_active AND is_verified unless caller is owner or admin
 */
const getVenueById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: venue, error } = await supabaseAdmin
      .from('venues')
      .select('*, venue_images(*), venue_event_types(*), venue_availability(*), profiles:owner_id(id, full_name, email, phone)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return errorResponse(res, 'Failed to fetch venue', 500, error.message);
    }

    if (!venue) {
      return errorResponse(res, 'Venue not found', 404);
    }

    // Check if requester is authorized to view an inactive or unverified venue
    const isOwner = req.user && req.user.id === venue.owner_id;
    const isAdmin = req.user && req.user.role === 'admin';

    if (!venue.is_active || !venue.is_verified) {
      if (!isOwner && !isAdmin) {
        return errorResponse(res, 'Venue is not available or pending verification', 404);
      }
    }

    return successResponse(res, { venue }, 'Venue retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Create venue
 * SECURITY: owner_id is set STRICTLY from req.user.id
 */
const createVenue = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const {
      name,
      title,
      description,
      address,
      city,
      state,
      country,
      zip_code,
      postal_code,
      capacity,
      price_per_hour,
      price_per_day,
      amenities,
      rules,
    } = req.body;

    const venueName = title || name;
    if (!venueName) {
      return errorResponse(res, 'Venue name or title is required', 400);
    }

    const newVenueData = {
      owner_id: ownerId,
      title: venueName,
      name: venueName,
      description: description || '',
      address: address || '',
      city: city || '',
      state: state || '',
      country: country || 'India',
      zip_code: zip_code || postal_code || '',
      capacity: capacity ? Number(capacity) : null,
      price_per_hour: price_per_hour ? Number(price_per_hour) : null,
      price_per_day: price_per_day ? Number(price_per_day) : null,
      amenities: amenities || [],
      rules: rules || '',
      is_active: true,
      is_verified: false, // New venues require admin verification
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: createdVenue, error } = await supabaseAdmin
      .from('venues')
      .insert(newVenueData)
      .select()
      .single();

    if (error) {
      return errorResponse(res, 'Failed to create venue', 500, error.message);
    }

    return successResponse(res, { venue: createdVenue }, 'Venue created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Get venues owned by current user
 */
const getMyVenues = async (req, res, next) => {
  try {
    const ownerId = req.user.id;

    const { data: venues, error } = await supabaseAdmin
      .from('venues')
      .select('*, venue_images(*), venue_event_types(*), venue_availability(*), venue_verifications(*)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      return errorResponse(res, 'Failed to fetch user venues', 500, error.message);
    }

    return successResponse(res, { venues: venues || [] }, 'My venues retrieved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 5. Update venue
 * SECURITY: Check ownership in code before writing
 */
const updateVenue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Fetch existing row to verify ownership
    const { data: venue, error: fetchError } = await supabaseAdmin
      .from('venues')
      .select('id, owner_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !venue) {
      return errorResponse(res, 'Venue not found', 404);
    }

    if (venue.owner_id !== userId && !isAdmin) {
      return errorResponse(res, 'Forbidden: You do not have permission to update this venue', 403);
    }

    const {
      name,
      title,
      description,
      address,
      city,
      state,
      country,
      zip_code,
      postal_code,
      capacity,
      price_per_hour,
      price_per_day,
      amenities,
      rules,
      is_active,
    } = req.body;

    const updatePayload = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updatePayload.title = title;
    if (name !== undefined) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description;
    if (address !== undefined) updatePayload.address = address;
    if (city !== undefined) updatePayload.city = city;
    if (state !== undefined) updatePayload.state = state;
    if (country !== undefined) updatePayload.country = country;
    if (zip_code !== undefined) updatePayload.zip_code = zip_code;
    if (postal_code !== undefined) updatePayload.zip_code = postal_code;
    if (capacity !== undefined) updatePayload.capacity = Number(capacity);
    if (price_per_hour !== undefined) updatePayload.price_per_hour = Number(price_per_hour);
    if (price_per_day !== undefined) updatePayload.price_per_day = Number(price_per_day);
    if (amenities !== undefined) updatePayload.amenities = amenities;
    if (rules !== undefined) updatePayload.rules = rules;
    if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);

    const { data: updatedVenue, error: updateError } = await supabaseAdmin
      .from('venues')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return errorResponse(res, 'Failed to update venue', 500, updateError.message);
    }

    return successResponse(res, { venue: updatedVenue }, 'Venue updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 6. Delete venue
 * SECURITY: Check ownership in code before writing
 */
const deleteVenue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const { data: venue, error: fetchError } = await supabaseAdmin
      .from('venues')
      .select('id, owner_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !venue) {
      return errorResponse(res, 'Venue not found', 404);
    }

    if (venue.owner_id !== userId && !isAdmin) {
      return errorResponse(res, 'Forbidden: You do not have permission to delete this venue', 403);
    }

    const { error: deleteError } = await supabaseAdmin
      .from('venues')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return errorResponse(res, 'Failed to delete venue', 500, deleteError.message);
    }

    return successResponse(res, null, 'Venue deleted successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 7. Images: Add image to venue
 * SECURITY: Checks ownership of venue first
 */
const addVenueImage = async (req, res, next) => {
  try {
    const { id } = req.params; // venue id
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Verify venue ownership
    const { data: venue, error: fetchError } = await supabaseAdmin
      .from('venues')
      .select('id, owner_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !venue) {
      return errorResponse(res, 'Venue not found', 404);
    }

    if (venue.owner_id !== userId && !isAdmin) {
      return errorResponse(res, 'Forbidden: You do not own this venue', 403);
    }

    let imageUrl = req.body.image_url || req.body.url;

    // Handle file upload if present
    if (req.file) {
      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('venue_images')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        return errorResponse(res, 'Failed to upload image file to storage', 500, uploadError.message);
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('venue_images')
        .getPublicUrl(fileName);

      imageUrl = publicUrlData?.publicUrl;
    }

    if (!imageUrl) {
      return errorResponse(res, 'Image URL or file is required', 400);
    }

    const isPrimary = Boolean(req.body.is_primary);

    // If marked primary, unset any existing primary image for this venue
    if (isPrimary) {
      await supabaseAdmin
        .from('venue_images')
        .update({ is_primary: false })
        .eq('venue_id', id);
    }

    const { data: newImage, error: insertError } = await supabaseAdmin
      .from('venue_images')
      .insert({
        venue_id: id,
        image_url: imageUrl,
        is_primary: isPrimary,
        caption: req.body.caption || '',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return errorResponse(res, 'Failed to save venue image', 500, insertError.message);
    }

    return successResponse(res, { image: newImage }, 'Image added successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 8. Images: Delete image from venue
 * SECURITY: Checks ownership of venue first
 */
const deleteVenueImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Verify venue ownership
    const { data: venue } = await supabaseAdmin
      .from('venues')
      .select('id, owner_id')
      .eq('id', id)
      .maybeSingle();

    if (!venue) {
      return errorResponse(res, 'Venue not found', 404);
    }

    if (venue.owner_id !== userId && !isAdmin) {
      return errorResponse(res, 'Forbidden: You do not own this venue', 403);
    }

    const { error: deleteError } = await supabaseAdmin
      .from('venue_images')
      .delete()
      .eq('id', imageId)
      .eq('venue_id', id);

    if (deleteError) {
      return errorResponse(res, 'Failed to delete venue image', 500, deleteError.message);
    }

    return successResponse(res, null, 'Venue image deleted successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 9. Event Types: Get event types for venue
 */
const getVenueEventTypes = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: eventTypes, error } = await supabaseAdmin
      .from('venue_event_types')
      .select('*')
      .eq('venue_id', id);

    if (error) {
      return errorResponse(res, 'Failed to fetch event types', 500, error.message);
    }

    return successResponse(res, { event_types: eventTypes || [] }, 'Event types fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * 10. Event Types: Add or update event types for venue
 * SECURITY: Checks ownership
 */
const addVenueEventType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const { data: venue } = await supabaseAdmin
      .from('venues')
      .select('id, owner_id')
      .eq('id', id)
      .maybeSingle();

    if (!venue) {
      return errorResponse(res, 'Venue not found', 404);
    }

    if (venue.owner_id !== userId && !isAdmin) {
      return errorResponse(res, 'Forbidden: You do not own this venue', 403);
    }

    const { event_type, name } = req.body;
    const typeValue = event_type || name;

    if (!typeValue) {
      return errorResponse(res, 'event_type is required', 400);
    }

    const { data: created, error } = await supabaseAdmin
      .from('venue_event_types')
      .insert({
        venue_id: id,
        event_type: typeValue,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(res, 'Failed to add event type', 500, error.message);
    }

    return successResponse(res, { event_type: created }, 'Event type added successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 11. Event Types: Remove event type
 */
const deleteVenueEventType = async (req, res, next) => {
  try {
    const { id, eventTypeId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const { data: venue } = await supabaseAdmin
      .from('venues')
      .select('id, owner_id')
      .eq('id', id)
      .maybeSingle();

    if (!venue) {
      return errorResponse(res, 'Venue not found', 404);
    }

    if (venue.owner_id !== userId && !isAdmin) {
      return errorResponse(res, 'Forbidden: You do not own this venue', 403);
    }

    const { error } = await supabaseAdmin
      .from('venue_event_types')
      .delete()
      .eq('id', eventTypeId)
      .eq('venue_id', id);

    if (error) {
      return errorResponse(res, 'Failed to delete event type', 500, error.message);
    }

    return successResponse(res, null, 'Event type removed successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 12. Availability: Get venue availability
 */
const getVenueAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: availability, error } = await supabaseAdmin
      .from('venue_availability')
      .select('*')
      .eq('venue_id', id);

    if (error) {
      return errorResponse(res, 'Failed to fetch availability', 500, error.message);
    }

    return successResponse(res, { availability: availability || [] }, 'Availability fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * 13. Availability: Add or set availability slot
 * SECURITY: Checks venue ownership
 */
const addVenueAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const { data: venue } = await supabaseAdmin
      .from('venues')
      .select('id, owner_id')
      .eq('id', id)
      .maybeSingle();

    if (!venue) {
      return errorResponse(res, 'Venue not found', 404);
    }

    if (venue.owner_id !== userId && !isAdmin) {
      return errorResponse(res, 'Forbidden: You do not own this venue', 403);
    }

    const {
      day_of_week,
      start_time,
      end_time,
      is_available = true,
      specific_date,
    } = req.body;

    const { data: slot, error } = await supabaseAdmin
      .from('venue_availability')
      .insert({
        venue_id: id,
        day_of_week: day_of_week !== undefined ? Number(day_of_week) : null,
        start_time: start_time || null,
        end_time: end_time || null,
        is_available: Boolean(is_available),
        specific_date: specific_date || null,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(res, 'Failed to save availability slot', 500, error.message);
    }

    return successResponse(res, { slot }, 'Availability added successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 14. Availability: Delete availability slot
 */
const deleteVenueAvailability = async (req, res, next) => {
  try {
    const { id, availabilityId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const { data: venue } = await supabaseAdmin
      .from('venues')
      .select('id, owner_id')
      .eq('id', id)
      .maybeSingle();

    if (!venue) {
      return errorResponse(res, 'Venue not found', 404);
    }

    if (venue.owner_id !== userId && !isAdmin) {
      return errorResponse(res, 'Forbidden: You do not own this venue', 403);
    }

    const { error } = await supabaseAdmin
      .from('venue_availability')
      .delete()
      .eq('id', availabilityId)
      .eq('venue_id', id);

    if (error) {
      return errorResponse(res, 'Failed to delete availability slot', 500, error.message);
    }

    return successResponse(res, null, 'Availability slot deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPublicVenues,
  getVenueById,
  createVenue,
  getMyVenues,
  updateVenue,
  deleteVenue,
  addVenueImage,
  deleteVenueImage,
  getVenueEventTypes,
  addVenueEventType,
  deleteVenueEventType,
  getVenueAvailability,
  addVenueAvailability,
  deleteVenueAvailability,
};
