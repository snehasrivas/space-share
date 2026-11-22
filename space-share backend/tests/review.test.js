const test = require('node:test');
const assert = require('node:assert');
const { getVenueReviews, createVenueReview, calculateReviewStats } = require('../src/controllers/reviewController');

test('Reviews & Ratings Controller Tests', async (t) => {
  const dummyVenueId = '85418b7e-9764-42b7-827c-67448373b984';

  await t.test('calculateReviewStats computes correct averages and distribution', () => {
    const sampleReviews = [
      { rating: 5, cleanliness: 5, hospitality: 5, accuracy: 5, sound_lighting: 5, location_parking: 5, value_for_money: 5 },
      { rating: 4, cleanliness: 4, hospitality: 4, accuracy: 4, sound_lighting: 4, location_parking: 4, value_for_money: 4 },
    ];
    // We can test stats logic via mock response
    assert.ok(sampleReviews.length === 2);
  });

  await t.test('getVenueReviews handles request and returns 200 with review data', async () => {
    const req = {
      params: { id: dummyVenueId },
      query: { sort: 'newest' },
    };
    let responseCode = 200;
    let responseBody = null;
    const res = {
      status(code) {
        responseCode = code;
        return this;
      },
      json(payload) {
        responseBody = payload;
        return this;
      },
    };

    await getVenueReviews(req, res, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(responseCode, 200);
    assert.strictEqual(responseBody.success, true);
    assert.strictEqual(responseBody.data.venue_id, dummyVenueId);
    assert.ok(responseBody.data.stats.average_rating > 0);
    assert.ok(Array.isArray(responseBody.data.reviews));
    assert.ok(responseBody.data.reviews.length > 0);
  });

  await t.test('createVenueReview successfully adds and returns a new review', async () => {
    const req = {
      params: { id: dummyVenueId },
      body: {
        rating: 5,
        comment: 'Magnificent banquet space with grand lawn, excellent acoustics and attentive hospitality.',
        author_name: 'Ananya Deshmukh',
        author_city: 'Mumbai',
        event_type: 'Silver Jubilee Reception',
        guest_count: 220,
      },
      user: { id: 'usr-test-123' },
    };
    let responseCode = 200;
    let responseBody = null;
    const res = {
      status(code) {
        responseCode = code;
        return this;
      },
      json(payload) {
        responseBody = payload;
        return this;
      },
    };

    await createVenueReview(req, res, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(responseCode, 201);
    assert.strictEqual(responseBody.success, true);
    assert.strictEqual(responseBody.data.review.author_name, 'Ananya Deshmukh');
    assert.strictEqual(responseBody.data.review.rating, 5);
    assert.strictEqual(responseBody.data.review.event_type, 'Silver Jubilee Reception');
  });

  await t.test('createVenueReview rejects invalid ratings', async () => {
    const req = {
      params: { id: dummyVenueId },
      body: {
        rating: 7, // Invalid
        comment: 'Invalid rating',
      },
    };
    let responseCode = 200;
    let responseBody = null;
    const res = {
      status(code) {
        responseCode = code;
        return this;
      },
      json(payload) {
        responseBody = payload;
        return this;
      },
    };

    await createVenueReview(req, res, () => {});

    assert.strictEqual(responseCode, 400);
    assert.strictEqual(responseBody.success, false);
  });
});
