/**
 * Tests for booking & payment security rules.
 * Uses a mock Supabase client — does NOT hit any external service.
 *
 * Run:  node tests/booking_payment.test.js
 */

const assert = require('assert');
const crypto = require('crypto');

// ── Mock infrastructure ─────────────────────────────────────────────

const configModule = require('../src/config/config');

// Set a deterministic Razorpay secret so HMAC tests are reproducible
const TEST_RAZORPAY_SECRET = 'test_razorpay_key_secret_for_hmac';
configModule.config.razorpayKeySecret = TEST_RAZORPAY_SECRET;

let fromCalls = [];

/**
 * Returns a chainable builder whose every method returns itself,
 * and that resolves to `result` when awaited.
 * Also records every chained method call into `callInfo.methods`.
 */
function createChainable(result, callInfo) {
  callInfo.methods = [];
  const chain = {};
  const METHODS = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'lt', 'gt', 'gte', 'lte', 'in', 'ilike', 'or', 'not',
    'order', 'range', 'limit', 'single', 'maybeSingle', 'filter',
  ];

  for (const m of METHODS) {
    chain[m] = (...args) => {
      callInfo.methods.push({ method: m, args });
      return chain;
    };
  }

  // Make the chain awaitable (thenable)
  chain.then = (resolve, reject) => {
    try {
      resolve(result);
    } catch (e) {
      if (reject) reject(e);
    }
  };
  chain.catch = () => chain;

  return chain;
}

/**
 * Replace supabaseAdmin.from() with a mock that returns a pre-configured
 * sequence of results, one per `from()` call.
 */
