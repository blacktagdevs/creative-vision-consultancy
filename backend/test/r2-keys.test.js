// The guard in front of every stored-object delete.
//
// CVC shares a bucket with the other BlackTag projects, each under its
// own prefix. So this function is the only thing standing between "delete the
// photo the admin just removed" and "delete something belonging to BKRM".
// It is pure precisely so it can be tested without R2 configured.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { keyFromPublicUrl } from '../src/lib/r2.js'

const OURS = { publicBase: 'https://pub-abc123.r2.dev', prefix: 'cvc' }

describe('which stored objects we are allowed to delete', () => {
  it('recognises one of our own images', () => {
    assert.equal(
      keyFromPublicUrl('https://pub-abc123.r2.dev/cvc/gallery/uuid-1.jpg', OURS),
      'cvc/gallery/uuid-1.jpg'
    )
  })

  it('recognises an event flyer as well as a gallery photo', () => {
    assert.equal(
      keyFromPublicUrl('https://pub-abc123.r2.dev/cvc/events/uuid-2.webp', OURS),
      'cvc/events/uuid-2.webp'
    )
  })

  it('refuses to touch another project in the same bucket', () => {
    // The one that matters. Same bucket, same public base, different prefix.
    assert.equal(
      keyFromPublicUrl('https://pub-abc123.r2.dev/bkrm/gallery/uuid-3.jpg', OURS),
      null
    )
  })

  it('refuses a prefix that merely starts the same way', () => {
    assert.equal(
      keyFromPublicUrl('https://pub-abc123.r2.dev/cvc-archive/x.jpg', OURS),
      null
    )
  })

  it('ignores an inline data URI', () => {
    // What the admin stores today, with no R2 configured. There is no object
    // behind it and nothing to delete.
    assert.equal(keyFromPublicUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg==', OURS), null)
  })

  it('ignores an image hosted somewhere else entirely', () => {
    assert.equal(keyFromPublicUrl('https://images.example.com/cvc/a.jpg', OURS), null)
    assert.equal(keyFromPublicUrl('/cvc/img/local.jpg', OURS), null)
  })

  it('refuses a host that only looks like ours', () => {
    assert.equal(
      keyFromPublicUrl('https://pub-abc123.r2.dev.evil.test/cvc/a.jpg', OURS),
      null
    )
  })

  it('refuses traversal out of the prefix', () => {
    assert.equal(
      keyFromPublicUrl('https://pub-abc123.r2.dev/cvc/../bkrm/a.jpg', OURS),
      null
    )
  })

  it('copes with a trailing slash on the configured base', () => {
    assert.equal(
      keyFromPublicUrl('https://pub-abc123.r2.dev/cvc/gallery/a.jpg', {
        ...OURS,
        publicBase: 'https://pub-abc123.r2.dev/',
      }),
      'cvc/gallery/a.jpg'
    )
  })

  it('drops a query string rather than making it part of the key', () => {
    assert.equal(
      keyFromPublicUrl('https://pub-abc123.r2.dev/cvc/gallery/a.jpg?v=2', OURS),
      'cvc/gallery/a.jpg'
    )
  })

  it('does nothing when storage is not configured', () => {
    // Today's production state: no public base, so no URL is ever ours.
    assert.equal(keyFromPublicUrl('https://pub-abc123.r2.dev/cvc/a.jpg', {}), null)
  })

  it('shrugs off values that are not URLs at all', () => {
    for (const bad of [null, undefined, '', 42, {}]) {
      assert.equal(keyFromPublicUrl(bad, OURS), null)
    }
  })
})
