import type { ReactNode } from 'react'

type Props = {
  tone?: 'success' | 'error' | 'info'
  onDismiss?: () => void
  children: ReactNode
}

// Errors use role="alert" so a screen reader interrupts to announce them;
// everything else is polite status text.
const TONES = {
  success: 'border-accent-sage-deep bg-accent-sage',
  error: 'border-charcoal bg-rose/30',
  info: 'border-warm-gray bg-ivory-deep',
} as const

export function Notice({ tone = 'info', onDismiss, children }: Props) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-4 border-l-2 px-4 py-3 text-[15px] leading-relaxed text-charcoal ${TONES[tone]}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-11 shrink-0 text-[13px] text-ink underline underline-offset-4 hover:text-charcoal"
        >
          Dismiss
        </button>
      )}
    </div>
  )
}
