import { ACCENT, ACCENTS, type Accent } from '~/lib/accent'

type Props = {
  value: Accent
  disabled?: boolean
  onChange: (next: Accent) => void
}

/* Real radio inputs, so arrow keys and screen readers work without extra code.
   The input sits over the swatch (sr-only) and the swatch shows focus via peer. */
export function AccentPicker({ value, disabled = false, onChange }: Props) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="text-[14px] text-charcoal">Color</legend>
      <p className="mt-1 text-[13px] text-warm-gray-deep">Tints this gallery’s card and page on the website.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {ACCENTS.map((key) => {
          const selected = key === value
          return (
            <label key={key} className="relative flex min-h-11 cursor-pointer flex-col items-center gap-1.5">
              <input
                type="radio"
                name="gallery-accent"
                value={key}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(key)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`block h-11 w-11 border ${ACCENT[key].swatch} ${
                  selected ? 'border-2 border-charcoal' : 'border-warm-gray'
                } peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-charcoal peer-disabled:opacity-50`}
              />
              <span className={`text-[13px] ${selected ? 'font-medium text-charcoal' : 'text-ink'}`}>{ACCENT[key].label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
