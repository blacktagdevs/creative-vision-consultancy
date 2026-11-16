// Each gallery's accent tone: defaults, edits, validation, and the public API.
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { admin, api, resetDb, useServer, newGallery } from './helpers.js'

useServer()

describe('gallery accent', () => {
  beforeEach(resetDb)

  it('defaults to blush', async () => {
    const res = await admin('/portfolio', { method: 'POST', body: newGallery() })
    assert.equal(res.status, 201)
    assert.equal(res.body.accent, 'blush')
  })

  it('can be chosen on create and changed later', async () => {
    const { body: g } = await admin('/portfolio', { method: 'POST', body: newGallery({ accent: 'sage' }) })
    assert.equal(g.accent, 'sage')
    const res = await admin(`/portfolio/${g.id}`, { method: 'PATCH', body: { accent: 'dusk' } })
    assert.equal(res.status, 200)
    assert.equal(res.body.accent, 'dusk')
  })

  it('rejects a tone that is not in the palette', async () => {
    const bad = await admin('/portfolio', { method: 'POST', body: newGallery({ accent: 'neon' }) })
    assert.equal(bad.status, 400)
    const { body: g } = await admin('/portfolio', { method: 'POST', body: newGallery() })
    const res = await admin(`/portfolio/${g.id}`, { method: 'PATCH', body: { accent: '#ff0000' } })
    assert.equal(res.status, 400)
    assert.equal((await admin(`/portfolio/${g.id}`, { method: 'PATCH', body: { accent: null } })).status, 400)
  })

  it('is part of the public gallery list and detail', async () => {
    const { body: g } = await admin('/portfolio', {
      method: 'POST', body: newGallery({ accent: 'clay', status: 'published' }),
    })
    assert.equal((await api('/portfolio')).body.items[0].accent, 'clay')
    assert.equal((await api(`/portfolio/${g.slug}`)).body.item.accent, 'clay')
  })
})
