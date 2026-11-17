import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'
import { publishedGallerySlugs } from './build-content'

// With ssr:false, a route that has a loader must have at least one path to
// prerender, or the build refuses to run. So the gallery page comes in two
// versions: the prerendered one while any gallery is published, and a
// browser-only one when none is (before photos arrive, or after she
// unpublishes them all). Either way a gallery published after the build still
// opens; an unknown slug gets the site 404 from the API.
export default (async () => {
  const hasGalleries = (await publishedGallerySlugs()).length > 0
  return [
    layout('routes/site.tsx', [
      index('routes/home.tsx'),
      route('about', 'routes/about.tsx'),
      route('services', 'routes/services.tsx'),
      route('gallery', 'routes/gallery.tsx'),
      route('gallery/:slug', hasGalleries ? 'routes/gallery-item.tsx' : 'routes/gallery-item-live.tsx'),
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
