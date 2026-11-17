// The Home and About pages' words and photos, which the owner edits from the
// admin (Pages). This file owns the original wording and photos; the API stores
// only what she has changed, as a flat { key: text } object per page, and
// mergePage() lays those changes over the originals below.
//
// So a field she has never touched, or has cleared, shows the original. That
// is deliberate: the layout is built around every piece being there, and a
// blank field can never leave a hole in the page.
//
// What a key holds is decided by its ending, and backend/src/lib/pages.js
// applies the same rule when it validates a save:
//   *_image_url  an uploaded photo (null here means the page has no original)
//   *_image_alt  the photo's description, up to 300 characters
//   *_eyebrow    the small label above a heading, up to 80 (the "— " is added by the page)
//   *_title      a heading, up to 160; *word* marks the emphasised word
//   *_lede       one sentence under a page title, up to 300
//   *_body       paragraphs, up to 3000; a blank line starts a new one
import { getJson } from './api'
import { asset } from './asset'

export const HOME_DEFAULTS = {
  hero_image_url: asset('/images/hero-floral-arch.webp'),
  hero_image_alt: 'A bride in an off-the-shoulder gown beneath a floral arch of lavender and pink blooms',
  hero_eyebrow: 'Atlanta · Nationwide',
  hero_title: 'Transforming visions into *extraordinary* experiences.',

  intro_eyebrow: 'A Full-Service Studio',
  intro_title: 'Curated celebrations, thoughtfully planned.',
  intro_body:
    'Creative Vision Consultancy is a full-service wedding and event management company serving weddings, social, and corporate events. From intimate gatherings to large-scale celebrations, we transform your vision into a seamless, thoughtfully curated experience that feels personal, intentional, and unforgettable.',
  intro_image_url: asset('/images/bride-robe-window.webp'),
  intro_image_alt: 'A bride in a tulle robe seated by a sunlit window',

  services_eyebrow: 'Services',
  services_title: 'A practice built around presence and precision.',

  // The three cards link to /services#weddings, #social-corporate and
  // #consulting, in that order. Where they point is not editable.
  teaser_1_title: 'Weddings',
  teaser_1_body: 'Full planning, partial planning, and month-of coordination — from vision to execution.',
  teaser_1_image_url: asset('/images/couple-garden.webp'),
  teaser_1_image_alt: 'Bride and groom embracing in a garden, her veil catching the light',

  teaser_2_title: 'Social & Corporate',
  teaser_2_body: 'Birthdays, brand events, and corporate gatherings produced with calm leadership.',
  // Unsplash stand-in until she uploads a real CVC social/corporate photo.
  teaser_2_image_url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80',
  teaser_2_image_alt: 'An evening celebration table set with candles and flowers',

  teaser_3_title: 'Consulting',
  teaser_3_body: 'One-on-one sessions for the planner who wants direction without full service.',
  // Unsplash stand-in until she uploads a real CVC consulting/detail photo.
  teaser_3_image_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80',
  teaser_3_image_alt: 'Event details arranged on a styled table',

  portfolio_eyebrow: 'Selected Work',
  portfolio_title: 'A selection of recent celebrations.',

  cta_title: 'Let’s create something unforgettable.',
}

export const ABOUT_DEFAULTS = {
  header_eyebrow: 'Our Story',
  header_title: 'About',
  header_lede: 'Care, precision, and respect for the story being told.',

  story_image_url: asset('/images/couple-garden.webp'),
  story_image_alt: 'A groom kissing his bride’s forehead as she holds a bouquet of white roses',
  story_eyebrow: 'Creative Vision Consultancy',
  story_title: 'Personal, intentional, unforgettable.',
  story_body:
    'Creative Vision Consultancy is a full-service wedding and event management company serving weddings, social, and corporate events. From intimate gatherings to large-scale celebrations, we transform your vision into a seamless, thoughtfully curated experience that feels personal, intentional, and unforgettable.\n\nFrom planning to execution, our goal is for clients to fully enjoy their day, knowing every detail has been managed and every guest is considered. Based in Atlanta and serving clients nationwide, we approach every event with care, precision, and respect for the story being told.',

  // No original: the page shows a "Portrait coming soon" panel until she uploads one.
  owner_image_url: null as string | null,
  owner_image_alt: 'The owner of Creative Vision Consultancy',
  owner_eyebrow: 'Meet the Owner',
  owner_title: 'A dynamic experience curator.',
  owner_body:
    'CVC is owned by a dynamic experience curator with a background in event production and business management. With over seven years of experience, she is passionate about creating meaningful, memorable moments that reflect each client’s vision. Known for her attention to detail and calm, organized approach, she ensures every event feels effortless, elevated, and truly personal.',

  cta_title: 'Let’s create something unforgettable.',
}

export const PAGE_DEFAULTS = { home: HOME_DEFAULTS, about: ABOUT_DEFAULTS }

export type PageName = keyof typeof PAGE_DEFAULTS
export type HomeContent = typeof HOME_DEFAULTS
export type AboutContent = typeof ABOUT_DEFAULTS
export type PageContent<P extends PageName> = (typeof PAGE_DEFAULTS)[P]

/** What the API holds for a page: only the fields she has changed. */
export type PageOverrides = Record<string, string | null | undefined>

/** The shape of `GET /pages/:page`. The admin's version adds `updated_at`. */
export interface PageResponse {
  page: PageName
  content: PageOverrides
}

/** The originals with her changes laid over them. Blank or unknown keys are ignored. */
export function mergePage<P extends PageName>(page: P, overrides: PageOverrides | null | undefined): PageContent<P> {
  const out: Record<string, string | null> = { ...PAGE_DEFAULTS[page] }
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (key in out && typeof value === 'string' && value.trim()) out[key] = value
  }
  return out as PageContent<P>
}

/** A page's content as it should render now. Throws like getJson when the API can't answer. */
export async function loadPage<P extends PageName>(page: P): Promise<PageContent<P>> {
  const { content } = await getJson<PageResponse>(`/pages/${page}`)
  return mergePage(page, content)
}
