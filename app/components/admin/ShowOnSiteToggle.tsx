import { useId } from 'react'

type Props = {
  checked: boolean
  disabled?: boolean
  /** Explains why it's off-limits, e.g. "Add at least one photo first." */
  disabledHint?: string
  onChange: (next: boolean) => void
}

/* A switch, not a checkbox: it takes effect at once, so it reads as "on or off
   now" rather than "tick and save". The whole row is the button, so the label
   is also a target on a phone. */
export function ShowOnSiteToggle({ checked, disabled = false, disabledHint, onChange }: Props) {
  const hintId = useId()
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        aria-describedby={disabled && disabledHint ? hintId : undefined}
        onClick={() => onChange(!checked)}
        className="flex min-h-11 w-fit items-center gap-3 text-left text-[14px] text-charcoal disabled:opacity-50"
      >
        {/* 36×20 track, 14px knob inset 2px on every side: snug, square. */}
        <span
          aria-hidden="true"
          className={`relative inline-block h-[20px] w-[36px] shrink-0 border transition-colors ${
            checked ? 'border-charcoal bg-charcoal' : 'border-warm-gray bg-ivory'
          }`}
        >
          <span
            className={`absolute left-0 top-[2px] h-[14px] w-[14px] transition-transform ${
              checked ? 'translate-x-[18px] bg-ivory' : 'translate-x-[2px] bg-warm-gray'
            }`}
          />
        </span>
        Show on website
      </button>
      {disabled && disabledHint && (
        <p id={hintId} className="text-[13px] leading-relaxed text-warm-gray-deep">
          {disabledHint}
        </p>
      )}
    </div>
  )
}
