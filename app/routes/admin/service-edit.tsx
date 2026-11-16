import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Route } from './+types/service-edit'
import { ConfirmDialog } from '~/components/admin/ConfirmDialog'
import { Field, Select, TextArea, TextInput } from '~/components/admin/Field'
import { ImageDropzone } from '~/components/admin/ImageDropzone'
import { Notice } from '~/components/admin/Notice'
import { ShowOnSiteToggle } from '~/components/admin/ShowOnSiteToggle'
import { UnsavedChangesGuard } from '~/components/admin/UnsavedChangesGuard'
import { BulletsEditor } from '~/components/admin/service/BulletsEditor'
import { messageFor } from '~/components/admin/service/errors'
import { parseDollars } from '~/components/admin/service/dollars'
import { CATEGORIES, CATEGORY_LABEL, type ServiceCategory } from '~/components/admin/service/labels'
import {
  changedFields,
  draftFromService,
  validateDraft,
  type DraftErrors,
  type ServiceDraft,
} from '~/components/admin/service/draft'
import { ApiError, apiDelete, apiGet, apiPatch } from '~/lib/admin/api'
import { useAdminContext } from '~/lib/admin/context'
import type { AdminService } from '~/lib/admin/types'
import { uploadImageFile } from '~/lib/admin/upload'
import { formatPrice } from '~/lib/format'

export const meta: Route.MetaFunction = () => [
  { title: 'Service | CVC Admin' },
  { name: 'robots', content: 'noindex' },
]

const NOT_FOUND = 'We couldn’t find that service. It may have been deleted.'

