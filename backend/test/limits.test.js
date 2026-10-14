// The caps the owner works within (LIMITS in src/config.js). The layouts are
// designed around this much content, so the API is what holds the line — the
// admin's disabled "Add" button is only a courtesy.
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { LIMITS } from '../src/config.js'
import { admin, resetDb, useServer, newService, newGallery, newTestimonial, IMG } from './helpers.js'

useServer()

async function fill(path, n, make) {
  for (let i = 0; i < n; i++) {
    const res = await admin(path, { method: 'POST', body: make(i) })
    assert.equal(res.status, 201, JSON.stringify(res.body))
  }
}

describe('item caps', () => {
  beforeEach(resetDb)

  it(`stops services at ${LIMITS.services}`, async () => {
    await fill('/services', LIMITS.services, (i) => newService({ name: `Service ${i}` }))
    const over = await admin('/services', { method: 'POST', body: newService({ name: 'One more' }) })
    assert.equal(over.status, 409)
    assert.equal(over.body.code, 'limit_reached')
    assert.equal(over.body.limit, LIMITS.services)

    const list = await admin('/services')
    assert.equal(list.body.count, LIMITS.services)
    assert.equal(list.body.limit, LIMITS.services)
  })

  it(`stops galleries at ${LIMITS.portfolio}`, async () => {
    await fill('/portfolio', LIMITS.portfolio, (i) => newGallery({ title: `Gallery ${i}` }))
    const over = await admin('/portfolio', { method: 'POST', body: newGallery({ title: 'Thirteen' }) })
    assert.equal(over.status, 409)
  })

  it(`stops testimonials at ${LIMITS.testimonials}`, async () => {
    await fill('/testimonials', LIMITS.testimonials, (i) => newTestimonial({ attribution: `Client ${i}` }))
    const over = await admin('/testimonials', { method: 'POST', body: newTestimonial() })
    assert.equal(over.status, 409)
  })

  it('counts drafts toward the cap', async () => {
    await fill('/testimonials', LIMITS.testimonials, () => newTestimonial({ status: 'draft' }))
    const over = await admin('/testimonials', { method: 'POST', body: newTestimonial() })
    assert.equal(over.status, 409)
  })

  it('frees a slot when one is deleted', async () => {
    await fill('/testimonials', LIMITS.testimonials, () => newTestimonial())
    const { body } = await admin('/testimonials')
    assert.equal((await admin(`/testimonials/${body.items[0].id}`, { method: 'DELETE' })).status, 204)
    assert.equal((await admin('/testimonials', { method: 'POST', body: newTestimonial() })).status, 201)
  })

  it('holds the cap when creates arrive at the same moment', async () => {
    // Two clicks on "Add" in quick succession, or two tabs. Without the
    // advisory lock both would read count = limit - 1 and both would insert.
    await fill('/testimonials', LIMITS.testimonials - 1, () => newTestimonial())
    const results = await Promise.all(
      Array.from({ length: 5 }, () => admin('/testimonials', { method: 'POST', body: newTestimonial() }))
    )
    assert.equal(results.filter((r) => r.status === 201).length, 1)
    assert.equal(results.filter((r) => r.status === 409).length, 4)
  })

  it(`stops a gallery at ${LIMITS.photosPerItem} photos, counting removals in the same batch`, async () => {
    const { body: g } = await admin('/portfolio', { method: 'POST', body: newGallery() })
    const photos = (n) => Array.from({ length: n }, () => ({ image_url: IMG }))

    const full = await admin(`/portfolio/${g.id}/photos`, { method: 'POST', body: { add: photos(LIMITS.photosPerItem) } })
    assert.equal(full.status, 200)
    assert.equal(full.body.item.photo_count, LIMITS.photosPerItem)

    const over = await admin(`/portfolio/${g.id}/photos`, { method: 'POST', body: { add: photos(1) } })
    assert.equal(over.status, 409)

    // Swapping one out for one in is fine: the removal lands first.
    const swap = await admin(`/portfolio/${g.id}/photos`, {
      method: 'POST',
      body: { add: photos(1), remove_ids: [full.body.item.photos[0].id] },
    })
    assert.equal(swap.status, 200)
    assert.equal(swap.body.item.photo_count, LIMITS.photosPerItem)
  })
})
