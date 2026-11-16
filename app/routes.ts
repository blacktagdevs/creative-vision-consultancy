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
    // Client-only: no loaders, and not in the prerender list, so GitHub Pages
    // serves the SPA fallback for every /admin path.
    route('admin', 'routes/admin/layout.tsx', [
      index('routes/admin/dashboard.tsx'),
      route('galleries', 'routes/admin/galleries.tsx'),
      route('galleries/:id', 'routes/admin/gallery-edit.tsx'),
      route('services', 'routes/admin/services.tsx'),
      route('services/:id', 'routes/admin/service-edit.tsx'),
      route('testimonials', 'routes/admin/testimonials.tsx'),
    ]),
  ]
})() satisfies RouteConfig
