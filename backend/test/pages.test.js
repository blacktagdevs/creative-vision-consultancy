// The Home and About pages' words and photos: what a save stores, what puts
// the original back, what the site reads, and when a replaced photo may be
// deleted from storage.
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { query } from '../src/db.js'
import { config } from '../src/config.js'
import { PAGES } from '../src/lib/pages.js'
import { admin, api, resetDb, useServer, newService, newGallery } from './helpers.js'

useServer()

const save = (page, body) => admin(`/pages/${page}`, { method: 'PATCH', body })
const stored = async (page) => (await api(`/pages/${page}`)).body.content
const storedRows = async () => (await query('SELECT count(*)::int AS n FROM page_content')).rows[0].n

describe('page content', () => {
  beforeEach(resetDb)

  it('is empty until the owner saves something', async () => {
    for (const page of ['home', 'about']) {
      const pub = await api(`/pages/${page}`)
      assert.equal(pub.status, 200)
      assert.deepEqual(pub.body, { page, content: {} })

      const adm = await admin(`/pages/${page}`)
      assert.equal(adm.status, 200)
      assert.deepEqual(adm.body, { page, content: {}, updated_at: null })
    }
  })

  it('only knows the home and about pages', async () => {
    // "constructor" and "__proto__" are names every object answers to.
    for (const page of ['contact', 'Home', 'constructor', '__proto__']) {
      assert.equal((await api(`/pages/${page}`)).status, 404, `public ${page}`)
      assert.equal((await admin(`/pages/${page}`)).status, 404, `admin ${page}`)
      const res = await save(page, { cta_title: 'Hello' })
      assert.equal(res.status, 404, `save ${page}`)
      assert.deepEqual(res.body, { error: 'Not found' })
    }
    assert.equal(await storedRows(), 0)
  })

  it('requires a session', async () => {
    assert.equal((await api('/admin/pages/home')).status, 401)
    assert.equal((await api('/admin/pages/home', { method: 'PATCH', body: { cta_title: 'Hello' } })).status, 401)
    assert.equal((await api('/admin/pages/home', { method: 'PATCH', body: { cta_title: 'Hello' }, token: 'nope' })).status, 401)
    assert.deepEqual(await stored('home'), {})
  })

  it('saves her changes and shows them to the admin and the site', async () => {
    const changes = { hero_title: 'Celebrations, *beautifully* run.', intro_body: 'First paragraph.\n\nSecond paragraph.' }
    const res = await save('home', changes)
    assert.equal(res.status, 200)
    assert.deepEqual(Object.keys(res.body).sort(), ['content', 'page', 'updated_at'])
    assert.equal(res.body.page, 'home')
    assert.deepEqual(res.body.content, changes)
    assert.ok(!Number.isNaN(Date.parse(res.body.updated_at)))

    assert.deepEqual((await admin('/pages/home')).body, res.body)
    // The site gets the fields and nothing else.
    assert.deepEqual((await api('/pages/home')).body, { page: 'home', content: changes })
  })

  it('stores text trimmed', async () => {
    const res = await save('about', { header_title: '  About us \n' })
    assert.equal(res.body.content.header_title, 'About us')
  })

  it('merges a later save into what is already there', async () => {
    await save('home', { hero_title: 'One', hero_eyebrow: 'Atlanta' })
    const res = await save('home', { hero_title: 'Two', cta_title: 'Say hello.' })
    assert.deepEqual(res.body.content, { hero_title: 'Two', hero_eyebrow: 'Atlanta', cta_title: 'Say hello.' })
    assert.deepEqual(await stored('home'), res.body.content)
  })

  it('puts the original back when a field is sent null or blank', async () => {
    await save('home', { hero_title: 'One', hero_eyebrow: 'Two', intro_title: 'Three', cta_title: 'Four' })
    const res = await save('home', { hero_title: null, hero_eyebrow: '', intro_title: ' \n\t ' })
    assert.equal(res.status, 200)
    // The keys are gone, not stored as null: a missing key is what tells the
    // site to show its own wording.
    assert.deepEqual(res.body.content, { cta_title: 'Four' })
    assert.deepEqual(await stored('home'), { cta_title: 'Four' })

    // Clearing a field that was never changed is fine too.
    const again = await save('home', { hero_title: null })
    assert.equal(again.status, 200)
    assert.deepEqual(again.body.content, { cta_title: 'Four' })
  })

  it('ignores keys the page does not have', async () => {
    const res = await save('home', {
      cta_title: 'Kept',
      header_lede: 'An About field',
      page: 'about',
      updated_at: '2020-01-01T00:00:00Z',
      nonsense: { nested: true },
    })
    assert.equal(res.status, 200)
    assert.deepEqual(res.body.content, { cta_title: 'Kept' })
    assert.deepEqual(await stored('about'), {})
  })

  it('answers a save with nothing in it with the page as it stands', async () => {
    for (const body of [{}, { nonsense: 'x' }]) {
      const res = await save('home', body)
      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { page: 'home', content: {}, updated_at: null })
    }
    assert.equal(await storedRows(), 0)

    const { body: first } = await save('home', { cta_title: 'Hello' })
    const res = await save('home', { nonsense: 'x' })
    assert.deepEqual(res.body, first)
  })

  it('keeps home and about apart', async () => {
    // Both pages have a cta_title.
    await save('home', { cta_title: 'From home' })
    await save('about', { cta_title: 'From about', header_lede: 'A line.' })
    assert.deepEqual(await stored('home'), { cta_title: 'From home' })
    assert.deepEqual(await stored('about'), { cta_title: 'From about', header_lede: 'A line.' })

    await save('about', { cta_title: null })
    assert.deepEqual(await stored('home'), { cta_title: 'From home' })
    assert.deepEqual(await stored('about'), { header_lede: 'A line.' })
  })

  it('allows each kind of text up to its limit and no further', async () => {
    const limits = [
      ['home', 'hero_eyebrow', 80, 'Hero label'],
      ['home', 'hero_title', 160, 'Hero heading'],
      ['home', 'hero_image_alt', 300, 'Hero photo description'],
      ['about', 'header_lede', 300, 'Page introduction'],
      ['about', 'story_body', 3000, 'Story text'],
    ]
    for (const [page, key, max, label] of limits) {
      const fits = await save(page, { [key]: 'x'.repeat(max) })
      assert.equal(fits.status, 200, key)

      const over = await save(page, { [key]: 'x'.repeat(max + 1) })
      assert.equal(over.status, 400, key)
      assert.equal(over.body.error, `${label} is too long (max ${max} characters)`)
      assert.equal((await stored(page))[key].length, max, `${key} kept what was there`)
    }
  })

  it('stores nothing from a save with one bad field', async () => {
    const res = await save('home', { hero_title: 'Fine', hero_eyebrow: 'x'.repeat(81), cta_title: 'Also fine' })
    assert.equal(res.status, 400)
    assert.deepEqual(await stored('home'), {})
    assert.equal(await storedRows(), 0)
  })

  it('refuses a photo that is not an uploaded image', async () => {
    for (const bad of ['http://media.example.com/a.jpg', '/images/a.jpg', 'javascript:alert(1)', `https://x.test/${'a'.repeat(1000)}`]) {
      const res = await save('home', { hero_image_url: bad })
      assert.equal(res.status, 400, bad.slice(0, 40))
      assert.match(res.body.error, /^Hero photo (must be an uploaded image|is too long)$/)
    }
    const wrongType = await save('about', { owner_image_url: 42 })
    assert.equal(wrongType.status, 400)
    assert.equal(wrongType.body.error, 'Owner portrait must be an image')
    assert.equal(await storedRows(), 0)

    const ok = await save('home', { hero_image_url: 'https://media.example.com/cvc/pages/hero.jpg' })
    assert.equal(ok.status, 200)
  })

  it('refuses values that are not text', async () => {
    for (const bad of [5, true, ['a'], { a: 1 }]) {
      const res = await save('home', { hero_title: bad })
      assert.equal(res.status, 400)
      assert.equal(res.body.error, 'Hero heading must be text')
    }
  })

  it('refuses a body that is not an object', async () => {
    assert.equal((await save('home', ['hero_title'])).status, 400)
    assert.equal((await save('home', 'hero_title')).status, 400)
    assert.equal(await storedRows(), 0)
  })

  it('keeps every field when saves land at the same moment', async () => {
    // The page has no row yet, so these also race to create it.
    const fields = {
      hero_title: 'One', intro_title: 'Two', services_title: 'Three', portfolio_title: 'Four', cta_title: 'Five',
      teaser_1_title: 'Six', teaser_2_title: 'Seven', teaser_3_title: 'Eight',
    }
    const results = await Promise.all(Object.entries(fields).map(([key, value]) => save('home', { [key]: value })))
    assert.deepEqual(results.map((r) => r.status), Object.keys(fields).map(() => 200))
    assert.deepEqual(await stored('home'), fields)
  })
})

