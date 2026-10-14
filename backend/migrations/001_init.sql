-- Creative Vision Consultancy — initial schema: the three things the owner
-- manages from the admin (services, portfolio galleries, testimonials) plus
-- passwordless admin auth. Plain SQL, run by scripts/migrate.js.
--
-- Every managed table carries sort_order (she arranges the page by hand) and a
-- draft/published status (nothing appears on the site until she says so). How
-- many rows each table may hold is enforced in the API — see LIMITS in
-- src/config.js — because the cap is a product rule, not an integrity one.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- services — the packages on /services, grouped by category.
-- Descriptions are plain text; blank lines separate paragraphs. Consulting's
-- "Sessions may include:" list lives in bullets_heading + bullets.
-- price_from_cents NULL means no price is shown ("inquire for pricing").
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category         text NOT NULL,
  name             text NOT NULL,
  slug             text NOT NULL,
  description      text,
  bullets_heading  text,
  bullets          text[] NOT NULL DEFAULT '{}',
  closing_note     text,
  price_prefix     text NOT NULL DEFAULT 'Starts at',
  price_from_cents integer,
  image_url        text,
  sort_order       integer NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'draft',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT services_category_chk CHECK (category IN ('wedding', 'social_corporate')),
  CONSTRAINT services_status_chk CHECK (status IN ('draft', 'published')),
  CONSTRAINT services_price_chk CHECK (price_from_cents IS NULL OR price_from_cents >= 0),
  CONSTRAINT services_slug_key UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_services_status_order ON services (status, sort_order);

-- ---------------------------------------------------------------------------
-- portfolio_items — one gallery per event on /gallery, with its own page at
-- /gallery/:slug. The cover is one of its own photos (cover_photo_id, added
-- below once portfolio_photos exists); NULL falls back to the first photo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,                  -- "Ogechi & Richard Flowers"
  slug        text NOT NULL,
  category    text NOT NULL,
  event_date  date,
  location    text,
  summary     text,
  sort_order  integer NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'draft',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_category_chk CHECK (category IN ('wedding', 'engagement', 'social', 'corporate')),
  CONSTRAINT portfolio_status_chk CHECK (status IN ('draft', 'published')),
  CONSTRAINT portfolio_slug_key UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_status_order ON portfolio_items (status, sort_order);

-- ---------------------------------------------------------------------------
-- portfolio_photos — the photos inside a gallery. width/height are recorded at
-- upload so the public grid can reserve space and not jump while images load.
-- Deleting a gallery deletes its photos (the API then purges the R2 objects).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_photos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_item_id uuid NOT NULL REFERENCES portfolio_items(id) ON DELETE CASCADE,
  image_url         text NOT NULL,
  alt               text,
  width             integer,
  height            integer,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_photos_dims_chk CHECK (
    (width IS NULL OR width > 0) AND (height IS NULL OR height > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_portfolio_photos_item ON portfolio_photos (portfolio_item_id, sort_order);

ALTER TABLE portfolio_items
  ADD COLUMN IF NOT EXISTS cover_photo_id uuid REFERENCES portfolio_photos(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- testimonials — the reviews at the bottom of the home page.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonials (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote        text NOT NULL,
  attribution  text NOT NULL,                 -- "Ogechi F."
  event_label  text,                          -- "Bride, 2025"
  sort_order   integer NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'draft',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT testimonials_status_chk CHECK (status IN ('draft', 'published'))
);

CREATE INDEX IF NOT EXISTS idx_testimonials_status_order ON testimonials (status, sort_order);

-- ---------------------------------------------------------------------------
-- login_tokens — passwordless admin magic-link auth
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  token_hash text NOT NULL,   -- sha256 of the raw token; raw is emailed, never stored
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_tokens_hash ON login_tokens (token_hash);
