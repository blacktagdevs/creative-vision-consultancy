// Create, edit, reorder, and delete for the managed resources, and what the
// public API shows as a result.
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { query } from '../src/db.js'
import { publishStatus } from '../src/lib/publish.js'
import { admin, api, resetDb, useServer, newService, newGallery, newTestimonial, IMG } from './helpers.js'

useServer()

describe('admin resources', () => {
  beforeEach(resetDb)

  it('requires a session', async () => {
    for (const path of ['/admin/services', '/admin/portfolio', '/admin/testimonials', '/admin/publish-status']) {
      assert.equal((await api(path)).status, 401, path)
    }
  })

  it('names a link from the title and keeps it unique', async () => {
    const a = await admin('/portfolio', { method: 'POST', body: newGallery({ title: 'Phil’s Birthday Party' }) })
    const b = await admin('/portfolio', { method: 'POST', body: newGallery({ title: 'Phil’s Birthday Party' }) })
    assert.equal(a.body.slug, 'phils-birthday-party')
    assert.equal(b.body.slug, 'phils-birthday-party-2')
  })

  it('refuses a link name that is already taken', async () => {
    await admin('/services', { method: 'POST', body: newService({ name: 'Consulting' }) })
    const other = await admin('/services', { method: 'POST', body: newService({ name: 'Other' }) })
    const res = await admin(`/services/${other.body.id}`, { method: 'PATCH', body: { slug: 'consulting' } })
    assert.equal(res.status, 409)
  })

  it('rejects missing required fields and bad values with a readable message', async () => {
    const noName = await admin('/services', { method: 'POST', body: { category: 'wedding' } })
    assert.equal(noName.status, 400)
    assert.match(noName.body.error, /Name is required/)

    const badCat = await admin('/services', { method: 'POST', body: newService({ category: 'funeral' }) })
    assert.equal(badCat.status, 400)

    const { body: s } = await admin('/services', { method: 'POST', body: newService() })
    const blanked = await admin(`/services/${s.id}`, { method: 'PATCH', body: { name: '   ' } })
    assert.equal(blanked.status, 400)
  })

  it('edits only the fields sent', async () => {
    const { body: s } = await admin('/services', {
      method: 'POST',
      body: newService({ bullets: ['One', 'Two'], description: 'Original' }),
    })
    const res = await admin(`/services/${s.id}`, { method: 'PATCH', body: { price_from_cents: 650000 } })
    assert.equal(res.status, 200)
    assert.equal(res.body.price_from_cents, 650000)
    assert.equal(res.body.description, 'Original')
    assert.deepEqual(res.body.bullets, ['One', 'Two'])
  })

  it('hides drafts from the public API', async () => {
    await admin('/services', { method: 'POST', body: newService({ name: 'Live', status: 'published' }) })
    await admin('/services', { method: 'POST', body: newService({ name: 'Hidden', status: 'draft' }) })
    await admin('/testimonials', { method: 'POST', body: newTestimonial({ status: 'draft' }) })

    const pub = await api('/services')
    assert.deepEqual(pub.body.services.map((s) => s.name), ['Live'])
    assert.equal(pub.body.services[0].status, undefined)
    assert.equal((await api('/testimonials')).body.testimonials.length, 0)
  })

  it('hides a draft gallery page, and shows it once published', async () => {
    const { body: g } = await admin('/portfolio', { method: 'POST', body: newGallery() })
    assert.equal((await api(`/portfolio/${g.slug}`)).status, 404)
    await admin(`/portfolio/${g.id}`, { method: 'PATCH', body: { status: 'published' } })
    assert.equal((await api(`/portfolio/${g.slug}`)).status, 200)
  })

  it('reorders to exactly the list sent', async () => {
    const ids = []
    for (const name of ['A', 'B', 'C']) {
      ids.push((await admin('/services', { method: 'POST', body: newService({ name, status: 'published' }) })).body.id)
    }
    const res = await admin('/services/order', { method: 'PUT', body: { ids: [ids[2], ids[0], ids[1]] } })
    assert.equal(res.status, 200)
    assert.deepEqual((await api('/services')).body.services.map((s) => s.name), ['C', 'A', 'B'])
  })

  it('refuses a reorder from a stale screen', async () => {
    const a = (await admin('/services', { method: 'POST', body: newService({ name: 'A' }) })).body.id
    await admin('/services', { method: 'POST', body: newService({ name: 'B' }) })
    // She opened the page when only A existed; B was added since.
    const res = await admin('/services/order', { method: 'PUT', body: { ids: [a] } })
    assert.equal(res.status, 409)
  })

  it('puts a new gallery first and a new service last', async () => {
    await admin('/portfolio', { method: 'POST', body: newGallery({ title: 'Older', status: 'published' }) })
    await admin('/portfolio', { method: 'POST', body: newGallery({ title: 'Newer', status: 'published' }) })
    assert.deepEqual((await api('/portfolio')).body.items.map((i) => i.title), ['Newer', 'Older'])

    await admin('/services', { method: 'POST', body: newService({ name: 'First', status: 'published' }) })
    await admin('/services', { method: 'POST', body: newService({ name: 'Second', status: 'published' }) })
    assert.deepEqual((await api('/services')).body.services.map((s) => s.name), ['First', 'Second'])
  })

  it('deleting a gallery removes its photos', async () => {
    const { body: g } = await admin('/portfolio', { method: 'POST', body: newGallery() })
    await admin(`/portfolio/${g.id}/photos`, { method: 'POST', body: { add: [{ image_url: IMG }, { image_url: IMG }] } })
    assert.equal((await admin(`/portfolio/${g.id}`, { method: 'DELETE' })).status, 204)
    const { rows } = await query('SELECT count(*)::int AS n FROM portfolio_photos')
    assert.equal(rows[0].n, 0)
  })

  it('keeps event dates as the day she entered', async () => {
    // A JS Date at local midnight serialises as the previous day in UTC.
    const { body: g } = await admin('/portfolio', { method: 'POST', body: newGallery({ event_date: '2025-06-14' }) })
    assert.equal(g.event_date, '2025-06-14')
  })

  it('returns 404 for an unknown or malformed id', async () => {
    assert.equal((await admin('/services/00000000-0000-0000-0000-000000000000')).status, 404)
    assert.equal((await admin('/services/not-a-uuid')).status, 404)
  })
})

