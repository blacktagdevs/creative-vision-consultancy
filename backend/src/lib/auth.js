// Admin auth primitives: magic-link token hashing + session JWTs + middleware.
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

const SESSION_TTL = '7d'
const TOKEN_TTL_MS = 15 * 60 * 1000 // magic-link valid for 15 minutes

// A raw magic-link token (emailed) and its sha256 hash (stored). We never store
// the raw token, so a DB leak can't be replayed into a login.
export function createMagicToken() {
  const raw = crypto.randomBytes(32).toString('hex')
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  }
}

export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export function issueSession(email) {
  return jwt.sign({ email }, config.admin.sessionSecret, { subject: email, expiresIn: SESSION_TTL })
}

export function verifySession(token) {
  try {
    return jwt.verify(token, config.admin.sessionSecret)
  } catch {
    return null
  }
}

// Express middleware — requires a valid admin session bearer token.
export function requireAdmin(req, res, next) {
  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const claims = token && verifySession(token)
  if (!claims) return res.status(401).json({ error: 'Authentication required' })
  req.admin = { email: claims.email }
  next()
}
