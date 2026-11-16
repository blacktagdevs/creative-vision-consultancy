import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Field, Select, TextInput } from '~/components/admin/Field'
import { Notice } from '~/components/admin/Notice'
import { CATEGORY_OPTIONS } from './constants'

type Props = {
  open: boolean
  onCancel: () => void
  /** Throws with a readable message on failure; the dialog shows it. */
  onCreate: (title: string, category: string) => Promise<void>
}

/* Asks for just enough to start a gallery. Everything else is filled in on
   the editor page, so this stays a two-field question. */
export function AddGalleryDialog({ open, onCancel, onCreate }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('wedding')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setTitle('')
      setCategory('wedding')
      setError('')
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Give the gallery a title first.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onCreate(title.trim(), category)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the gallery.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="add-gallery-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
      onClose={() => {
        if (open) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md border border-line bg-ivory p-0 text-charcoal shadow-xl backdrop:bg-charcoal/40"
    >
      <form onSubmit={submit} className="p-6 md:p-8">
        <h2 id="add-gallery-title" className="text-[28px] leading-tight">
          Add a gallery
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink">
          Start with a title. You can add photos and details on the next page. It won’t show on the website until you
          turn it on.
        </p>
        <div className="mt-6 flex flex-col gap-5">
          <Field label="Title">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required autoComplete="off" />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          {error && <Notice tone="error">{error}</Notice>}
        </div>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 border border-warm-gray px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-charcoal hover:bg-ivory-deep disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 bg-charcoal px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-ivory disabled:opacity-50"
          >
            {busy ? 'Adding…' : 'Add gallery'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
