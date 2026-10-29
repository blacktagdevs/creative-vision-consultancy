// Centralized env access. Fail fast on missing required config at boot.
import 'dotenv/config' // loads .env locally; no-op on Railway (env injected)

function required(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

function optional(name, fallback = undefined) {
  const v = process.env[name]
  return v === undefined || v === '' ? fallback : v
}

function list(value) {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export const config = {
  port: Number(optional('PORT', '8080')),
  databaseUrl: required('DATABASE_URL'),

  // Comma-separated: https://blacktagdevs.github.io while the site lives on the
  // GitHub Pages project URL, then the custom domain. An entry like
  // `https://*.example.com` matches any one subdomain.
  allowedOrigins: list(required('ALLOWED_ORIGIN')),

  admin: {
    // Normalized lowercase set of allowlisted admin emails.
    emails: new Set(list(optional('ADMIN_EMAILS', '')).map((e) => e.toLowerCase())),
    sessionSecret: required('SESSION_JWT_SECRET'),
    appUrl: required('ADMIN_APP_URL'),
  },

  // Dev-only escape hatch: skip the magic-link round-trip and issue an admin
  // session directly, so the dashboard is reachable on localhost without email.
  // Hard-gated: never active when NODE_ENV=production, regardless of the flag.
  devAdminBypass:
    optional('DEV_ADMIN_BYPASS') === 'true' && optional('NODE_ENV') !== 'production',

  loops: {
    apiKey: optional('LOOPS_API_KEY'),
    magicLinkTemplateId: optional('LOOPS_MAGIC_LINK_TEMPLATE_ID'),
  },

  // Cloudflare Images for service + portfolio photos (shared BlackTag account;
  // CVC uploads are tagged project=cvc). Unset means uploads are refused in
  // production and kept inline only in local dev.
  images: {
    accountId: optional('CF_ACCOUNT_ID'),
    accountHash: optional('CF_IMAGES_ACCOUNT_HASH'), // from imagedelivery.net/<hash>/...
    token: optional('CF_IMAGES_TOKEN'), // API token with Cloudflare Images: Edit
  },
}

// How many of each thing the admin can hold. These are layout limits as much
// as storage ones: the services page and the gallery grid are designed around
// roughly this much content. Drafts count, so the cap she sees is the real one.
export const LIMITS = Object.freeze({
  services: 10,
  portfolio: 12,
  photosPerItem: 40,
  testimonials: 8,
})

export function isAdminEmail(email) {
  return typeof email === 'string' && config.admin.emails.has(email.trim().toLowerCase())
}

/** Exact match, or a single-label wildcard like `https://*.preview.example.com`. */
export function originAllowed(origin, allowed = config.allowedOrigins) {
  if (typeof origin !== 'string' || !origin) return false
  return allowed.some((entry) => {
    if (!entry.includes('*.')) return entry === origin
    const [scheme, host] = entry.split('*.')
    if (!origin.startsWith(scheme)) return false
    const rest = origin.slice(scheme.length)
    const dot = rest.indexOf('.')
    return dot > 0 && rest.slice(dot + 1) === host && !rest.slice(0, dot).includes('/')
  })
}
