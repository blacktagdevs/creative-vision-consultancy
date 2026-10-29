// Payload validation for the admin's three resources. Each resource describes
// its fields once (see FIELDS below) and the same description serves create,
// where required fields must be present, and edit, where only the fields sent
// are checked but a required one still can't be blanked.
export class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'ValidationError'
    this.status = status
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

/* Postgres rejects a malformed uuid with a type error, which would surface as
   a 500 — a client sending a bad id would look like a server fault. Mount as
   `router.param('id', uuidParam)` so the check happens once per router. */
export function uuidParam(_req, res, next, value) {
  if (!isUuid(value)) return res.status(404).json({ error: 'Not found' })
  next()
}

/** "Ify & Oscar Nwasofer" → "ify-oscar-nwasofer". */
export function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents left behind by NFKD
    .toLowerCase()
    .replace(/['’]/g, '') // "Phil's" → "phils", not "phil-s"
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

/**
 * An image reference: an https URL (Cloudflare Images, normally), or — only
 * while image storage isn't configured — an inline data URI, so the admin
 * still works in local dev.
 */
function imageUrl(value, field, { allowInline }) {
  if (typeof value !== 'string') throw new ValidationError(`${field} must be an image`)
  if (value.startsWith('https://')) {
    if (value.length > 1000) throw new ValidationError(`${field} is too long`)
    return value
  }
  if (allowInline && /^data:image\/[a-z+]+;base64,/i.test(value)) return value
  throw new ValidationError(`${field} must be an uploaded image`)
}

const TYPES = {
  text(value, f) {
    if (typeof value !== 'string' && value !== null) throw new ValidationError(`${f.label} must be text`)
    const v = (value ?? '').trim()
    if (!v) return null
    if (v.length > f.max) throw new ValidationError(`${f.label} is too long (max ${f.max} characters)`)
    return v
  },
  enum(value, f) {
    if (!f.values.includes(value)) throw new ValidationError(`${f.label} must be one of: ${f.values.join(', ')}`)
    return value
  },
  cents(value, f) {
    if (value === null || value === '') return null
    const n = Number(value)
    if (!Number.isInteger(n) || n < 0 || n > 100_000_000) throw new ValidationError(`${f.label} must be a whole number of cents`)
    return n
  },
  date(value, f) {
    if (value === null || value === '') return null
    if (typeof value !== 'string' || !DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
      throw new ValidationError(`${f.label} must be a date (YYYY-MM-DD)`)
    }
    return value
  },
  slug(value, f) {
    if (value === null || value === '') return null
    if (typeof value !== 'string' || !SLUG_RE.test(value) || value.length > 80) {
      throw new ValidationError(`${f.label} may only use lowercase letters, numbers and hyphens`)
    }
    return value
  },
  list(value, f) {
    if (value === null) return []
    if (!Array.isArray(value)) throw new ValidationError(`${f.label} must be a list`)
    const items = value.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean)
    if (items.length > f.maxItems) throw new ValidationError(`${f.label} can have at most ${f.maxItems} items`)
    if (items.some((v) => v.length > f.max)) throw new ValidationError(`Each of ${f.label} must be under ${f.max} characters`)
    return items
  },
  image(value, f, opts) {
    if (value === null || value === '') return null
    return imageUrl(value, f.label, opts)
  },
  uuid(value, f) {
    if (value === null || value === '') return null
    if (!isUuid(value)) throw new ValidationError(`${f.label} is not valid`)
    return value
  },
}

const STATUS = { type: 'enum', label: 'Status', values: ['draft', 'published'] }

export const FIELDS = {
  services: {
    category: { type: 'enum', label: 'Category', values: ['wedding', 'social_corporate'], required: true },
    name: { type: 'text', label: 'Name', max: 120, required: true },
    slug: { type: 'slug', label: 'Link name' },
    description: { type: 'text', label: 'Description', max: 4000 },
    bullets_heading: { type: 'text', label: 'List heading', max: 120 },
    bullets: { type: 'list', label: 'List items', max: 160, maxItems: 12 },
    closing_note: { type: 'text', label: 'Closing note', max: 600 },
    price_prefix: { type: 'text', label: 'Price wording', max: 40 },
    price_from_cents: { type: 'cents', label: 'Starting price' },
    image_url: { type: 'image', label: 'Photo' },
    status: STATUS,
  },
  portfolio: {
    title: { type: 'text', label: 'Title', max: 120, required: true },
    slug: { type: 'slug', label: 'Link name' },
    category: { type: 'enum', label: 'Category', values: ['wedding', 'engagement', 'social', 'corporate'], required: true },
    event_date: { type: 'date', label: 'Event date' },
    location: { type: 'text', label: 'Location', max: 120 },
    summary: { type: 'text', label: 'Summary', max: 1000 },
    cover_photo_id: { type: 'uuid', label: 'Cover photo' },
    status: STATUS,
  },
  testimonials: {
    quote: { type: 'text', label: 'Quote', max: 1200, required: true },
    attribution: { type: 'text', label: 'Name', max: 120, required: true },
    event_label: { type: 'text', label: 'Event', max: 120 },
    status: STATUS,
  },
}

/**
 * Validate `body` against a resource's fields. Returns only the columns that
 * were sent (so an edit touches nothing else), already cleaned. Unknown keys
 * are ignored rather than rejected: the admin sends whole objects back,
 * including read-only ones like id and created_at.
 */
export function validateFields(resource, body, { partial = false, allowInline = false } = {}) {
  const fields = FIELDS[resource]
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('Expected an object')

  const out = {}
  for (const [key, f] of Object.entries(fields)) {
    const present = Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined
    if (!present) {
      if (f.required && !partial) throw new ValidationError(`${f.label} is required`)
      continue
    }
    const value = TYPES[f.type](body[key], f, { allowInline })
    if (f.required && (value === null || value === '')) throw new ValidationError(`${f.label} is required`)
    out[key] = value
  }
  return out
}

/** A photo being added to a gallery. */
export function validatePhoto(p, { allowInline = false } = {}) {
  if (!p || typeof p !== 'object') throw new ValidationError('Each photo must be an object')
  const dim = (v, label) => {
    if (v === undefined || v === null) return null
    const n = Number(v)
    if (!Number.isInteger(n) || n < 1 || n > 20000) throw new ValidationError(`Photo ${label} is not valid`)
    return n
  }
  return {
    image_url: imageUrl(p.image_url, 'Photo', { allowInline }),
    alt: TYPES.text(p.alt ?? null, { label: 'Photo description', max: 300 }),
    width: dim(p.width, 'width'),
    height: dim(p.height, 'height'),
  }
}

/** A list of distinct uuids, as sent by the reorder and batch endpoints. */
export function uuidList(value, label = 'ids') {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || !value.every(isUuid)) throw new ValidationError(`${label} must be a list of ids`)
  if (new Set(value).size !== value.length) throw new ValidationError(`${label} contains duplicates`)
  return value
}
