import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { config, originAllowed } from './config.js'
import { ValidationError } from './lib/validation.js'
import { publicRouter } from './routes/public.js'
import { authRouter } from './routes/auth.js'
import { adminRouter } from './routes/admin.js'

const app = express()
app.set('trust proxy', 1) // hosted behind a proxy; needed for rate-limit + req.protocol

// CORS for the site and its Cloudflare preview deploys (different origins from
// this API). The prerender build fetches server-side, so it needs no CORS.
app.use(cors({ origin: (origin, cb) => cb(null, originAllowed(origin)) }))

// Generous because images arrive as base64 data URIs (downscaled client-side)
// before being handed to Cloudflare Images.
app.use(express.json({ limit: '8mb' }))

app.get('/health', (_req, res) => res.status(200).json({ ok: true }))

app.use(publicRouter)

// Throttle magic-link requests to blunt abuse / email bombing.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false })
app.use('/admin/auth/request', authLimiter)
app.use('/admin', authRouter)
app.use('/admin', adminRouter)

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

// Fallback error handler — never leak internals. Express identifies these by
// arity, so the unused fourth parameter has to stay.
app.use((err, _req, res, _next) => {
  if (err instanceof ValidationError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.limit ? { limit: err.limit } : {}),
    })
  }
  // Unique violation: in practice, a link name (slug) another item already uses.
  if (err.code === '23505') {
    return res.status(409).json({ error: 'That link name is already used by another item.' })
  }
  // Malformed JSON body from express.json().
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' })
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' })

  console.error('Unhandled error:', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

// Exported so tests can mount the real app on an ephemeral port. The server
// only starts when this file is the entry point, not when it's imported.
export { app }

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(config.port, () => {
    console.log(`CVC backend listening on :${config.port}`)
  })
}
