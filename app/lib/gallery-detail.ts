import { data } from 'react-router'
import { getJson, type Photo, type PortfolioItem } from './api'
import { PORTFOLIO_CATEGORY_LABEL } from './format'
import { pageMeta } from './site'

// One gallery's page data and <head> tags, shared by both versions of the
// gallery page: routes/gallery-item.tsx (prerendered) and
// routes/gallery-item-live.tsx (browser only). See app/routes.ts for which one
// a build uses.
export async function loadGallery(slug: string) {
  try {
    const [detail, list] = await Promise.all([
      getJson<{ item: PortfolioItem; photos: Photo[] }>(`/portfolio/${encodeURIComponent(slug)}`),
      getJson<{ items: PortfolioItem[] }>('/portfolio'),
    ])
    // The next gallery in her chosen order, wrapping round, for the footer link.
    const at = list.items.findIndex((i) => i.id === detail.item.id)
    const next = list.items.length > 1 ? list.items[(at + 1) % list.items.length] : null
    return { ...detail, next }
  } catch (err) {
    if ((err as { status?: number }).status === 404) throw data('Not found', { status: 404 })
    throw err
  }
}

export type GalleryData = Awaited<ReturnType<typeof loadGallery>>

export function galleryMeta(gallery: GalleryData | undefined, slug: string | undefined) {
  if (!gallery) return [{ title: 'Not found' }]
  const { item } = gallery
  const description =
    item.summary ||
    `${item.title} — a ${PORTFOLIO_CATEGORY_LABEL[item.category].toLowerCase()} planned by Creative Vision Consultancy.`
  return pageMeta(item.title, description, `/gallery/${slug}`)
}
