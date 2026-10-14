import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'
import { publishedGallerySlugs } from './build-content'

// With ssr:false, a route that has a loader must have at least one path to
// prerender, or the build refuses to run. The gallery page is only registered
// while a gallery is published, so unpublishing them all (or launching before
// photos arrive) still builds. A stray /gallery/x link then gets the site 404.
export default (async () => {
  const hasGalleries = (await publishedGallerySlugs()).length > 0
  return [
    layout('routes/site.tsx', [
      index('routes/home.tsx'),
      route('about', 'routes/about.tsx'),
      route('services', 'routes/services.tsx'),
      route('gallery', 'routes/gallery.tsx'),
      ...(hasGalleries ? [route('gallery/:slug', 'routes/gallery-item.tsx')] : []),
      route('inquire', 'routes/inquire.tsx'),
    ]),
  ]
})() satisfies RouteConfig
