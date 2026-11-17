-- Creative Vision Consultancy — the words and photos on the Home and About
-- pages, which the owner edits from the admin (Pages).
--
-- The site keeps the original wording and photos itself (app/lib/pages.ts).
-- A row here holds only the fields she has changed, as one flat { key: text }
-- object, and the site lays those over the originals. A key that is missing
-- means "show the original", so with this table empty the pages read exactly
-- as they were designed, and clearing a field can never leave a hole in one.
--
-- Which keys a page has, and how long each may be, is checked in the API (see
-- src/lib/pages.js): that list follows the page design, so it changes with the
-- code. The checks below only guard what must hold whatever the design: a row
-- is for a page that exists, and its content is an object the site can lay
-- over its own. Keep the page list in step with PAGES in src/lib/pages.js and
-- PAGE_DEFAULTS in app/lib/pages.ts.

CREATE TABLE IF NOT EXISTS page_content (
  page        text PRIMARY KEY,
  content     jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT page_content_page_chk CHECK (page IN ('home', 'about')),
  CONSTRAINT page_content_object_chk CHECK (jsonb_typeof(content) = 'object')
);
