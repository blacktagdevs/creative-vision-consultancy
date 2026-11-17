// The words and photos on the Home and About pages that the owner can change
// from the admin (Pages). The site owns the original wording and photos (see
// app/lib/pages.ts); the API stores only the fields she has changed, as one
// flat { key: text } object per page, so nothing here knows what the originals
// say. This file is the list of fields each page has and what each may hold.
//
// The keys must match app/lib/pages.ts exactly: a key missing here could never
// be saved, and one missing there would be saved and never shown.
import { ValidationError, checkField } from './validation.js'

// What a key holds is decided by its ending, the same rule the site uses.
const ENDINGS = {
  _image_url: { type: 'image' }, // an uploaded photo
  _image_alt: { type: 'text', max: 300 }, // the photo's description
  _eyebrow: { type: 'text', max: 80 }, // the small label above a heading
  _title: { type: 'text', max: 160 }, // a heading
  _lede: { type: 'text', max: 300 }, // one sentence under a page title
  _body: { type: 'text', max: 3000 }, // paragraphs
}

// Each key with the name it goes by in a message she might read, such as
// "Hero heading is too long (max 160 characters)".
const LABELS = {
  home: {
    hero_image_url: 'Hero photo',
    hero_image_alt: 'Hero photo description',
    hero_eyebrow: 'Hero label',
    hero_title: 'Hero heading',

    intro_eyebrow: 'Introduction label',
    intro_title: 'Introduction heading',
    intro_body: 'Introduction text',
    intro_image_url: 'Introduction photo',
    intro_image_alt: 'Introduction photo description',

    services_eyebrow: 'Services label',
    services_title: 'Services heading',

    teaser_1_title: 'First service card heading',
    teaser_1_body: 'First service card text',
    teaser_1_image_url: 'First service card photo',
    teaser_1_image_alt: 'First service card photo description',

    teaser_2_title: 'Second service card heading',
    teaser_2_body: 'Second service card text',
    teaser_2_image_url: 'Second service card photo',
    teaser_2_image_alt: 'Second service card photo description',

    teaser_3_title: 'Third service card heading',
    teaser_3_body: 'Third service card text',
    teaser_3_image_url: 'Third service card photo',
    teaser_3_image_alt: 'Third service card photo description',

    portfolio_eyebrow: 'Portfolio label',
    portfolio_title: 'Portfolio heading',

    cta_title: 'Closing heading',
  },
  about: {
    header_eyebrow: 'Page label',
    header_title: 'Page heading',
    header_lede: 'Page introduction',

    story_image_url: 'Story photo',
    story_image_alt: 'Story photo description',
    story_eyebrow: 'Story label',
    story_title: 'Story heading',
    story_body: 'Story text',

    owner_image_url: 'Owner portrait',
    owner_image_alt: 'Owner portrait description',
    owner_eyebrow: 'Owner label',
    owner_title: 'Owner heading',
    owner_body: 'Owner text',

    cta_title: 'Closing heading',
  },
}

/* A key whose ending isn't in ENDINGS has no rule to be checked by, so it
   stops the server at boot instead of letting anything through unchecked. */
function describeField(key, label) {
  const ending = Object.keys(ENDINGS).find((e) => key.endsWith(e))
  if (!ending) throw new Error(`Page field "${key}" does not end in one of: ${Object.keys(ENDINGS).join(', ')}`)
  return { ...ENDINGS[ending], label }
}

/** Every editable page: { page: { key: { type, label, max } } }, as FIELDS describes a resource. */
export const PAGES = Object.fromEntries(
  Object.entries(LABELS).map(([page, labels]) => [
    page,
    Object.fromEntries(Object.entries(labels).map(([key, label]) => [key, describeField(key, label)])),
  ])
)

/* Mount as `router.param('page', pageParam)`. Checks for the page's own entry
   so a name every object answers to ("constructor") is still a 404. */
export function pageParam(_req, res, next, value) {
  if (!Object.hasOwn(PAGES, value)) return res.status(404).json({ error: 'Not found' })
  next()
}

/**
 * Sort a save into the fields to store and the fields to drop. Only the page's
 * own keys are looked at; anything else is ignored, as it is for the other
 * resources. A null or blank value drops the key, which puts the original
 * back: the site falls back to its own wording for any key it isn't given.
 * Everything else is checked and kept trimmed.
 */
export function validatePageChanges(page, body, { allowInline = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('Expected an object')

  const set = {}
  const remove = []
  for (const [key, f] of Object.entries(PAGES[page])) {
    if (!Object.hasOwn(body, key) || body[key] === undefined) continue
    const value = typeof body[key] === 'string' ? body[key].trim() : body[key]
    if (value === null || value === '') remove.push(key)
    else set[key] = checkField(value, f, { allowInline })
  }
  return { set, remove }
}

/** The photos a page's stored content points at. */
export function pageImages(page, content) {
  return Object.entries(PAGES[page])
    .filter(([key, f]) => f.type === 'image' && content?.[key])
    .map(([key]) => content[key])
}
