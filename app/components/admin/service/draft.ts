import type { AdminService } from '~/lib/admin/types'
import { dollarsInputFromCents, parseDollars } from './dollars'

// Mirror backend/src/lib/validation.js (FIELDS.services).
export const MAX_BULLETS = 12
export const MAX_BULLET_CHARS = 160

/** The service editor's form state. Price is kept as typed, in whole dollars. */
export type ServiceDraft = {
  name: string
  category: AdminService['category']
  slug: string
  description: string
  bullets_heading: string
  bullets: string[]
  closing_note: string
  price_prefix: string
  price: string
  image_url: string | null
}

export type DraftErrors = { name?: string; price?: string }

export function draftFromService(s: AdminService): ServiceDraft {
  return {
    name: s.name,
    category: s.category,
    slug: s.slug,
    description: s.description ?? '',
    bullets_heading: s.bullets_heading ?? '',
    bullets: [...(s.bullets ?? [])],
    closing_note: s.closing_note ?? '',
    price_prefix: s.price_prefix,
    price: dollarsInputFromCents(s.price_from_cents),
    image_url: s.image_url ?? null,
  }
}

export function validateDraft(d: ServiceDraft): DraftErrors {
  const errors: DraftErrors = {}
  if (!d.name.trim()) errors.name = 'Name is required.'
  const { error } = parseDollars(d.price)
  if (error) errors.price = error
  return errors
}

/* Blank rows are dropped on save. */
const cleanBullets = (items: string[]) => items.map((s) => s.trim()).filter(Boolean)

/**
 * Only the fields that differ from the saved service, in the shape the API
 * takes. Null when nothing differs, so Save stays off until something changes.
 */
export function changedFields(d: ServiceDraft, saved: AdminService): Record<string, unknown> | null {
  const { dollars } = parseDollars(d.price)
  const next: Record<string, unknown> = {
    name: d.name.trim(),
    category: d.category,
    slug: d.slug.trim(), // blank → the API makes one from the name
    description: d.description.trim() || null,
    bullets_heading: d.bullets_heading.trim() || null,
    bullets: cleanBullets(d.bullets),
    closing_note: d.closing_note.trim() || null,
    // The column is NOT NULL, so a blank wording means the default.
    price_prefix: d.price_prefix.trim() || 'Starts at',
    price_from_cents: dollars === null ? null : dollars * 100,
    image_url: d.image_url,
  }
  const savedValues: Record<string, unknown> = {
    name: saved.name,
    category: saved.category,
    slug: saved.slug,
    description: saved.description || null,
    bullets_heading: saved.bullets_heading || null,
    bullets: saved.bullets ?? [],
    closing_note: saved.closing_note || null,
    price_prefix: saved.price_prefix,
    price_from_cents: saved.price_from_cents ?? null,
    image_url: saved.image_url ?? null,
  }
  const changed = Object.keys(next).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(savedValues[k]))
  if (changed.length === 0) return null
  return Object.fromEntries(changed.map((k) => [k, next[k]]))
}
