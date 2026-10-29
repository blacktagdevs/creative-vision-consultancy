// The API this site is built from. At build time the prerender reads it to
// produce static pages; in the browser only the admin talks to it.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

export type ServiceCategory = 'wedding' | 'social_corporate'

export interface Service {
  id: string
  category: ServiceCategory
  name: string
  slug: string
  description: string | null
  bullets_heading: string | null
  bullets: string[]
  closing_note: string | null
  price_prefix: string
  price_from_cents: number | null
  image_url: string | null
  sort_order: number
}

export type PortfolioCategory = 'wedding' | 'engagement' | 'social' | 'corporate'

export interface PortfolioItem {
  id: string
  title: string
  slug: string
  category: PortfolioCategory
  event_date: string | null
  location: string | null
  summary: string | null
  sort_order: number
  cover_url: string | null
  cover_alt: string | null
  cover_width: number | null
  cover_height: number | null
  photo_count: number
}

export interface Photo {
  id: string
  image_url: string
  alt: string | null
  width: number | null
  height: number | null
  sort_order: number
}

export interface Testimonial {
  id: string
  quote: string
  attribution: string
  event_label: string | null
}

/** GET a public endpoint. Throws on anything but 2xx so a bad build fails loudly. */
export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    const err = new Error(`GET ${path} answered ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<T>
}