export default function ServiceEditScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { token, onUnauthorized } = useAdminContext()

  // `saved` is what the server holds; `draft` is the form. Save sends only the difference.
  const [saved, setSaved] = useState<AdminService | null>(null)
  const [draft, setDraft] = useState<ServiceDraft | null>(null)
  const [loadError, setLoadError] = useState('')

  const [errors, setErrors] = useState<DraftErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedNotice, setSavedNotice] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')

  const [statusBusy, setStatusBusy] = useState(false)
  const [statusError, setStatusError] = useState('')

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let alive = true
    apiGet<AdminService>(`/admin/services/${id}`, token)
      .then((item) => {
        if (!alive) return
        setSaved(item)
        setDraft(draftFromService(item))
      })
      .catch((err) => {
        if (!alive) return
        if (err instanceof ApiError && err.status === 401) return onUnauthorized()
        setLoadError(err instanceof ApiError && err.status === 404 ? NOT_FOUND : messageFor(err))
      })
    return () => {
      alive = false
    }
  }, [id, token, onUnauthorized])

  const back = (
    <Link
      to="/admin/services"
      className="inline-flex min-h-11 items-center text-[14px] text-ink underline underline-offset-4 hover:text-charcoal"
    >
      Back to services
    </Link>
  )

  if (loadError) {
    return (
      <>
        {back}
        <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.25rem)] leading-[1.05]">Service</h1>
        <div className="mt-8">
          <Notice tone="error">{loadError}</Notice>
        </div>
      </>
    )
  }

  if (!saved || !draft) {
    return (
      <>
        {back}
        <p className="mt-8 text-[15px] text-warm-gray-deep">Loading…</p>
      </>
    )
  }

  const patch = changedFields(draft, saved)
  const dirty = patch !== null
  const price = parseDollars(draft.price)
  const pricePreview = price.error
    ? ''
    : price.dollars === null
      ? 'No price will show on the website.'
      : `${draft.price_prefix.trim() || 'Starts at'} ${formatPrice(price.dollars * 100)}`

  // Any edit clears the "Saved" line, so it never claims more than is true.
  function edit(change: Partial<ServiceDraft>) {
    setDraft((d) => (d ? { ...d, ...change } : d))
    setSavedNotice(false)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    const found = validateDraft(draft!)
    setErrors(found)
    setSaveError('')
    setSavedNotice(false)
    if (Object.keys(found).length > 0) return
    const body = changedFields(draft!, saved!)
    if (!body) return
    setSaving(true)
    try {
      const item = await apiPatch<AdminService>(`/admin/services/${saved!.id}`, body, token)
      setSaved(item)
      setDraft(draftFromService(item))
      setSavedNotice(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized()
      setSaveError(messageFor(err))
    } finally {
      setSaving(false)
    }
  }

  // Publishing saves at once, so it updates only `saved`. Unsaved form edits stay put.
  async function setShown(next: boolean) {
    setStatusError('')
    setStatusBusy(true)
    try {
      const item = await apiPatch<AdminService>(
        `/admin/services/${saved!.id}`,
        { status: next ? 'published' : 'draft' },
        token
      )
      setSaved(item)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized()
      setStatusError(messageFor(err))
    } finally {
      setStatusBusy(false)
    }
  }

  // The photo is uploaded now but only lands on the service when Save is pressed.
  async function addPhoto(files: File[]) {
    setUploading(true)
    setPhotoError('')
    try {
      const { url } = await uploadImageFile(files[0], 'services', token)
      edit({ image_url: url })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized()
      setPhotoError(messageFor(err))
    } finally {
      setUploading(false)
    }
  }

  async function deleteService() {
    setDeleting(true)
    setDeleteError('')
    try {
      await apiDelete(`/admin/services/${saved!.id}`, token)
      navigate('/admin/services')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized()
      setDeleteError(messageFor(err))
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {back}
      <h1 className="mt-4 break-words text-[clamp(2.2rem,5vw,3.25rem)] leading-[1.05]">{saved.name}</h1>
      <p className="mt-3 text-[14px] text-warm-gray-deep">{CATEGORY_LABEL[saved.category]}</p>

      <form onSubmit={save} noValidate className="mt-10 max-w-2xl">
        <fieldset disabled={saving} className="flex min-w-0 flex-col gap-14 border-0 p-0">
          <section aria-labelledby="about-heading" className="flex flex-col gap-6">
            <h2 id="about-heading" className="text-[28px] leading-tight">
              About this service
            </h2>
            <Field label="Name" error={errors.name}>
              <TextInput value={draft.name} maxLength={120} onChange={(e) => edit({ name: e.target.value })} />
            </Field>
            <Field label="Category">
              <Select
                value={draft.category}
                onChange={(e) => edit({ category: e.target.value as ServiceCategory })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Description" hint="A blank line starts a new paragraph.">
              <TextArea
                rows={8}
                maxLength={4000}
                value={draft.description}
                onChange={(e) => edit({ description: e.target.value })}
              />
            </Field>
          </section>

          <section aria-labelledby="list-heading" className="flex flex-col gap-6">
            <h2 id="list-heading" className="text-[28px] leading-tight">
              What’s included
            </h2>
            <Field label="List heading" hint="Shown above the list on the website, such as “What’s included”.">
              <TextInput
                value={draft.bullets_heading}
                maxLength={120}
                onChange={(e) => edit({ bullets_heading: e.target.value })}
              />
            </Field>
            <BulletsEditor items={draft.bullets} onChange={(bullets) => edit({ bullets })} />
            <Field label="Closing note" hint="A short line shown under the list.">
              <TextArea
                rows={3}
                maxLength={600}
                value={draft.closing_note}
                onChange={(e) => edit({ closing_note: e.target.value })}
              />
            </Field>
          </section>

          <section aria-labelledby="price-heading" className="flex flex-col gap-6">
            <h2 id="price-heading" className="text-[28px] leading-tight">
              Price
            </h2>
            <Field label="Price wording" hint="The words shown before the price, such as “Starts at”.">
              <TextInput
                value={draft.price_prefix}
                maxLength={40}
                onChange={(e) => edit({ price_prefix: e.target.value })}
              />
            </Field>
            <Field label="Starting price ($)" hint="Whole dollars only. Leave blank to show no price." error={errors.price}>
              <TextInput
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={draft.price}
                onChange={(e) => edit({ price: e.target.value })}
              />
            </Field>
            {pricePreview && (
              <p className="text-[16px] text-charcoal" aria-live="polite">
                Shows as: <span className="font-medium">{pricePreview}</span>
              </p>
            )}
          </section>

          <section aria-labelledby="photo-heading" className="flex flex-col gap-4">
            <h2 id="photo-heading" className="text-[28px] leading-tight">
              Photo
            </h2>
            <ImageDropzone
              previewUrl={draft.image_url}
              busy={uploading}
              disabled={saving}
              onFiles={addPhoto}
              onReject={setPhotoError}
              onRemove={() => edit({ image_url: null })}
            />
            {photoError && <Notice tone="error">{photoError}</Notice>}
          </section>

          <section aria-labelledby="web-heading" className="flex flex-col gap-6">
            <h2 id="web-heading" className="text-[28px] leading-tight">
              Web address
            </h2>
            <Field
              label="Link name"
              hint="Used in the web address for this service. Leave blank to make one from the name."
            >
              <TextInput value={draft.slug} maxLength={80} onChange={(e) => edit({ slug: e.target.value })} />
            </Field>
          </section>
        </fieldset>

        <div className="mt-12 flex flex-col gap-4">
          {saveError && <Notice tone="error">{saveError}</Notice>}
          {savedNotice && <Notice tone="success">Saved</Notice>}
          <div>
            <button
              type="submit"
              disabled={!dirty || saving || uploading}
              className="min-h-11 bg-charcoal px-8 py-4 text-[11px] uppercase tracking-[0.25em] text-ivory disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>

      <section aria-labelledby="website-heading" className="mt-16 flex max-w-2xl flex-col gap-4 border-t border-line pt-10">
        <h2 id="website-heading" className="text-[28px] leading-tight">
          On the website
        </h2>
        <ShowOnSiteToggle checked={saved.status === 'published'} disabled={statusBusy} onChange={setShown} />
        {saved.status === 'published' && (
          <Link
            to="/services"
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 w-fit items-center border-b border-charcoal pb-1 text-[11px] uppercase tracking-[0.3em] text-charcoal"
          >
            View on website
          </Link>
        )}
        {statusError && <Notice tone="error">{statusError}</Notice>}
      </section>

      <section className="mt-16 max-w-2xl border-t border-line pt-10">
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="min-h-11 border border-charcoal px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-charcoal transition-colors hover:bg-ivory-deep"
        >
          Delete service
        </button>
        {deleteError && (
          <div className="mt-4">
            <Notice tone="error">{deleteError}</Notice>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this service?"
        body={`“${saved.name}” will be removed from the list and from the website. This can’t be undone.`}
        confirmLabel="Delete service"
        tone="danger"
        busy={deleting}
        onConfirm={deleteService}
        onCancel={() => setConfirmDelete(false)}
      />
      {/* Not while a delete is under way: it navigates away on purpose. */}
      <UnsavedChangesGuard when={dirty && !deleting} />
    </>
  )
}