function mockFromSequence(responses) {
  let i = 0;
  fromCalls = [];
  configModule.supabaseAdmin.from = (table) => {
    const callInfo = { table, index: i };
    fromCalls.push(callInfo);
    const result = responses[i] || { data: null, error: null };
    i++;
    return createChainable(result, callInfo);
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function mockReq(overrides = {}) {
  return { headers: {}, params: {}, body: {}, query: {}, user: null, ...overrides };
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
}

// ── Test runner ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn) {
  try {
    await fn();
    results.push(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    results.push(`  FAIL  ${name}\n         ${err.message}`);
    failed++;
  }
}

// ── Test cases ───────────────────────────────────────────────────────

async function run() {

  // ─── TEST 1 ────────────────────────────────────────────────────────
  // /api/payments/verify MUST reject an invalid Razorpay signature
  // with 400 and leave the booking unpaid.
  // ────────────────────────────────────────────────────────────────────
  await test('/api/payments/verify rejects invalid signature (400, booking stays unpaid)', async () => {
    const bookingId = 'booking-sig-test';
    const userId = 'user-sig-test';

    // Only one from() call should happen (the SELECT to fetch the booking).
    // The controller must bail out before any UPDATE.
    mockFromSequence([
      {
        data: {
          id: bookingId,
          renter_id: userId,
          venue_id: 'venue-1',
          razorpay_order_id: 'order_real',
          payment_status: 'unpaid',
          status: 'pending',
          total_amount: 1000,
        },
        error: null,
      },
    ]);

    const { verifyPayment } = require('../src/controllers/paymentController');

    const req = mockReq({
      user: { id: userId, role: 'renter' },
      body: {
        razorpay_order_id: 'order_real',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'definitely_not_a_valid_hmac_signature',
        booking_id: bookingId,
      },
    });

    const res = mockRes();
    let nextErr = null;
    await verifyPayment(req, res, (err) => { nextErr = err; });

    // Must return 400
    assert.strictEqual(res.statusCode, 400, `Expected status 400, got ${res.statusCode}`);
    assert.strictEqual(res.body.success, false, 'Response must have success: false');
    assert.ok(
      res.body.message.toLowerCase().includes('signature') ||
        res.body.message.toLowerCase().includes('invalid'),
      `Expected signature-related error, got: "${res.body.message}"`
    );

    // Must NOT have made a second from() call (the update to mark paid)
    assert.strictEqual(
      fromCalls.length,
      1,
      `Expected exactly 1 from() call (select only), got ${fromCalls.length} — booking would have been marked paid without valid signature!`
    );
  });

  // ─── TEST 1b ───────────────────────────────────────────────────────
  // Confirm that a *correct* signature WOULD pass (sanity check)
  // ────────────────────────────────────────────────────────────────────
  await test('HMAC sanity: correct signature differs from bogus one', async () => {
    const orderId = 'order_real';
    const paymentId = 'pay_123';

    const correctSig = crypto
      .createHmac('sha256', TEST_RAZORPAY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.notStrictEqual(
      correctSig,
      'definitely_not_a_valid_hmac_signature',
      'The bogus signature used in Test 1 must differ from the real HMAC'
    );
  });

  // ─── TEST 2 ────────────────────────────────────────────────────────
  // An expired unpaid hold must be cancelled BEFORE the overlap check
  // so that a new booking for the same slot succeeds.
  // ────────────────────────────────────────────────────────────────────
  await test('expired hold is cancelled before overlap check — new booking succeeds (201)', async () => {
    const venueId = 'venue-hold-test';
    const renterId = 'renter-hold-test';
    const newBookingId = 'booking-hold-new';

    // createBooking sequence of from() calls:
    //   0  from('venues')   → SELECT venue
    //   1  from('bookings') → UPDATE: cancel expired holds
    //   2  from('bookings') → SELECT: overlap check (returns [] after cancellation)
    //   3  from('bookings') → INSERT: create new booking
    mockFromSequence([
      // 0 – venue lookup
      { data: { id: venueId, owner_id: 'owner-xyz', is_active: true, is_verified: true }, error: null },
      // 1 – cancel expired holds (no rows needed in response)
      { data: null, error: null },
      // 2 – overlap check → empty, meaning slot is free
      { data: [], error: null },
      // 3 – insert new booking
      {
        data: {
          id: newBookingId,
          venue_id: venueId,
          renter_id: renterId,
          booking_date: '2026-11-15',
          start_time: '10:00',
          end_time: '12:00',
          total_amount: 3000,
          status: 'pending',
          payment_status: 'unpaid',
          hold_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      },
    ]);

    const { createBooking } = require('../src/controllers/bookingController');

    const req = mockReq({
      user: { id: renterId, role: 'renter' },
      body: {
        venue_id: venueId,
        booking_date: '2026-11-15',
        start_time: '10:00',
        end_time: '12:00',
        total_amount: 3000,
      },
    });

    const res = mockRes();
    await createBooking(req, res, (err) => { throw err; });

    // New booking must succeed
    assert.strictEqual(res.statusCode, 201, `Expected 201, got ${res.statusCode}`);
    assert.strictEqual(res.body.success, true, 'Response must have success: true');
    assert.strictEqual(res.body.data.booking.id, newBookingId, 'Must return the new booking');

    // Verify exactly 4 from() calls in the right order
    assert.strictEqual(fromCalls.length, 4, `Expected 4 from() calls, got ${fromCalls.length}`);
    assert.strictEqual(fromCalls[0].table, 'venues', 'Call 0 must be on venues table');
    assert.strictEqual(fromCalls[1].table, 'bookings', 'Call 1 must be on bookings (cancel expired)');
    assert.strictEqual(fromCalls[2].table, 'bookings', 'Call 2 must be on bookings (overlap check)');
    assert.strictEqual(fromCalls[3].table, 'bookings', 'Call 3 must be on bookings (insert)');

    // Call 1 must be an UPDATE that cancels expired holds
    const cancelCall = fromCalls[1];
    const hasUpdate = cancelCall.methods.some((m) => m.method === 'update');
    assert.ok(hasUpdate, 'Call 1 must include update() to cancel expired holds');

    // Verify the cancel query filters on the right columns
    const eqFields = cancelCall.methods
      .filter((m) => m.method === 'eq')
      .map((m) => m.args[0]);
    assert.ok(eqFields.includes('venue_id'), 'Cancel must filter by venue_id');
    assert.ok(eqFields.includes('status'), 'Cancel must filter by status=pending');
    assert.ok(eqFields.includes('payment_status'), 'Cancel must filter by payment_status=unpaid');

    // Verify lt(hold_expires_at, <now>) is present
    const ltCalls = cancelCall.methods.filter((m) => m.method === 'lt');
    assert.ok(ltCalls.length > 0, 'Cancel must use lt() for hold_expires_at');
    assert.strictEqual(ltCalls[0].args[0], 'hold_expires_at', 'lt() must target hold_expires_at');
  });

  // ─── TEST 3 ────────────────────────────────────────────────────────
  // createBooking: If insert fails with Postgres code 23P01 (exclusion
  // constraint violation), must return 409 "Slot already booked" (not 500).
  // ────────────────────────────────────────────────────────────────────
  await test('createBooking returns 409 "Slot already booked" on Postgres 23P01 exclusion violation', async () => {
    const venueId = 'venue-exclusion-test';
    const renterId = 'renter-exclusion-test';

    mockFromSequence([
      // 0 – venue lookup
      { data: { id: venueId, owner_id: 'owner-xyz', is_active: true, is_verified: true }, error: null },
      // 1 – cancel expired holds
      { data: null, error: null },
      // 2 – overlap check (simulate race condition where JS check passed)
      { data: [], error: null },
      // 3 – insert fails with Postgres 23P01 exclusion violation
      {
        data: null,
        error: {
          code: '23P01',
          message: 'conflicting key value violates exclusion constraint "no_overlapping_bookings"',
        },
      },
    ]);

    const { createBooking } = require('../src/controllers/bookingController');

    const req = mockReq({
      user: { id: renterId, role: 'renter' },
      body: {
        venue_id: venueId,
        booking_date: '2026-11-15',
        start_time: '14:00',
        end_time: '16:00',
        total_amount: 2500,
      },
    });

    const res = mockRes();
    await createBooking(req, res, (err) => { throw err; });

    assert.strictEqual(res.statusCode, 409, `Expected 409 for 23P01 error, got ${res.statusCode}`);
    assert.strictEqual(res.body.success, false, 'Response must have success: false');
    assert.strictEqual(res.body.message, 'Slot already booked', `Expected message "Slot already booked", got "${res.body.message}"`);
  });

  // ─── TEST 4 ────────────────────────────────────────────────────────
  // verifyPayment: If booking is cancelled (expired hold), do NOT mark
  // confirmed. Return 400 error and log for refund.
  // ────────────────────────────────────────────────────────────────────
  await test('verifyPayment on cancelled booking returns 400, does not confirm, logs refund', async () => {
    const bookingId = 'booking-cancelled-verify';
    const userId = 'user-cancelled-verify';
    const orderId = 'order_cancelled_123';
    const paymentId = 'pay_cancelled_123';

    // Compute legitimate HMAC signature for this order & payment
    const validSignature = crypto
      .createHmac('sha256', TEST_RAZORPAY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    mockFromSequence([
      {
        data: {
          id: bookingId,
          renter_id: userId,
          venue_id: 'venue-1',
          razorpay_order_id: orderId,
          payment_status: 'unpaid',
          status: 'cancelled', // Hold expired and was cancelled!
          total_amount: 5000,
        },
        error: null,
      },
    ]);

    const { verifyPayment } = require('../src/controllers/paymentController');

    const req = mockReq({
      user: { id: userId, role: 'renter' },
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
        booking_id: bookingId,
      },
    });

    // Capture console.error to check refund log
    const loggedErrors = [];
    const originalConsoleError = console.error;
    console.error = (...args) => { loggedErrors.push(args.join(' ')); };

    const res = mockRes();
    try {
      await verifyPayment(req, res, (err) => { throw err; });
    } finally {
      console.error = originalConsoleError;
    }

    assert.strictEqual(res.statusCode, 400, `Expected 400, got ${res.statusCode}`);
    assert.strictEqual(res.body.success, false, 'Response must have success: false');
    assert.ok(
      res.body.message.toLowerCase().includes('cancelled') ||
      res.body.message.toLowerCase().includes('refund'),
      `Expected message referencing cancellation or refund, got: "${res.body.message}"`
    );

    // Ensure NO update was made (fromCalls only had 1 SELECT, no UPDATE)
    assert.strictEqual(fromCalls.length, 1, 'Must NOT update or confirm cancelled booking');

    // Ensure refund was logged
    const hasRefundLog = loggedErrors.some((log) => log.includes('REFUND') && log.includes(bookingId));
    assert.ok(hasRefundLog, 'Must log refund needed with booking ID');
  });

  // ─── TEST 5 ────────────────────────────────────────────────────────
  // webhook payment.captured: If booking is cancelled (expired hold), do
  // NOT mark confirmed. Return 200 (acknowledge so Razorpay stops retry)
  // and log for refund.
  // ────────────────────────────────────────────────────────────────────
  await test('webhook payment.captured on cancelled booking returns 200, does not confirm, logs refund', async () => {
    const bookingId = 'booking-cancelled-webhook';
    const orderId = 'order_webhook_cancelled';
    const paymentId = 'pay_webhook_cancelled';
    const webhookSecret = 'test_webhook_secret_hmac';
    configModule.config.razorpayWebhookSecret = webhookSecret;

    const payloadObj = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 500000,
          },
        },
      },
    };

    const rawBody = Buffer.from(JSON.stringify(payloadObj));
    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    mockFromSequence([
      {
        data: {
          id: bookingId,
          payment_status: 'unpaid',
          status: 'cancelled',
          total_amount: 5000,
        },
        error: null,
      },
    ]);

    const { webhook } = require('../src/controllers/paymentController');

    const req = mockReq({
      headers: { 'x-razorpay-signature': validSignature },
      body: payloadObj,
      rawBody: rawBody,
    });

    const loggedErrors = [];
    const originalConsoleError = console.error;
    console.error = (...args) => { loggedErrors.push(args.join(' ')); };

    const res = mockRes();
    try {
      await webhook(req, res, (err) => { throw err; });
    } finally {
      console.error = originalConsoleError;
    }

    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
    assert.strictEqual(res.body.success, false, 'Response must have success: false');
    assert.ok(
      res.body.message.toLowerCase().includes('cancelled') ||
      res.body.message.toLowerCase().includes('refund'),
      `Expected message referencing cancellation or refund, got: "${res.body.message}"`
    );

    // Ensure NO update was made (fromCalls only had 1 SELECT, no UPDATE)
    assert.strictEqual(fromCalls.length, 1, 'Must NOT update or confirm cancelled booking');

    // Ensure refund was logged
    const hasRefundLog = loggedErrors.some((log) => log.includes('REFUND') && log.includes(bookingId));
    assert.ok(hasRefundLog, 'Must log refund needed with booking ID');
  });

  // ── Report ─────────────────────────────────────────────────────────
  console.log('\n=========================================');
  console.log('  Booking & Payment Security Tests');
  console.log('=========================================\n');
  results.forEach((r) => console.log(r));
  console.log(`\n  Total: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}`);
  console.log('=========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

run();
