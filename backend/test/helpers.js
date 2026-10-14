// Shared test harness. Every test file mounts the real Express app on an
// ephemeral port and talks to it over HTTP, so routing, middleware order, and
// the error handler are all exercised — not just the route functions.
//
// Requires a Postgres pointed at by DATABASE_URL. Run via `npm test`, which
// points it at a dedicated test database so a stray TRUNCATE can never touch
// development data.
import { after, before } from 'node:test'
import { app } from '../src/index.js'
import { pool, query } from '../src/db.js'
import { config } from '../src/config.js'
import { issueSession } from '../src/lib/auth.js'
import { resetPublishState } from '../src/lib/publish.js'

/* Hard stop: these tests TRUNCATE every table. If DATABASE_URL is ever pointed
   at a development or production database, that is data loss, so refuse to run
   unless the database name says test. */
const dbName = (config.databaseUrl.split('/').pop() || '').split('?')[0]
if (!/test/i.test(dbName)) {
  throw new Error(
    `Refusing to run tests against database "${dbName}" — the suite truncates ` +
      'every table. Point DATABASE_URL at a database with "test" in its name.'
  )
}

let server
let baseUrl

export function getBaseUrl() {
  return baseUrl
}

/** A valid admin session for the first allowlisted address. */
export function adminToken() {
  return issueSession([...config.admin.emails][0])
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

/** Shorthand for an authenticated admin call. */
export function admin(path, opts = {}) {
  return api(`/admin${path}`, { ...opts, token: adminToken() })
}

/** Wipe every table between tests so cases can't leak into each other. */
export async function resetDb() {
  await query('TRUNCATE services, portfolio_photos, portfolio_items, testimonials, login_tokens CASCADE')
  resetPublishState()
}

export function useServer() {
  before(async () => {
    server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`
    await resetDb()
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
    await pool.end()
  })
}

export const IMG = 'https://media.example.com/cvc/portfolio/a.jpg'

export const newService = (overrides = {}) => ({
  category: 'wedding', name: 'Full Planning', price_from_cents: 600000, ...overrides,
})
export const newGallery = (overrides = {}) => ({ title: 'Ify & Oscar', category: 'wedding', ...overrides })
export const newTestimonial = (overrides = {}) => ({ quote: 'Calm and wonderful.', attribution: 'Ify N.', ...overrides })
