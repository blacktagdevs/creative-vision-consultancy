// The fence around image deletes. CVC shares its Cloudflare Images account
// with other BlackTag sites, so these are the only things standing between
// "delete the photo she just removed" and "delete someone else's photo".
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { config } from '../src/config.js'
import { deleteImages, imageIdFromUrl } from '../src/lib/images.js'

const HASH = 'abcHASH123'
const OURS = { accountHash: HASH }
const ID = '2cdc28f0-017a-49c4-9ed7-87056c83901f'

describe('which image URLs are ours', () => {
  it('recognises one of our delivery URLs in any variant', () => {
    assert.equal(imageIdFromUrl(`https://imagedelivery.net/${HASH}/${ID}/public`, OURS), ID)
    assert.equal(imageIdFromUrl(`https://imagedelivery.net/${HASH}/${ID}/cvcthumb`, OURS), ID)
  })

  it('refuses another account, placeholders, data URIs and lookalikes', () => {
    assert.equal(imageIdFromUrl(`https://imagedelivery.net/otherHASH/${ID}/public`, OURS), null)
    assert.equal(imageIdFromUrl('https://images.unsplash.com/photo-1519741497674?w=1600', OURS), null)
    assert.equal(imageIdFromUrl('data:image/jpeg;base64,AAAA', OURS), null)
    assert.equal(imageIdFromUrl(`https://imagedelivery.net.evil.com/${HASH}/${ID}/public`, OURS), null)
    assert.equal(imageIdFromUrl(`https://imagedelivery.net/${HASH}/../x/public`, OURS), null)
    assert.equal(imageIdFromUrl(`https://imagedelivery.net/${HASH}/${ID}/public?x=1`, OURS), null)
  })

  it('refuses everything when no account is configured', () => {
    assert.equal(imageIdFromUrl(`https://imagedelivery.net/${HASH}/${ID}/public`, {}), null)
  })
})

describe('deleting images', () => {
  const realFetch = globalThis.fetch
  const saved = { ...config.images }
  let calls

  beforeEach(() => {
    calls = []
    Object.assign(config.images, { accountId: 'acct', accountHash: HASH, token: 't' })
  })
  afterEach(() => {
    globalThis.fetch = realFetch
    Object.assign(config.images, saved)
  })

  function stub(meta) {
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url, method: init.method || 'GET' })
      if ((init.method || 'GET') === 'GET') {
        return Response.json({ success: true, result: { id: ID, meta } })
      }
      return Response.json({ success: true })
    }
  }

  it('deletes an image tagged as ours', async () => {
    stub({ project: 'cvc' })
    const r = await deleteImages([`https://imagedelivery.net/${HASH}/${ID}/public`])
    assert.deepEqual(r, { deleted: 1, skipped: 0, failed: 0 })
    assert.deepEqual(calls.map((c) => c.method), ['GET', 'DELETE'])
  })

  it('refuses an image in our account that another site uploaded', async () => {
    stub({ project: 'bgs' })
    const r = await deleteImages([`https://imagedelivery.net/${HASH}/${ID}/public`])
    assert.deepEqual(r, { deleted: 0, skipped: 1, failed: 0 })
    assert.ok(!calls.some((c) => c.method === 'DELETE'))
  })

  it('never calls out for URLs that are not ours', async () => {
    stub({ project: 'cvc' })
    await deleteImages(['https://images.unsplash.com/photo-1?w=1', 'data:image/png;base64,AA'])
    assert.equal(calls.length, 0)
  })

  it('does not throw when Cloudflare is unreachable', async () => {
    globalThis.fetch = async () => { throw new Error('network down') }
    const r = await deleteImages([`https://imagedelivery.net/${HASH}/${ID}/public`])
    assert.equal(r.failed, 1)
  })
})
