import type { PortfolioCategory } from './api'

/** 600000 → "$6,000". Whole dollars only; nobody prices planning in cents. */
export function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/** Paragraphs are separated by blank lines in the admin's plain-text fields. */
export function paragraphs(text: string | null | undefined) {
  return (text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export const PORTFOLIO_CATEGORY_LABEL: Record<PortfolioCategory, string> = {
  wedding: 'Wedding',
  engagement: 'Engagement',
  social: 'Celebration',
  corporate: 'Corporate',
}

/** "2025-06-14" → "June 2025". Parsed as a calendar date, not a moment in time. */
export function formatEventMonth(date: string | null) {
  if (!date) return null
  const [y, m] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
