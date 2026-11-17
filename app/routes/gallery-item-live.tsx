import type { ClientLoaderFunctionArgs, MetaFunction } from 'react-router'
import { useLoaderData } from 'react-router'
import { GalleryPage } from '~/components/GalleryPage'
import { galleryMeta, loadGallery, type GalleryData } from '~/lib/gallery-detail'

// The gallery page for a build that had no published galleries to prerender.
// With ssr:false a route with a build-time `loader` needs at least one path to
// prerender, so this version has none: it fetches in the browser only. Without
// it, a gallery published after such a build would 404 until the next
// rebuild, which GitHub can delay by hours.
//
// Typed by hand rather than from ./+types: routes.ts registers only one of the
// two gallery routes per build, so typegen only ever writes types for one.
export function clientLoader({ params }: ClientLoaderFunctionArgs) {
  return loadGallery(params.slug ?? '')
}
// Run on first load too: there's no prerendered data for the page to start
// from, so the root HydrateFallback shows until the API answers.
clientLoader.hydrate = true as const

export const meta: MetaFunction<typeof clientLoader> = ({ data, params }) =>
  galleryMeta(data as GalleryData | undefined, params.slug)

export default function GalleryItemLive() {
  return <GalleryPage {...useLoaderData<typeof clientLoader>()} />
}
