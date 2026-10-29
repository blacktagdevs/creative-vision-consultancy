// Pure helpers that the routes lean on.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { originAllowed } from '../src/config.js'
import { slugify, validateFields } from '../src/lib/validation.js'

describe('slugify', () => {
  it('makes readable link names', () => {
    assert.equal(slugify('Ogechi & Richard Flowers'), 'ogechi-richard-flowers')
    assert.equal(slugify('Phil’s Birthday Party'), 'phils-birthday-party')
    assert.equal(slugify('  Umu Igbo Unite Gala!  '), 'umu-igbo-unite-gala')
    assert.equal(slugify('Café Soirée'), 'cafe-soiree')
    assert.equal(slugify('&&&'), '')
  })
})

describe('allowed origins', () => {
  const allowed = ['https://creativevisionconsultancy.com', 'https://*.cvc-website.pages.dev']

  it('allows the site and any one-level preview subdomain', () => {
    assert.ok(originAllowed('https://creativevisionconsultancy.com', allowed))
    assert.ok(originAllowed('https://abc123.cvc-website.pages.dev', allowed))
  })

  it('refuses lookalikes', () => {
    assert.ok(!originAllowed('https://cvc-website.pages.dev.evil.com', allowed))
    assert.ok(!originAllowed('https://a.b.cvc-website.pages.dev', allowed))
    assert.ok(!originAllowed('https://evilcvc-website.pages.dev', allowed))
    assert.ok(!originAllowed('http://abc.cvc-website.pages.dev', allowed))
    assert.ok(!originAllowed(undefined, allowed))
  })
})

describe('field validation', () => {
  it('ignores read-only keys the admin echoes back', () => {
    const out = validateFields('testimonials', { quote: 'q', attribution: 'a', id: 'x', created_at: 'y' })
    assert.deepEqual(Object.keys(out).sort(), ['attribution', 'quote'])
  })

  it('only accepts inline images when storage is not configured', () => {
    const body = { category: 'wedding', name: 'x', image_url: 'data:image/jpeg;base64,AAAA' }
    assert.throws(() => validateFields('services', body, { allowInline: false }), /uploaded image/)
    assert.equal(validateFields('services', body, { allowInline: true }).image_url, body.image_url)
  })
})
