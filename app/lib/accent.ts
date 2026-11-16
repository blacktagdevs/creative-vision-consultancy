// Per-gallery accent tones. The owner picks one per gallery in the admin; the
// site tints the gallery's card, its page header, and its home-page tile with
// it. Every class string below is written out in full, never assembled, so
// Tailwind's scanner can see it. Colors live in app.css (--color-accent-*).
export const ACCENTS = ['blush', 'sage', 'champagne', 'dusk', 'clay'] as const
export type Accent = (typeof ACCENTS)[number]

export const ACCENT: Record<
  Accent,
  { label: string; bg: string; bgHover: string; deep: string; border: string; swatch: string }
> = {
  blush: {
    label: 'Blush',
    bg: 'bg-accent-blush',
    bgHover: 'hover:bg-accent-blush-hover focus-visible:bg-accent-blush-hover',
    deep: 'text-accent-blush-deep',
    border: 'border-accent-blush-deep/25',
    swatch: 'bg-accent-blush',
  },
  sage: {
    label: 'Sage',
    bg: 'bg-accent-sage',
    bgHover: 'hover:bg-accent-sage-hover focus-visible:bg-accent-sage-hover',
    deep: 'text-accent-sage-deep',
    border: 'border-accent-sage-deep/25',
    swatch: 'bg-accent-sage',
  },
  champagne: {
    label: 'Champagne',
    bg: 'bg-accent-champagne',
    bgHover: 'hover:bg-accent-champagne-hover focus-visible:bg-accent-champagne-hover',
    deep: 'text-accent-champagne-deep',
    border: 'border-accent-champagne-deep/25',
    swatch: 'bg-accent-champagne',
  },
  dusk: {
    label: 'Dusk',
    bg: 'bg-accent-dusk',
    bgHover: 'hover:bg-accent-dusk-hover focus-visible:bg-accent-dusk-hover',
    deep: 'text-accent-dusk-deep',
    border: 'border-accent-dusk-deep/25',
    swatch: 'bg-accent-dusk',
  },
  clay: {
    label: 'Clay',
    bg: 'bg-accent-clay',
    bgHover: 'hover:bg-accent-clay-hover focus-visible:bg-accent-clay-hover',
    deep: 'text-accent-clay-deep',
    border: 'border-accent-clay-deep/25',
    swatch: 'bg-accent-clay',
  },
}

/** Falls back to blush: prerendered or live data may predate the column. */
export function accentOf(value: string | null | undefined): Accent {
  return (ACCENTS as readonly string[]).includes(value ?? '') ? (value as Accent) : 'blush'
}
