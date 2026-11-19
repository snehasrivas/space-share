-- ============================================================================
-- SpaceShare — Supabase (Postgres) schema
-- NOTE: This documents the schema that already exists in the live Supabase
-- project. Do NOT re-run it on that project (tables already exist).
-- Use it to set up a fresh project, or as team documentation.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'renter');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE pricing_type AS ENUM ('hourly', 'daily', 'flat');
CREATE TYPE venue_type AS ENUM (
  'lawn', 'terrace', 'hall', 'rooftop', 'farmhouse',
  'banquet', 'garden', 'pool_area', 'other'
);
CREATE TYPE event_type AS ENUM (
  'wedding', 'birthday', 'corporate', 'party', 'reception',
  'conference', 'exhibition', 'photoshoot', 'other'
);

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  email       TEXT,
  phone       TEXT,
  role        user_role   NOT NULL DEFAULT 'owner',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_role ON profiles(role);

CREATE TABLE venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT           NOT NULL,
  description     TEXT,
  type            venue_type     NOT NULL DEFAULT 'other',
  address         TEXT           NOT NULL,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  capacity        INTEGER        NOT NULL CHECK (capacity > 0),
  pricing_type    pricing_type   NOT NULL DEFAULT 'hourly',
  price_per_hour  NUMERIC(10,2),
  price_per_day   NUMERIC(10,2),
  flat_price      NUMERIC(10,2),
  amenities       TEXT[]         DEFAULT '{}',
  rules           TEXT,
  is_verified     BOOLEAN        NOT NULL DEFAULT false,
  is_active       BOOLEAN        NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT valid_pricing CHECK (
    (pricing_type = 'hourly' AND price_per_hour IS NOT NULL AND price_per_hour > 0)
    OR (pricing_type = 'daily' AND price_per_day IS NOT NULL AND price_per_day > 0)
    OR (pricing_type = 'flat' AND flat_price IS NOT NULL AND flat_price > 0)
  )
);
CREATE INDEX idx_venues_owner  ON venues(owner_id);
CREATE INDEX idx_venues_city   ON venues(city);
CREATE INDEX idx_venues_type   ON venues(type);
CREATE INDEX idx_venues_active ON venues(is_active, is_verified);

CREATE TABLE venue_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  is_cover   BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_venue_images_venue ON venue_images(venue_id);

CREATE TABLE venue_event_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  UNIQUE(venue_id, event_type)
);
CREATE INDEX idx_venue_event_types_venue ON venue_event_types(venue_id);

CREATE TABLE venue_availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time   TIME NOT NULL,
  close_time  TIME NOT NULL,
  CONSTRAINT valid_time CHECK (close_time > open_time)
);
CREATE INDEX idx_venue_availability_venue ON venue_availability(venue_id);

CREATE TABLE venue_verifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id          UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  submitted_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  id_proof_url      TEXT NOT NULL,
  address_proof_url TEXT NOT NULL,
  geotag_lat        DOUBLE PRECISION,
  geotag_lng        DOUBLE PRECISION,
  status            verification_status NOT NULL DEFAULT 'pending',
  admin_notes       TEXT,
  reviewed_by       UUID REFERENCES profiles(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_verifications_venue  ON venue_verifications(venue_id);
CREATE INDEX idx_verifications_status ON venue_verifications(status);

-- ---------------------------------------------------------------------------
-- BOOKINGS (renter books a verified venue; Razorpay payment fields)
-- ---------------------------------------------------------------------------
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id          UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  renter_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_date      DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  total_amount      NUMERIC NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
  payment_status    TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'failed')),
  payment_id        TEXT,
  razorpay_order_id TEXT,
  hold_expires_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_booking_time CHECK (end_time > start_time),

  -- Double-booking prevention at DB level (live name: bookings_venue_id_tsrange_excl)
  EXCLUDE USING gist (
    venue_id WITH =,
    tsrange((booking_date + start_time)::timestamp,
            (booking_date + end_time)::timestamp) WITH &&
  ) WHERE (status IN ('pending', 'confirmed'))
);
CREATE INDEX idx_bookings_venue  ON bookings(venue_id);
CREATE INDEX idx_bookings_renter ON bookings(renter_id);

