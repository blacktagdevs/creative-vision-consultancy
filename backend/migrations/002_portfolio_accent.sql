-- Creative Vision Consultancy — one accent tone per gallery, chosen by the
-- owner in the admin. The site tints that gallery's card on /gallery, the band
-- at the top of its own page, and its tile on the home page with it.
--
-- The values are named tones, not hex codes: the actual colors live in the
-- site's stylesheet, so the palette can be tuned without touching data. Keep
-- this list in step with ACCENTS in src/lib/validation.js and app/lib/accent.ts.
-- Existing galleries start on 'blush', the house rose.

ALTER TABLE portfolio_items
  ADD COLUMN IF NOT EXISTS accent text NOT NULL DEFAULT 'blush';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_accent_chk') THEN
    ALTER TABLE portfolio_items
      ADD CONSTRAINT portfolio_accent_chk CHECK (accent IN ('blush', 'sage', 'champagne', 'dusk', 'clay'));
  END IF;
END $$;
