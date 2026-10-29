// `requireAdmin` — the gate in front of every admin route (src/lib/auth.js).
//
// A *missing* token is covered by the "requires a session" cases elsewhere.
// These are the tokens that actually turn up in the wild: a garbled one, one
// signed with the wrong key, and one from a tab left open over a weekend.
// All three must land on 401, and none of them may reach a route handler.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { config } from '../src/config.js'
import { adminToken, getBaseUrl, useServer } from './helpers.js'

useServer()

/** GET /admin/services with a literal Authorization header, prefix and all. */
async function withAuthHeader(header) {
  const res = await fetch(`${getBaseUrl()}/admin/services`, {
    headers: header === null ? {} : { Authorization: header },
  })
  return res.status
}

describe('admin session tokens', () => {
  it('lets a valid session through', async () => {
    assert.equal(await withAuthHeader(`Bearer ${adminToken()}`), 200)
  })

  it('refuses a token that is not a token', async () => {
    assert.equal(await withAuthHeader('Bearer not-a-jwt'), 401)
  })

  it('refuses a token that is shaped right but signed by someone else', async () => {
    // What a forged session looks like: correct algorithm, correct claims,
    // wrong key. Only the signature check separates it from a real one.
    const forged = jwt.sign({ email: 'admin@test.local' }, 'not-the-real-secret', {
      subject: 'admin@test.local',
      expiresIn: '7d',
    })
    assert.equal(await withAuthHeader(`Bearer ${forged}`), 401)
  })

  it('refuses an expired session', async () => {
    // Sessions last 7 days with no refresh and no revocation list, so expiry
    // is the only thing that ever ends one. If this check goes, nothing does.
    const stale = jwt.sign({ email: 'admin@test.local' }, config.admin.sessionSecret, {
      subject: 'admin@test.local',
      expiresIn: '-1s',
    })
    assert.equal(await withAuthHeader(`Bearer ${stale}`), 401)
  })

  it('refuses a valid token sent without the Bearer prefix', async () => {
    assert.equal(await withAuthHeader(adminToken()), 401)
  })

  it('refuses a lowercase bearer prefix', async () => {
    // Documenting deliberate strictness rather than arguing for it: the admin
    // SPA is the only client, and it sends the capitalised form.
    assert.equal(await withAuthHeader(`bearer ${adminToken()}`), 401)
  })

  it('refuses an empty Bearer', async () => {
    assert.equal(await withAuthHeader('Bearer '), 401)
  })

  it('refuses a missing header outright', async () => {
    assert.equal(await withAuthHeader(null), 401)
  })
})
