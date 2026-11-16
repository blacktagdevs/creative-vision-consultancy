import { useEffect, useId, useRef } from 'react'

type Props = {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  tone?: 'danger' | 'default'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/* An in-page confirmation. The native <dialog> gives a focus trap, Escape to
   close and the page behind goes inert, which window.confirm did for free but
   can't be styled or announced properly. Cancel gets focus, so pressing Enter
   by accident does nothing destructive. */
export function ConfirmDialog({ open, title, body, confirmLabel, tone = 'default', busy = false, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const bodyId = useId()

  // The parent owns `open`; the element only follows it.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const confirmTone =
    tone === 'danger' ? 'bg-rose-deep text-charcoal' : 'bg-charcoal text-ivory'

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(e) => {
        // Escape closes through the parent, so it can refuse while busy.
        e.preventDefault()
        if (!busy) onCancel()
      }}
      // If the browser closes it anyway (Chrome does after repeated Escape),
      // tell the parent, or `open` stays true and it can never reopen.
      onClose={() => {
        if (open) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md border border-line bg-ivory p-0 text-charcoal shadow-xl backdrop:bg-charcoal/40"
    >
      <div className="p-6 md:p-8">
        <h2 id={titleId} className="text-[28px] leading-tight">
          {title}
        </h2>
        <p id={bodyId} className="mt-3 text-[15px] leading-relaxed text-ink">
          {body}
        </p>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 border border-warm-gray px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-charcoal transition-colors hover:bg-ivory-deep disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`min-h-11 px-6 py-3 text-[11px] uppercase tracking-[0.25em] transition-opacity disabled:opacity-50 ${confirmTone}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
