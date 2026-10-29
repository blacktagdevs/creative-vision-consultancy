// Prerendered pages carry the content as of the last build (hourly, plus every
// push). In the browser each page asks the API again, so an edit she published
// a minute ago shows on the next page load, the way Craft Cart works.
//
// Each route exports the same `load` as both its build-time loader and, via
// this, its clientLoader with `hydrate = true`. The prerendered HTML paints
// first; the live fetch replaces it moments later. If the API can't be
// reached the page simply keeps what was prerendered. A 404 is not a failure
// to reach the API: it means the item was unpublished, so that propagates.
export async function live<T>(load: () => Promise<T>, prerendered: () => Promise<T>): Promise<T> {
  try {
    return await load()
  } catch (err) {
    const e = err as { status?: number; init?: { status?: number } }
    if (e?.status === 404 || e?.init?.status === 404) throw err
    return prerendered()
  }
}
