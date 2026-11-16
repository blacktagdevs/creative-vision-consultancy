type Props = {
  count: number
  limit: number
  /** Plural noun for the item, e.g. "galleries". */
  noun: string
}

// Shows how close the owner is to the cap. Full turns the text a deep clay (rose-deep is too faint for small text), so the
// "add" control's absence has a visible reason.
export function CapCounter({ count, limit, noun }: Props) {
  const full = count >= limit
  return (
    <p className={`text-[14px] ${full ? 'font-medium text-accent-clay-deep' : 'text-warm-gray-deep'}`}>
      {count} of {limit} {noun}
    </p>
  )
}
