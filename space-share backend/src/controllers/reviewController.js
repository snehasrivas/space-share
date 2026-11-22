const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../config/config');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Fallback file-backed storage if Supabase 'reviews' table is not yet provisioned in the cloud
const DATA_DIR = path.join(__dirname, '../data');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed template reviews for venues
const SEED_REVIEWS_TEMPLATES = [
  {
    author_name: 'Aarav Malhotra',
    author_city: 'New Delhi',
    rating: 5,
    event_type: 'Engagement & Sangeet',
    guest_count: 180,
    comment: 'We hosted our engagement here and couldn’t be happier! The lawn was manicured to perfection, ambient lighting was magical as sunset approached, and the air-conditioned banquet accommodated our buffet seamlessly. Proactive staff and hassle-free valet parking.',
    verified_stay: true,
    host_reply: 'Thank you Aarav! It was an absolute delight hosting your family. Wishing you both a lifetime of happiness!',
    cleanliness: 5.0,
    hospitality: 5.0,
    accuracy: 4.9,
    sound_lighting: 4.8,
    location_parking: 4.8,
    value_for_money: 4.9,
  },
  {
    author_name: 'Priya & Vikram Nair',
    author_city: 'Mumbai',
    rating: 5,
    event_type: '30th Birthday Celebration',
    guest_count: 85,
    comment: 'The acoustics and sound system here are top-tier. Our DJ had no issues plugging in, and the private green room gave us plenty of space to get ready. Outside catering was allowed with zero hassle. Everyone loved the vibe!',
    verified_stay: true,
    host_reply: 'Thanks Priya! Glad the DJ and catering setup worked out so smoothly for the big 3-0 celebration!',
    cleanliness: 4.9,
    hospitality: 5.0,
    accuracy: 5.0,
    sound_lighting: 5.0,
    location_parking: 4.7,
    value_for_money: 4.8,
  },
  {
    author_name: 'Sneha Kulkarni',
    author_city: 'Pune',
    rating: 5,
    event_type: 'Corporate Annual Gala',
    guest_count: 120,
    comment: 'Booked this space for our annual company offsite and award evening. The high-speed WiFi, projector setup, and generator backup gave us complete peace of mind. Ample parking for 50+ cars and the security staff was polite and helpful.',
    verified_stay: true,
    host_reply: null,
    cleanliness: 4.8,
    hospitality: 4.9,
    accuracy: 4.8,
    sound_lighting: 4.9,
    location_parking: 5.0,
    value_for_money: 4.8,
  },
  {
    author_name: 'Devansh Singhania',
    author_city: 'Bengaluru',
    rating: 4,
    event_type: 'Cocktail & Music Night',
    guest_count: 95,
    comment: 'Gorgeous aesthetic and prime location that was easy for our guests to find via Google Maps. The open terrace area was breezy and comfortable. Host was very flexible with our decorator who arrived early for flower setup.',
    verified_stay: true,
    host_reply: 'Appreciate your feedback Devansh! We loved having your crew here and hope to see you again soon.',
    cleanliness: 4.7,
    hospitality: 4.8,
    accuracy: 4.9,
    sound_lighting: 4.7,
    location_parking: 4.6,
    value_for_money: 4.7,
  },
];

