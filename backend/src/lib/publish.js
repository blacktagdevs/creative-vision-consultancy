// Rebuilds the public site after published content changes.
//
// The public pages are prerendered and served by GitHub Pages, so an edit in
// the admin isn't visible until the deploy workflow builds the site again.
// Every admin write that touches published content calls schedulePublish().
// Calls are debounced: the owner tends to make a run of edits (reorder, fix a
// typo, swap a photo), and one build at the end beats a queue of five.
// maxWait stops a long editing session from postponing the build forever.
//
// State is in memory. A restart while a build is pending drops it. That's a
// fair trade for one Railway instance: the admin shows "pending", and her next
// save, or the "Publish now" button, schedules it again.
import { config } from '../config.js'

const MAX_WAIT_MS = 5 * 60 * 1000

const state = {
  pendingSince: null, // first unpublished change in the current batch
  scheduledFor: null,
  lastTriggeredAt: null,
  lastError: null,
  reasons: [],
}
let timer = null

export function publishStatus() {
  return {
    pending: state.pendingSince !== null,
    scheduled_for: state.scheduledFor,
    last_triggered_at: state.lastTriggeredAt,
    last_error: state.lastError,
    hook_configured: Boolean(config.publish.githubToken),
  }
}

/** Ask for a rebuild soon. `reason` is logged so a surprise build can be traced. */
export function schedulePublish(reason) {
  const now = Date.now()
  if (state.pendingSince === null) state.pendingSince = now
  if (reason && state.reasons.length < 20) state.reasons.push(reason)

  // Tests drive publishNow() directly and must not leave timers running.
  if (process.env.NODE_ENV === 'test') return

  const fireAt = Math.min(now + config.publish.debounceMs, state.pendingSince + MAX_WAIT_MS)
  state.scheduledFor = new Date(fireAt).toISOString()
  clearTimeout(timer)
  timer = setTimeout(() => {
    publishNow().catch(() => {}) // publishNow records its own failure
  }, Math.max(0, fireAt - now))
  timer.unref?.() // never hold the process open just for this
}

/** Start the deploy workflow now, flushing anything pending. */
export async function publishNow() {
  clearTimeout(timer)
  timer = null
  const reasons = state.reasons.splice(0)
  state.pendingSince = null
  state.scheduledFor = null

  const { githubToken, githubRepo, workflow, ref } = config.publish
  if (!githubToken) {
    console.log(`[publish:dev] would rebuild site (${reasons.join('; ') || 'manual'})`)
    state.lastTriggeredAt = new Date().toISOString()
    state.lastError = null
    return { triggered: false, dev: true }
  }

  try {
    // workflow_dispatch: the token only needs "Actions: write" on this one
    // repo, which is narrower than what a repository_dispatch would take.
    const res = await fetch(
      `https://api.github.com/repos/${githubRepo}/actions/workflows/${workflow}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'cvc-api',
        },
        body: JSON.stringify({ ref }),
      }
    )
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
    state.lastTriggeredAt = new Date().toISOString()
    state.lastError = null
    console.log(`[publish] rebuild requested (${reasons.join('; ') || 'manual'})`)
    return { triggered: true }
  } catch (err) {
    // Leave it pending so the admin shows it and the button can retry.
    state.pendingSince = state.pendingSince ?? Date.now()
    state.lastError = err.message
    console.error('[publish] rebuild request failed:', err.message)
    throw err
  }
}

/** Test-only: forget everything between cases. */
export function resetPublishState() {
  clearTimeout(timer)
  timer = null
  Object.assign(state, { pendingSince: null, scheduledFor: null, lastTriggeredAt: null, lastError: null, reasons: [] })
}
