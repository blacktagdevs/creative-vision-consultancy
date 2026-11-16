import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Field, Select, TextInput } from '~/components/admin/Field'
import { Notice } from '~/components/admin/Notice'
import type { AdminService } from '~/lib/admin/types'
import { CATEGORIES, CATEGORY_LABEL, type ServiceCategory } from './labels'
import { messageFor } from './errors'

type Props = {
  open: boolean
  onClose: () => void
  onCreate: (body: object) => Promise<AdminService>
  onCreated: (item: AdminService) => void
}

/* A small native dialog, the same pattern as ConfirmDialog. Creating makes a
   hidden draft, and the owner goes straight to the editor to fill it in. */
export function AddServiceDialog({ open, onClose, onCreate, onCreated }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ServiceCategory>('wedding')
  const [nameError, setNameError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function close() {
    setName('')
    setNameError('')
    setFormError('')
    setCategory('wedding')
    onClose()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    setFormError('')
    if (!trimmed) {
      setNameError('Give the service a name.')
      return
    }
    setNameError('')
    setSaving(true)
    try {
      const item = await onCreate({ name: trimmed, category, status: 'draft' })
      setSaving(false)
      close()
      onCreated(item)
    } catch (err) {
      setFormError(messageFor(err))
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (!saving) close()
      }}
      onClose={() => {
        if (open) close()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md border border-line bg-ivory p-0 text-charcoal shadow-xl backdrop:bg-charcoal/40"
    >
      <form onSubmit={submit} noValidate className="p-6 md:p-8">
        <h2 id={titleId} className="text-[28px] leading-tight">
          Add a service
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink">It starts hidden from the website until you turn it on.</p>

        <div className="mt-6 flex flex-col gap-5">
          <Field label="Service name" hint="For example, Full wedding planning." error={nameError}>
            <TextInput value={name} maxLength={120} autoFocus onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as ServiceCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
          {formError && <Notice tone="error">{formError}</Notice>}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="min-h-11 border border-warm-gray px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-charcoal transition-colors hover:bg-ivory-deep disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 bg-charcoal px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-ivory disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create and edit'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