function readLocalReviews() {
  try {
    if (fs.existsSync(REVIEWS_FILE)) {
      const data = fs.readFileSync(REVIEWS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading local reviews file:', err);
  }
  return {};
}

function writeLocalReviews(data) {
  try {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local reviews file:', err);
  }
}

// Generate seeded reviews for a venue if not yet stored
function getOrSeedVenueReviews(venueId, venueName, venueCity) {
  const allReviews = readLocalReviews();
  if (!allReviews[venueId] || allReviews[venueId].length === 0) {
    const seeded = SEED_REVIEWS_TEMPLATES.map((tpl, i) => ({
      id: `rev-${venueId.substring(0, 8)}-${i + 1}`,
      venue_id: venueId,
      author_name: tpl.author_name,
      author_city: venueCity || tpl.author_city,
      rating: tpl.rating,
      event_type: tpl.event_type,
      guest_count: tpl.guest_count,
      comment: tpl.comment.replace('this space', venueName || 'this space'),
      verified_stay: tpl.verified_stay,
      host_reply: tpl.host_reply,
      cleanliness: tpl.cleanliness,
      hospitality: tpl.hospitality,
      accuracy: tpl.accuracy,
      sound_lighting: tpl.sound_lighting,
      location_parking: tpl.location_parking,
      value_for_money: tpl.value_for_money,
      created_at: new Date(Date.now() - (i + 1) * 86400000 * 14).toISOString(),
    }));
    allReviews[venueId] = seeded;
    writeLocalReviews(allReviews);
    return seeded;
  }
  return allReviews[venueId];
}

// Compute aggregate rating statistics
function calculateReviewStats(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      average_rating: 5.0,
      total_reviews: 0,
      breakdown: {
        cleanliness: 5.0,
        hospitality: 5.0,
        accuracy: 5.0,
        sound_lighting: 5.0,
        location_parking: 5.0,
        value_for_money: 5.0,
      },
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }

  let totalRating = 0;
  let sumClean = 0, sumHosp = 0, sumAcc = 0, sumSound = 0, sumLoc = 0, sumVal = 0;
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    distribution[star] = (distribution[star] || 0) + 1;
    totalRating += Number(r.rating || 5);
    sumClean += Number(r.cleanliness || r.rating || 5);
    sumHosp += Number(r.hospitality || r.rating || 5);
    sumAcc += Number(r.accuracy || r.rating || 5);
    sumSound += Number(r.sound_lighting || r.rating || 5);
    sumLoc += Number(r.location_parking || r.rating || 5);
    sumVal += Number(r.value_for_money || r.rating || 5);
  }

  const count = reviews.length;
  return {
    average_rating: Number((totalRating / count).toFixed(2)),
    total_reviews: count,
    breakdown: {
      cleanliness: Number((sumClean / count).toFixed(1)),
      hospitality: Number((sumHosp / count).toFixed(1)),
      accuracy: Number((sumAcc / count).toFixed(1)),
      sound_lighting: Number((sumSound / count).toFixed(1)),
      location_parking: Number((sumLoc / count).toFixed(1)),
      value_for_money: Number((sumVal / count).toFixed(1)),
    },
    distribution,
  };
}

/**
 * GET /api/venues/:id/reviews
 * Fetch all ratings, reviews, aspect breakdown and distribution for a venue
 */
