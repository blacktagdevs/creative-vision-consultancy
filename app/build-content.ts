// Build-time only: the published gallery slugs, read once per build by both
// app/routes.ts and react-router.config.ts. Never imported by the app itself.
let cached: Promise<string[]> | undefined

export function publishedGallerySlugs(): Promise<string[]> {
  cached ??= (async () => {
    const api = (process.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')
    const res = await fetch(`${api}/portfolio`)
    if (!res.ok) throw new Error(`Build: GET ${api}/portfolio answered ${res.status}`)
    const { items } = (await res.json()) as { items: { slug: string }[] }
    return items.map((i) => i.slug)
  })()
  return cached
}