// The site's list (app/lib/pages.ts) and the API's (src/lib/pages.js) are kept
// in step by hand. A key on one side only is a field that saves and never
// shows, or shows and can never be saved, so check them against each other.
describe('page fields', () => {
  const sitePages = fileURLToPath(new URL('../../app/lib/pages.ts', import.meta.url))

  function siteKeys(source, name) {
    const block = new RegExp(`export const ${name} = \\{\\n([\\s\\S]*?)\\n\\}\\n`).exec(source)
    assert.ok(block, `${name} not found in app/lib/pages.ts`)
    return [...block[1].matchAll(/^ {2}(\w+):/gm)].map((m) => m[1])
  }

  // The API can be checked out and tested without the site beside it.
  it('are the same ones the site has', { skip: !existsSync(sitePages) && 'app/lib/pages.ts is not here' }, () => {
    const source = readFileSync(sitePages, 'utf8')
    assert.deepEqual(Object.keys(PAGES.home).sort(), siteKeys(source, 'HOME_DEFAULTS').sort())
    assert.deepEqual(Object.keys(PAGES.about).sort(), siteKeys(source, 'ABOUT_DEFAULTS').sort())
  })

  it('each have a name she would recognise, used once per page', () => {
    for (const [page, fields] of Object.entries(PAGES)) {
      const labels = Object.values(fields).map((f) => f.label)
      assert.ok(labels.every((l) => typeof l === 'string' && l.length > 3), page)
      assert.equal(new Set(labels).size, labels.length, `${page} has two fields with the same name`)
    }
  })
})

