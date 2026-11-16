// The owner types whole dollars. The API stores cents, so conversion happens
// at the edges: here for input, and in draft.ts when building the save.

/** Matches the API's ceiling of 100,000,000 cents. */
export const MAX_DOLLARS = 1_000_000

export type DollarInput = { dollars: number | null; error?: string }

/** "6000" → 6000. Blank → null (no price shown). Anything but whole dollars is an error. */
export function parseDollars(input: string): DollarInput {
  const cleaned = input.trim().replace(/[$,]/g, '')
  if (!cleaned) return { dollars: null }
  if (!/^\d+$/.test(cleaned)) return { dollars: null, error: 'Enter whole dollars, like 6000.' }
  const dollars = Number(cleaned)
  if (dollars > MAX_DOLLARS) return { dollars: null, error: 'That price is too high.' }
  return { dollars }
}

/** 600000 cents → "6000" for the input. */
export function dollarsInputFromCents(cents: number | null): string {
  return cents == null ? '' : String(cents / 100)
}
