import type { Config } from '@react-router/dev/config'
import { publishedGallerySlugs } from './app/build-content'

// Public pages are prerendered to static HTML at build time; there is no
// server. Content comes from the API while building, so a failed fetch fails
// the build and Cloudflare Pages keeps serving the last good deploy. The admin
// isn't in this list: it falls through to the SPA fallback (public/_redirects).
export default {
  ssr: false,
  async prerender() {
    const slugs = await publishedGallerySlugs()
    return ['/', '/about', '/services', '/gallery', '/inquire', ...slugs.map((s) => `/gallery/${s}`)]
  },
} satisfies Config
