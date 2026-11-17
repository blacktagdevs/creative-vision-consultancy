import type { Route } from './+types/gallery-item'
import { GalleryPage } from '~/components/GalleryPage'
import { galleryMeta, loadGallery } from '~/lib/gallery-detail'
import { live } from '~/lib/live'

export function loader({ params }: Route.LoaderArgs) {
  return loadGallery(params.slug)
}

// In the browser: fetch again, so new photos show and an unpublished gallery
// 404s without waiting for the next build. Also covers galleries published
// since the last build, whose pages weren't prerendered at all.
export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  return live(() => loadGallery(params.slug), serverLoader)
}
clientLoader.hydrate = true as const

export const meta: Route.MetaFunction = ({ loaderData, params }) => galleryMeta(loaderData, params.slug)

export default function GalleryItem({ loaderData }: Route.ComponentProps) {
  return <GalleryPage {...loaderData} />
}
