// Passwordless admin login: an allowlisted email gets a one-time link, the link
// becomes a 7-day session. Lifted from Craft Cart, which took it from BKRM.
import { Router } from 'express'
import { query } from '../db.js'
import { config, isAdminEmail } from '../config.js'
import { wrap } from '../lib/http.js'
import { sendMagicLink } from '../lib/mailer.js'
import { imagesConfigured } from '../lib/images.js'
import { createMagicToken, hashToken, issueSession, requireAdmin } from '../lib/auth.js'

export const authRouter = Router()

// POST /admin/auth/request { email } — email a magic link if allowlisted.
// Always responds 200 with the same body so emails can't be enumerated.
authRouter.post('/auth/request', wrap(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const generic = { ok: true, message: 'If that email is authorized, a login link is on its way.' }

  if (!isAdminEmail(email)) return res.json(generic)

  const { raw, hash, expiresAt } = createMagicToken()
  await query(
    'INSERT INTO login_tokens (email, token_hash, expires_at) VALUES ($1, $2, $3)',
    [email, hash, expiresAt]
  )

  // Verify link points back at this API; it then redirects to the admin SPA.
  const base = `${req.protocol}://${req.get('host')}`
  await sendMagicLink(email, `${base}/admin/auth/verify?token=${raw}`)

  res.json(generic)
}))

// GET /admin/auth/verify?token=... — consume a magic link, issue a session,
// hand it to the SPA via URL fragment (fragments aren't sent to servers/logs).
authRouter.get('/auth/verify', wrap(async (req, res) => {
  const raw = typeof req.query.token === 'string' ? req.query.token : ''
  const fail = () => res.redirect(`${config.admin.appUrl}#error=invalid_or_expired`)
  if (!raw) return fail()

  // Claim the token in the same statement that checks it, so the same link
  // opened twice at once (mail scanners do this) can't mint two sessions.
  const { rows } = await query(
    `UPDATE login_tokens SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING email`,
    [hashToken(raw)]
  )
  const token = rows[0]
  if (!token || !isAdminEmail(token.email)) return fail()

  res.redirect(`${config.admin.appUrl}#token=${issueSession(token.email)}`)
}))

// POST /admin/auth/dev-login — DEV ONLY. Skips the magic-link round-trip and
// issues a session for an allowlisted admin. Hard-gated: 404 in production (see
// config.devAdminBypass).
authRouter.post('/auth/dev-login', (req, res) => {
  if (!config.devAdminBypass) return res.status(404).json({ error: 'Not found' })

  const requested = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const email = requested && isAdminEmail(requested) ? requested : [...config.admin.emails][0]
  if (!email) return res.status(409).json({ error: 'No admin emails configured' })

  console.warn(`[DEV_ADMIN_BYPASS] Issued admin session for ${email} without a magic link`)
  res.json({ token: issueSession(email), email })
})

// GET /admin/me — cheap token check so the SPA can tell a live session from a
// stale one in localStorage before rendering the dashboard.
authRouter.get('/me', requireAdmin, (req, res) => {
  res.json({ email: req.admin.email, storage: imagesConfigured() ? 'cloudflare-images' : 'inline' })
})