describe('gallery photos', () => {
  beforeEach(resetDb)

  it('uses the chosen cover, else the first photo', async () => {
    const { body: g } = await admin('/portfolio', { method: 'POST', body: newGallery({ status: 'published' }) })
    const { body } = await admin(`/portfolio/${g.id}/photos`, {
      method: 'POST',
      body: { add: [{ image_url: 'https://x.test/1.jpg' }, { image_url: 'https://x.test/2.jpg' }] },
    })
    assert.equal((await api('/portfolio')).body.items[0].cover_url, 'https://x.test/1.jpg')

    await admin(`/portfolio/${g.id}`, { method: 'PATCH', body: { cover_photo_id: body.item.photos[1].id } })
    assert.equal((await api('/portfolio')).body.items[0].cover_url, 'https://x.test/2.jpg')
  })

  it('refuses a cover from another gallery', async () => {
    const { body: a } = await admin('/portfolio', { method: 'POST', body: newGallery({ title: 'A' }) })
    const { body: b } = await admin('/portfolio', { method: 'POST', body: newGallery({ title: 'B' }) })
    const added = await admin(`/portfolio/${b.id}/photos`, { method: 'POST', body: { add: [{ image_url: IMG }] } })
    const res = await admin(`/portfolio/${a.id}`, { method: 'PATCH', body: { cover_photo_id: added.body.item.photos[0].id } })
    assert.equal(res.status, 400)
  })

  it('reorders photos and edits a description', async () => {
    const { body: g } = await admin('/portfolio', { method: 'POST', body: newGallery({ status: 'published' }) })
    const { body } = await admin(`/portfolio/${g.id}/photos`, {
      method: 'POST',
      body: { add: [{ image_url: 'https://x.test/1.jpg' }, { image_url: 'https://x.test/2.jpg' }] },
    })
    const [p1, p2] = body.item.photos
    assert.equal((await admin(`/portfolio/${g.id}/photos/order`, { method: 'PUT', body: { ids: [p2.id, p1.id] } })).status, 200)
    const alt = await admin(`/portfolio/${g.id}/photos/${p1.id}`, { method: 'PATCH', body: { alt: 'First dance' } })
    assert.equal(alt.body.alt, 'First dance')

    const pub = await api(`/portfolio/${g.slug}`)
    assert.deepEqual(pub.body.photos.map((p) => p.image_url), ['https://x.test/2.jpg', 'https://x.test/1.jpg'])
    assert.equal(pub.body.photos[1].alt, 'First dance')
  })

  it('rejects a photo that is not an image URL', async () => {
    const { body: g } = await admin('/portfolio', { method: 'POST', body: newGallery() })
    const res = await admin(`/portfolio/${g.id}/photos`, {
      method: 'POST',
      body: { add: [{ image_url: 'javascript:alert(1)' }] },
    })
    assert.equal(res.status, 400)
  })
})

describe('publishing', () => {
  beforeEach(resetDb)

  it('editing a draft does not rebuild the site', async () => {
    const { body: s } = await admin('/services', { method: 'POST', body: newService({ status: 'draft' }) })
    await admin(`/services/${s.id}`, { method: 'PATCH', body: { name: 'Renamed' } })
    assert.equal(publishStatus().pending, false)
  })

  it('publishing, editing published, and unpublishing all rebuild', async () => {
    const { body: s } = await admin('/services', { method: 'POST', body: newService({ status: 'draft' }) })

    await admin(`/services/${s.id}`, { method: 'PATCH', body: { status: 'published' } })
    assert.equal(publishStatus().pending, true)
    assert.equal((await admin('/publish', { method: 'POST' })).body.pending, false)

    await admin(`/services/${s.id}`, { method: 'PATCH', body: { status: 'draft' } })
    assert.equal(publishStatus().pending, true)
  })

  it('deleting a published item rebuilds', async () => {
    const { body: t } = await admin('/testimonials', { method: 'POST', body: newTestimonial({ status: 'published' }) })
    await admin('/publish', { method: 'POST' })
    await admin(`/testimonials/${t.id}`, { method: 'DELETE' })
    assert.equal(publishStatus().pending, true)
  })
})