-- ---------------------------------------------------------------------------
-- FUNCTIONS & TRIGGERS
-- is_admin()/is_owner() are SECURITY DEFINER to avoid RLS infinite recursion
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
END; $$;

CREATE OR REPLACE FUNCTION is_owner() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner');
END; $$;

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'owner')
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON venue_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues               ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_images         ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_event_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_availability   ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_verifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings             ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY select_own_profile ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY update_own_profile ON profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY admin_read_all_profiles ON profiles FOR SELECT USING (is_admin());

-- venues
CREATE POLICY select_public_venues ON venues FOR SELECT
  USING (is_active = true AND is_verified = true);
CREATE POLICY owner_select_own ON venues FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY owner_insert ON venues FOR INSERT
  WITH CHECK (auth.uid() = owner_id AND is_owner());
CREATE POLICY owner_update_own ON venues FOR UPDATE
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY owner_delete_own ON venues FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY admin_read_all_venues ON venues FOR SELECT USING (is_admin());

-- venue_images
CREATE POLICY select_venue_images ON venue_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM venues WHERE venues.id = venue_images.venue_id
    AND ((venues.is_active = true AND venues.is_verified = true) OR venues.owner_id = auth.uid())));
CREATE POLICY owner_insert_images ON venue_images FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM venues WHERE venues.id = venue_images.venue_id AND venues.owner_id = auth.uid()));
CREATE POLICY owner_delete_images ON venue_images FOR DELETE USING (
  EXISTS (SELECT 1 FROM venues WHERE venues.id = venue_images.venue_id AND venues.owner_id = auth.uid()));

-- venue_event_types
CREATE POLICY select_venue_event_types ON venue_event_types FOR SELECT USING (
  EXISTS (SELECT 1 FROM venues WHERE venues.id = venue_event_types.venue_id
    AND ((venues.is_active = true AND venues.is_verified = true) OR venues.owner_id = auth.uid())));
CREATE POLICY owner_manage_event_types ON venue_event_types FOR ALL USING (
  EXISTS (SELECT 1 FROM venues WHERE venues.id = venue_event_types.venue_id AND venues.owner_id = auth.uid()));

-- venue_availability
CREATE POLICY select_venue_availability ON venue_availability FOR SELECT USING (
  EXISTS (SELECT 1 FROM venues WHERE venues.id = venue_availability.venue_id
    AND ((venues.is_active = true AND venues.is_verified = true) OR venues.owner_id = auth.uid())));
CREATE POLICY owner_manage_availability ON venue_availability FOR ALL USING (
  EXISTS (SELECT 1 FROM venues WHERE venues.id = venue_availability.venue_id AND venues.owner_id = auth.uid()));

-- venue_verifications
CREATE POLICY owner_view_own_verifications ON venue_verifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM venues WHERE venues.id = venue_verifications.venue_id AND venues.owner_id = auth.uid()));
CREATE POLICY owner_submit_verification ON venue_verifications FOR INSERT WITH CHECK (
  auth.uid() = submitted_by
  AND EXISTS (SELECT 1 FROM venues WHERE venues.id = venue_verifications.venue_id AND venues.owner_id = auth.uid()));
CREATE POLICY admin_view_all_verifications ON venue_verifications FOR SELECT USING (is_admin());
CREATE POLICY admin_update_verifications ON venue_verifications FOR UPDATE USING (is_admin());

-- bookings (policy names match the live database; the venue conditions inside
-- renter_insert_booking and owner_view_own_venue_bookings were cut off in the
-- export, so they are written from the intended rules: verified + active venue
-- for inserts, venue owner for viewing)
CREATE POLICY admin_view_all_bookings ON bookings FOR SELECT USING (is_admin());
CREATE POLICY owner_view_own_venue_bookings ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM venues WHERE venues.id = bookings.venue_id AND venues.owner_id = auth.uid()));
CREATE POLICY renter_insert_booking ON bookings FOR INSERT WITH CHECK (
  auth.uid() = renter_id
  AND EXISTS (SELECT 1 FROM venues WHERE venues.id = bookings.venue_id
    AND venues.is_verified = true AND venues.is_active = true));
CREATE POLICY renter_view_own_bookings ON bookings FOR SELECT USING (auth.uid() = renter_id);
