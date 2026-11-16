import { useState, type FormEvent } from 'react'
import { Field, TextArea, TextInput } from '~/components/admin/Field'
import { Notice } from '~/components/admin/Notice'
import { ShowOnSiteToggle } from '~/components/admin/ShowOnSiteToggle'
import type { AdminTestimonial } from '~/lib/admin/types'
import { messageFor } from './errors'

// Mirror backend/src/lib/validation.js (FIELDS.testimonials).
type Values = { quote: string; name: string; event: string }
type Errors = Partial<Record<keyof Values, string>>

const fromItem = (t: AdminTestimonial): Values => ({
  quote: t.quote,
  name: t.attribution,
  event: t.event_label ?? '',
})

function validate(v: Values): Errors {
  const errors: Errors = {}
  if (!v.quote.trim()) errors.quote = 'Add the quote.'
  if (!v.name.trim()) errors.name = 'Add a name.'
  return errors
}

/** The API's shape for these values, trimmed and with blank event as null. */
function payload(v: Values) {
  return { quote: v.quote.trim(), attribution: v.name.trim(), event_label: v.event.trim() || null }
}

/** Only the fields that differ from the saved testimonial. */
function changedFields(v: Values, saved: AdminTestimonial): Record<string, unknown> {
  const next = payload(v)
  const patch: Record<string, unknown> = {}
  if (next.quote !== saved.quote) patch.quote = next.quote
  if (next.attribution !== saved.attribution) patch.attribution = next.attribution
  if (next.event_label !== (saved.event_label || null)) patch.event_label = next.event_label
  return patch
}

export function TestimonialFields({
  values,
  errors,
  onChange,
  autoFocus = false,
}: {
  values: Values
  errors: Errors
  onChange: (patch: Partial<Values>) => void
  /** The new-testimonial form opens below the list; focusing it also scrolls it into view. */
  autoFocus?: boolean
}) {
  return (
    <>
      <Field label="Quote" error={errors.quote}>
        <TextArea rows={4} maxLength={1200} autoFocus={autoFocus} value={values.quote} onChange={(e) => onChange({ quote: e.target.value })} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" error={errors.name} hint="Shown under the quote, e.g. Ify & Oscar.">
          <TextInput maxLength={120} value={values.name} onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <Field label="Event" hint="For example, Bride, 2025.">
          <TextInput maxLength={120} value={values.event} onChange={(e) => onChange({ event: e.target.value })} />
        </Field>
      </div>
    </>
  )
}

/* One testimonial as an inline editor. Save is only on while this row has
   changes, so the owner can see at a glance which rows are unsaved. */
export function TestimonialEditor({
  item,
  busy,
  onSave,
  onShown,
  onDelete,
}: {
  item: AdminTestimonial
  busy: boolean
  onSave: (patch: Record<string, unknown>) => Promise<void>
  onShown: (next: boolean) => void
  onDelete: () => void
}) {
  const [values, setValues] = useState<Values>(() => fromItem(item))
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const dirty = Object.keys(changedFields(values, item)).length > 0

  const change = (patch: Partial<Values>) => {
    setValues((v) => ({ ...v, ...patch }))
    setJustSaved(false)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    setError('')
    if (Object.keys(found).length > 0) return
    const patch = changedFields(values, item)
    if (Object.keys(patch).length === 0) return
    setSaving(true)
    try {
      await onSave(patch)
      setJustSaved(true)
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-5">
      <TestimonialFields values={values} errors={errors} onChange={change} />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <ShowOnSiteToggle checked={item.status === 'published'} disabled={busy || saving} onChange={onShown} />
        <div className="flex items-center gap-6">
          {justSaved && (
            <span role="status" className="text-[14px] text-ink">
              Saved
            </span>
          )}
          <button
            type="submit"
            disabled={!dirty || saving}
            className="min-h-11 border border-charcoal px-5 py-3 text-[11px] uppercase tracking-[0.25em] text-charcoal transition-colors hover:bg-ivory-deep disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="min-h-11 text-[14px] text-warm-gray-deep underline underline-offset-4 hover:text-charcoal"
          >
            Delete
            <span className="sr-only"> testimonial from {item.attribution}</span>
          </button>
        </div>
      </div>
    </form>
  )
}

/* The "new testimonial" row. Quote and name are required; event is optional. */
export function NewTestimonialForm({
  onCreate,
  onDone,
}: {
  onCreate: (body: object) => Promise<unknown>
  onDone: () => void
}) {
  const [values, setValues] = useState<Values>({ quote: '', name: '', event: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function add(e: FormEvent) {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    setError('')
    if (Object.keys(found).length > 0) return
    setSaving(true)
    try {
      await onCreate({ ...payload(values), status: 'draft' })
      onDone()
    } catch (err) {
      setError(messageFor(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={add} noValidate className="flex flex-col gap-5">
      <div>
        <h2 className="text-[28px] leading-tight">New testimonial</h2>
        <p className="mt-2 text-[14px] text-ink">It starts hidden. Turn on Show on website when you’re ready.</p>
      </div>
      <TestimonialFields
        values={values}
        errors={errors}
        onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
        autoFocus
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onDone}
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
          {saving ? 'Adding…' : 'Add testimonial'}
        </button>
      </div>
    </form>
  )
}
