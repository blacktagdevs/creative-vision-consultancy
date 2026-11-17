// Row shapes the admin receives. They mirror backend/migrations (001 and 002)
// and the columns the admin list and detail queries return.

// Re-exported rather than redefined: the public site and the admin must agree
// on the tones, and app/lib/accent.ts owns them.
export type { Accent } from '~/lib/accent'
import type { Accent } from '~/lib/accent'
import type { PageName, PageOverrides } from '~/lib/pages'

export type Status = 'draft' | 'published'

export interface AdminService {
  id: string
  category: 'wedding' | 'social_corporate'
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
  status: Status
  created_at: string
  updated_at: string
}

export interface AdminPhoto {
  id: string
  image_url: string
  alt: string | null
  width: number | null
  height: number | null
  sort_order: number
}

export interface AdminGallery {
  id: string
  title: string
  slug: string
  category: 'wedding' | 'engagement' | 'social' | 'corporate'
  accent: Accent
  event_date: string | null
  location: string | null
  summary: string | null
  cover_photo_id: string | null
  sort_order: number
  status: Status
  created_at: string
  updated_at: string
  // From the list query's cover join.
  cover_url: string | null
  cover_alt: string | null
  cover_width: number | null
  cover_height: number | null
  photo_count: number
  /** Only present on single-gallery responses (create, edit, photo changes). */
  photos?: AdminPhoto[]
}

export interface AdminTestimonial {
  id: string
  quote: string
  attribution: string
  event_label: string | null
  sort_order: number
  status: Status
  created_at: string
  updated_at: string
}

/**
 * A page's words and photos as the admin receives them. `content` holds only
 * the fields she has changed; app/lib/pages.ts owns the originals for the rest.
 */
export interface AdminPage {
  page: PageName
  content: PageOverrides
  /** Null until she first saves a change to the page. */
  updated_at: string | null
}

export interface ListResponse<T> {
  items: T[]
  count: number
  limit: number
}

export type ResourceName = 'services' | 'portfolio' | 'testimonials'
