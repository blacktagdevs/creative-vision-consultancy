import { Field, TextInput } from '~/components/admin/Field'
import { MAX_BULLET_CHARS, MAX_BULLETS } from './draft'

type Props = {
  items: string[]
  onChange: (next: string[]) => void
}

/* Each item is a plain input. Empty rows are allowed while editing and dropped on save. */
export function BulletsEditor({ items, onChange }: Props) {
  const full = items.length >= MAX_BULLETS
  return (
    <div className="flex flex-col gap-5">
      {items.map((text, i) => (
        <div key={i} className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <Field label={`Item ${i + 1}`}>
              <TextInput
                value={text}
                maxLength={MAX_BULLET_CHARS}
                onChange={(e) => onChange(items.map((t, j) => (j === i ? e.target.value : t)))}
              />
            </Field>
          </div>
          <button
            type="button"
            aria-label={`Remove item ${i + 1}`}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="min-h-11 shrink-0 px-2 text-[14px] text-warm-gray-deep underline underline-offset-4 hover:text-charcoal"
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          disabled={full}
          className="min-h-11 w-fit border border-warm-gray px-5 py-3 text-[11px] uppercase tracking-[0.25em] text-charcoal transition-colors hover:bg-ivory-deep disabled:opacity-50"
        >
          Add item
        </button>
        {full && <p className="text-[13px] text-warm-gray-deep">You can have up to {MAX_BULLETS} items.</p>}
      </div>
    </div>
  )
}