// Photos live in Cloudflare Images, which the tests have no account for. As in
// images.test.js, storage is switched on with made-up credentials and the
// calls to Cloudflare are caught; calls to the API under test go through.
describe('page photos in storage', () => {
  const HASH = 'abcHASH123'
  const photo = (id) => `https://imagedelivery.net/${HASH}/${id}/public`
  const A = photo('photo-aaaaaaaa')
  const B = photo('photo-bbbbbbbb')

  const realFetch = globalThis.fetch
  const saved = { ...config.images }
  let deleted
  let uploads

  beforeEach(async () => {
    await resetDb()
    deleted = []
    uploads = []
    Object.assign(config.images, { accountId: 'acct', accountHash: HASH, token: 't' })
    globalThis.fetch = async (url, init = {}) => {
      if (!String(url).startsWith('https://api.cloudflare.com/')) return realFetch(url, init)
      const id = String(url).split('/images/v1/')[1]
      if (init.method === 'DELETE') {
        deleted.push(photo(id))
        return Response.json({ success: true })
      }
      if (init.method === 'POST') {
        uploads.push(JSON.parse(init.body.get('metadata')))
        return Response.json({ success: true, result: { id: 'photo-uploaded' } })
      }
      return Response.json({ success: true, result: { id, meta: { project: 'cvc' } } })
    }
  })
  afterEach(() => {
    globalThis.fetch = realFetch
    Object.assign(config.images, saved)
  })

  it('deletes a photo once a save replaces or clears it', async () => {
    await save('home', { hero_image_url: A })
    await save('home', { hero_image_alt: 'A new description', hero_image_url: A })
    assert.deepEqual(deleted, [], 'saving the same photo again keeps it')

    await save('home', { hero_image_url: B })
    assert.deepEqual(deleted, [A])

    await save('home', { hero_image_url: null })
    assert.deepEqual(deleted, [A, B])
  })

  it('keeps a photo that is still used elsewhere on the pages', async () => {
    await save('home', { hero_image_url: A, intro_image_url: A })
    await save('about', { story_image_url: A })

    await save('home', { hero_image_url: null })
    assert.deepEqual(deleted, [], 'still the intro photo')
    await save('home', { intro_image_url: B })
    assert.deepEqual(deleted, [], 'still on the About page')
    await save('about', { story_image_url: null })
    assert.deepEqual(deleted, [A])
  })

  it('keeps a photo a service or gallery still uses', async () => {
    await admin('/services', { method: 'POST', body: newService({ image_url: A }) })
    const { body: g } = await admin('/portfolio', { method: 'POST', body: newGallery() })
    await admin(`/portfolio/${g.id}/photos`, { method: 'POST', body: { add: [{ image_url: B }] } })

    await save('home', { hero_image_url: A, intro_image_url: B })
    await save('home', { hero_image_url: null, intro_image_url: null })
    assert.deepEqual(deleted, [])
  })

  it('keeps a photo a page still uses when a service or gallery lets go of it', async () => {
    const { body: s } = await admin('/services', { method: 'POST', body: newService({ image_url: A }) })
    const { body: g } = await admin('/portfolio', { method: 'POST', body: newGallery() })
    await admin(`/portfolio/${g.id}/photos`, { method: 'POST', body: { add: [{ image_url: B }] } })
    await save('home', { hero_image_url: A })
    await save('about', { owner_image_url: B })

    assert.equal((await admin(`/services/${s.id}`, { method: 'DELETE' })).status, 204)
    assert.equal((await admin(`/portfolio/${g.id}`, { method: 'DELETE' })).status, 204)
    assert.deepEqual(deleted, [])

    // With nothing else holding them, the pages letting go is what deletes them.
    await save('home', { hero_image_url: null })
    await save('about', { owner_image_url: null })
    assert.deepEqual(deleted, [A, B])
  })

  it('leaves storage alone when a save is refused', async () => {
    await save('home', { hero_image_url: A })
    const res = await save('home', { hero_image_url: null, hero_title: 'x'.repeat(161) })
    assert.equal(res.status, 400)
    assert.deepEqual(deleted, [])
    assert.equal((await stored('home')).hero_image_url, A)
  })

  it('refuses an inline image once storage is configured', async () => {
    const res = await save('home', { hero_image_url: 'data:image/jpeg;base64,AAAA' })
    assert.equal(res.status, 400)
    assert.equal(res.body.error, 'Hero photo must be an uploaded image')
  })

  it('files page uploads under pages', async () => {
    const data = 'data:image/png;base64,AAAA'
    for (const kind of ['pages', 'services', 'portfolio', 'something-else', undefined]) {
      const res = await admin('/upload', { method: 'POST', body: { data, kind } })
      assert.equal(res.status, 200)
      assert.equal(res.body.url, photo('photo-uploaded'))
    }
    assert.deepEqual(uploads.map((u) => u.kind), ['pages', 'services', 'portfolio', 'portfolio', 'portfolio'])
  })
})

// Without storage (a laptop with no Cloudflare keys) photos are kept inline,
// as they are for services and galleries.
describe('page photos without storage', () => {
  beforeEach(resetDb)

  it('accepts an inline image', async () => {
    const inline = 'data:image/jpeg;base64,AAAA'
    const res = await save('about', { owner_image_url: inline })
    assert.equal(res.status, 200)
    assert.equal((await stored('about')).owner_image_url, inline)
  })
})
