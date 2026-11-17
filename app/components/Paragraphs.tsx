import { paragraphs } from '~/lib/format'

// A plain-text field from the admin, one <p> per paragraph (a blank line starts
// a new one). The wrapper carries the type styles and the gap between
// paragraphs (space-y-*), so a single paragraph sits exactly as a lone <p> would.
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {paragraphs(text).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  )
}
