import type { Config } from '@react-router/dev/config'
import { BASE_PATH } from './app/base-path'
import { publishedGallerySlugs } from './app/build-content'

// Public pages are prerendered to static HTML at build time; there is no
// server. Content comes from the API while building, so a failed fetch fails
// the build and GitHub Pages keeps serving the last good deploy. The admin
// isn't in this list: GitHub Pages serves 404.html (a copy of the SPA
// fallback, made in the deploy workflow) for it, and the app takes over.
export default {
  ssr: false,
  basename: BASE_PATH,
  async prerender() {
    const slugs = await publishedGallerySlugs()
    return ['/', '/about', '/services', '/gallery', '/inquire', ...slugs.map((s) => `/gallery/${s}`)]
  },
} satisfies Config
