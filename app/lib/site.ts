// Site-wide constants that aren't managed from the admin.
export const SITE = {
  name: 'Creative Vision Consultancy',
  short: 'CVC',
  tagline: 'Transforming visions into extraordinary experiences',
  url: 'https://www.creativevisionconsultancy.com',
  location: 'Atlanta, GA',
  reach: 'Serving clients nationwide',
  // TODO(client): confirm handles. Links render only when set.
  social: {
    instagram: '',
    pinterest: '',
  },
}

export const NAV = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/inquire', label: 'Inquire' },
] as const

/** Standard <head> tags for a page. */
export function pageMeta(title: string | null, description: string, path: string) {
  const full = title ? `${title} | ${SITE.name}` : `${SITE.name} | ${SITE.tagline}`
  return [
    { title: full },
    { name: 'description', content: description },
    { property: 'og:title', content: full },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${SITE.url}${path}` },
    { property: 'og:image', content: `${SITE.url}/images/hero-floral-arch.webp` },
    { tagName: 'link', rel: 'canonical', href: `${SITE.url}${path}` },
  ]
}

// TODO(client): Dubsado form vs. discovery-call link is pending the client
// conversation. The form below is the embed she sent with the brief.
export const INQUIRY: {
  mode: 'dubsado' | 'discovery-call'
  dubsadoFormUrl: string
  discoveryCallUrl: string
} = {
  mode: 'dubsado',
  dubsadoFormUrl: 'https://hello.dubsado.com/public/form/view/699686c73896d63e9482a834?iframe=true',
  discoveryCallUrl: '',
}
