import type { ReactNode } from 'react'

// Headings the owner edits mark their emphasised words with asterisks:
// "Transforming visions into *extraordinary* experiences." Only a matched pair
// hugging its words counts, so a lone asterisk, "5 * 3" or "**" shows exactly
// as she typed it instead of swallowing part of the heading.
const MARKED = /\*([^*\s](?:[^*]*[^*\s])?)\*/g

/**
 * A heading's text as React nodes, with each *marked* run in an <em>. The text
 * is never treated as HTML. `emClassName` styles the emphasised words where
 * italics alone aren't the look (the rose word in the home hero).
 */
export function emphasised(text: string, emClassName?: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(MARKED)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      <em key={m.index} className={emClassName}>
        {m[1]}
      </em>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