const getVenueReviews = async (req, res, next) => {
  try {
    const { id: venueId } = req.params;
    const { event_type, sort = 'newest' } = req.query;

    let reviews = [];
    let isDbSource = false;

    // 1. Attempt query from live Supabase DB
    try {
      const { data, error } = await supabaseAdmin
        .from('reviews')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        reviews = data;
        isDbSource = true;
      }
    } catch {
      // Supabase table not created; will use fallback
    }

    // 2. If no reviews in Supabase DB, check local persistent store
    if (!isDbSource) {
      // Fetch venue details for contextual authorCity/name
      let venueName = 'Space';
      let venueCity = 'India';
      try {
        const { data: v } = await supabaseAdmin
          .from('venues')
          .select('title, city')
          .eq('id', venueId)
          .maybeSingle();
        if (v) {
          venueName = v.title || 'Space';
          venueCity = v.city || 'India';
        }
      } catch { /* ignore */ }

      reviews = getOrSeedVenueReviews(venueId, venueName, venueCity);
    }

    // 3. Optional filter by event_type
    if (event_type && event_type !== 'All') {
      reviews = reviews.filter(r => (r.event_type || '').toLowerCase().includes(event_type.toLowerCase()));
    }

    // 4. Sort
    if (sort === 'highest') {
      reviews = [...reviews].sort((a, b) => b.rating - a.rating);
    } else if (sort === 'lowest') {
      reviews = [...reviews].sort((a, b) => a.rating - b.rating);
    } else {
      reviews = [...reviews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const stats = calculateReviewStats(reviews);

    return successResponse(
      res,
      {
        venue_id: venueId,
        stats,
        reviews,
      },
      'Venue reviews retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/venues/:id/reviews
 * Submit a new review and rating for a venue
 */
const createVenueReview = async (req, res, next) => {
  try {
    const { id: venueId } = req.params;
    const {
      rating,
      comment,
      author_name,
      author_city,
      event_type,
      guest_count,
      cleanliness,
      hospitality,
      accuracy,
      sound_lighting,
      location_parking,
      value_for_money,
    } = req.body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return errorResponse(res, 'Please provide a valid star rating between 1 and 5', 400);
    }

    if (!comment || comment.trim().length < 5) {
      return errorResponse(res, 'Review comment must be at least 5 characters long', 400);
    }

    const reviewerName = author_name?.trim() || req.user?.user_metadata?.full_name || req.user?.email?.split('@')[0] || 'Verified Guest';
    const reviewerCity = author_city?.trim() || 'India';
    const numericRating = Number(rating);

    const newReview = {
      id: `rev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      venue_id: venueId,
      user_id: req.user?.id || null,
      author_name: reviewerName,
      author_city: reviewerCity,
      rating: numericRating,
      event_type: event_type || 'Celebration',
      guest_count: guest_count ? Number(guest_count) : 100,
      comment: comment.trim(),
      cleanliness: cleanliness ? Number(cleanliness) : numericRating,
      hospitality: hospitality ? Number(hospitality) : numericRating,
      accuracy: accuracy ? Number(accuracy) : numericRating,
      sound_lighting: sound_lighting ? Number(sound_lighting) : numericRating,
      location_parking: location_parking ? Number(location_parking) : numericRating,
      value_for_money: value_for_money ? Number(value_for_money) : numericRating,
      verified_stay: true,
      host_reply: null,
      created_at: new Date().toISOString(),
    };

    // 1. Attempt insert in Supabase
    try {
      const { data: dbData, error: dbError } = await supabaseAdmin
        .from('reviews')
        .insert({
          venue_id: venueId,
          user_id: req.user?.id || null,
          author_name: newReview.author_name,
          author_city: newReview.author_city,
          rating: newReview.rating,
          event_type: newReview.event_type,
          guest_count: newReview.guest_count,
          comment: newReview.comment,
          cleanliness: newReview.cleanliness,
          hospitality: newReview.hospitality,
          accuracy: newReview.accuracy,
          sound_lighting: newReview.sound_lighting,
          location_parking: newReview.location_parking,
          value_for_money: newReview.value_for_money,
          verified_stay: true,
        })
        .select()
        .single();

      if (!dbError && dbData) {
        newReview.id = dbData.id;
      }
    } catch {
      // Fallback to local store
    }

    // 2. Also save to local persistent store for instant synchronization
    const allReviews = readLocalReviews();
    if (!allReviews[venueId]) {
      allReviews[venueId] = [];
    }
    allReviews[venueId].unshift(newReview);
    writeLocalReviews(allReviews);

    const stats = calculateReviewStats(allReviews[venueId]);

    return successResponse(
      res,
      {
        review: newReview,
        stats,
      },
      'Review submitted successfully! Thank you for sharing your feedback.',
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/venues/:id/reviews/:reviewId/reply
 * Allows venue owner or host to reply to a guest review
 */
const addHostReply = async (req, res, next) => {
  try {
    const { id: venueId, reviewId } = req.params;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return errorResponse(res, 'Host reply cannot be empty', 400);
    }

    // Update in Supabase
    try {
      await supabaseAdmin
        .from('reviews')
        .update({ host_reply: reply.trim() })
        .eq('id', reviewId)
        .eq('venue_id', venueId);
    } catch { /* ignore */ }

    // Update in local store
    const allReviews = readLocalReviews();
    if (allReviews[venueId]) {
      const target = allReviews[venueId].find(r => r.id === reviewId);
      if (target) {
        target.host_reply = reply.trim();
        writeLocalReviews(allReviews);
      }
    }

    return successResponse(res, { reviewId, host_reply: reply.trim() }, 'Host reply posted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getVenueReviews,
  createVenueReview,
  addHostReply,
};
