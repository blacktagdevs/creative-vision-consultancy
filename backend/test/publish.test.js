// The rebuild request the API sends GitHub when published content changes.
// fetch is stubbed: these check what would be sent, not GitHub itself.
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { config } from '../src/config.js'
import { publishNow, publishStatus, resetPublishState, schedulePublish } from '../src/lib/publish.js'

const realFetch = globalThis.fetch

describe('site rebuild trigger', () => {
  let calls
  beforeEach(() => {
    resetPublishState()
    calls = []
    config.publish.githubToken = 'test-token'
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init })
      return new Response(null, { status: 204 })
    }
  })
  afterEach(() => {
    globalThis.fetch = realFetch
    config.publish.githubToken = undefined
  })

  it('starts the deploy workflow on main', async () => {
    schedulePublish('services: edited')
    await publishNow()
    assert.equal(calls.length, 1)
    assert.equal(
      calls[0].url,
      'https://api.github.com/repos/blacktagdevs/creative-vision-consultancy/actions/workflows/deploy-pages.yml/dispatches'
    )
    assert.equal(calls[0].init.method, 'POST')
    assert.equal(calls[0].init.headers.Authorization, 'Bearer test-token')
    assert.deepEqual(JSON.parse(calls[0].init.body), { ref: 'main' })
    assert.equal(publishStatus().pending, false)
  })

  it('stays pending when GitHub refuses, so it can be retried', async () => {
    globalThis.fetch = async () => new Response(null, { status: 401 })
    schedulePublish('services: edited')
    await assert.rejects(publishNow(), /401/)
    const status = publishStatus()
    assert.equal(status.pending, true)
    assert.match(status.last_error, /401/)
  })

  it('only logs when no token is configured', async () => {
    config.publish.githubToken = undefined
    const result = await publishNow()
    assert.equal(result.dev, true)
    assert.equal(calls.length, 0)
  })
})
