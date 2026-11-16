import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Route } from './+types/gallery-edit'
import { ConfirmDialog } from '~/components/admin/ConfirmDialog'
import { Field, Select, TextArea, TextInput } from '~/components/admin/Field'
import { ImageDropzone } from '~/components/admin/ImageDropzone'
import { Notice } from '~/components/admin/Notice'
import { ShowOnSiteToggle } from '~/components/admin/ShowOnSiteToggle'
import { SortableGrid } from '~/components/admin/SortableList'
import { UnsavedChangesGuard } from '~/components/admin/UnsavedChangesGuard'
import { AccentPicker } from '~/components/admin/gallery/AccentPicker'
import { CardPreview } from '~/components/admin/gallery/CardPreview'
import { CATEGORY_OPTIONS, PHOTO_LIMIT, photoCountText, photosGoToo } from '~/components/admin/gallery/constants'
import { PhotoTile } from '~/components/admin/gallery/PhotoTile'
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPut } from '~/lib/admin/api'
import { useAdminContext } from '~/lib/admin/context'
import { uploadImageFile } from '~/lib/admin/upload'
import type { AdminGallery, AdminPhoto } from '~/lib/admin/types'
import type { Accent } from '~/lib/accent'

export const meta: Route.MetaFunction = () => [
  { title: 'Gallery | CVC Admin' },
  { name: 'robots', content: 'noindex' },
]

type Form = { title: string; category: AdminGallery['category']; event_date: string; location: string; summary: string; slug: string }

const toForm = (g: AdminGallery): Form => ({
  title: g.title,
  category: g.category,
  event_date: g.event_date ?? '',
  location: g.location ?? '',
  summary: g.summary ?? '',
  slug: g.slug,
})

const messageOf = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong. Please try again.')

export default function GalleryScreen() {
  const { id = '' } = useParams()
  const { token, onUnauthorized } = useAdminContext()
  const navigate = useNavigate()

  const [gallery, setGallery] = useState<AdminGallery | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'failed'>('loading')
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState<Form | null>(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [colorError, setColorError] = useState('')
  const [showError, setShowError] = useState('')
  const [showBusy, setShowBusy] = useState(false)
  // Arrowing through the colour picker fires a change per step. Saves go one at
  // a time and the last always carries her final choice: parallel PATCHes can
  // reach the server out of order and leave an older tone in the database.
  const accentQueue = useRef<{ next: Accent | null; sending: boolean; saved: Accent | null }>({
    next: null,
    sending: false,
    saved: null,
  })
  const [photoError, setPhotoError] = useState('')
  const [photoNotice, setPhotoNotice] = useState('')
  const [progress, setProgress] = useState('')
  const [uploading, setUploading] = useState(false)
  const [working, setWorking] = useState(false)
  const [toRemove, setToRemove] = useState<AdminPhoto | null>(null)
  const [confirmDeleteGallery, setConfirmDeleteGallery] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // A 401 ends the session; everything else is passed on for the caller to show.
  const guard = useCallback(
    (err: unknown): Error => {
      if (err instanceof ApiError && err.status === 401) onUnauthorized()
      return err instanceof Error ? err : new Error('Could not reach the CVC API.')
    },
    [onUnauthorized]
  )

  // Merge a response into the page. PATCH responses may lack the photo list.
  const applyItem = useCallback((item: AdminGallery) => {
    setGallery((prev) => (prev ? { ...prev, ...item, photos: item.photos ?? prev.photos } : item))
  }, [])

  const load = useCallback(async () => {
    try {
      const g = await apiGet<AdminGallery>(`/admin/portfolio/${id}`, token)
      setGallery(g)
      setForm(toForm(g))
      setState('ready')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized()
      if (err instanceof ApiError && err.status === 404) return setState('missing')
      setLoadError(messageOf(err))
      setState('failed')
    }
  }, [id, token, onUnauthorized])

  useEffect(() => {
    setState('loading')
    void load()
  }, [load])

  const photos = gallery?.photos ?? []
  const coverId = gallery ? (gallery.cover_photo_id ?? photos[0]?.id ?? null) : null
  const coverUrl = photos.find((p) => p.id === coverId)?.image_url ?? null

  const changed = useMemo(() => {
    if (!gallery || !form) return {} as Partial<Form>
    const base = toForm(gallery)
    const out: Partial<Form> = {}
    for (const k of Object.keys(base) as (keyof Form)[]) {
      if (form[k] !== base[k]) (out as Record<string, string>)[k] = form[k]
    }
    return out
  }, [gallery, form])
  const dirty = Object.keys(changed).length > 0

  if (state === 'loading') return <p className="text-[15px] text-warm-gray-deep">Loading…</p>

  if (state === 'missing' || state === 'failed' || !gallery || !form) {
    return (
      <>
        <h1 className="text-[clamp(2.2rem,5vw,3.25rem)] leading-[1.05]">
          {state === 'missing' ? 'This gallery no longer exists' : 'Could not open this gallery'}
        </h1>
        {state === 'failed' && (
          <div className="mt-6">
            <Notice tone="error">{loadError}</Notice>
          </div>
        )}
        <p className="mt-6">
          <BackLink />
        </p>
      </>
    )
  }

  const g = gallery
  const f = form
  const set = (patch: Partial<Form>) => {
    setForm({ ...f, ...patch })
    setSaved(false)
  }
  const published = g.status === 'published'
  const slugShown = f.slug.trim() || '(made from the title)'
  const room = Math.max(0, PHOTO_LIMIT - photos.length)
  const busy = working || uploading

  async function patch(body: object) {
    try {
      const item = await apiPatch<AdminGallery>(`/admin/portfolio/${id}`, body, token)
      applyItem(item)
      return item
    } catch (err) {
      throw guard(err)
    }
  }

  async function saveDetails(e: FormEvent) {
    e.preventDefault()
    if (!dirty) return
    if (!f.title.trim()) {
      setDetailsError('Give the gallery a title.')
      return
    }
    setSaving(true)
    setDetailsError('')
    setSaved(false)
    const body: Record<string, string | null> = { ...changed }
    if ('event_date' in body && !body.event_date) body.event_date = null
    try {
      const item = await patch(body)
      // Show what the server kept (trimmed text, regenerated link name).
      setForm(toForm({ ...g, ...item, photos: g.photos }))
      setSaved(true)
    } catch (err) {
      setDetailsError(messageOf(err))
    } finally {
      setSaving(false)
    }
  }

  async function changeAccent(accent: Accent) {
    setColorError('')
    const q = accentQueue.current
    q.saved ??= g.accent
    setGallery((cur) => (cur ? { ...cur, accent } : cur))
    q.next = accent
    if (q.sending) return // the running loop picks it up
    q.sending = true
    try {
      while (q.next !== null) {
        const sending: Accent = q.next
        q.next = null
        await apiPatch(`/admin/portfolio/${id}`, { accent: sending }, token)
        q.saved = sending
      }
    } catch (err) {
      q.next = null
      setGallery((cur) => (cur ? { ...cur, accent: q.saved ?? cur.accent } : cur))
      setColorError(messageOf(guard(err)))
    } finally {
      q.sending = false
    }
  }

  async function toggleShow(next: boolean) {
    setShowError('')
    setShowBusy(true)
    try {
      await patch({ status: next ? 'published' : 'draft' })
    } catch (err) {
      setShowError(messageOf(err))
    } finally {
      setShowBusy(false)
    }
  }

  async function addFiles(files: File[]) {
    setPhotoError('')
    setPhotoNotice('')
    if (room === 0) {
      setPhotoError(`This gallery already has ${PHOTO_LIMIT} photos. Remove one to add another.`)
      return
    }
    const batch = files.slice(0, room)
    const skipped = files.length - batch.length
    setUploading(true)
    const done: { image_url: string; alt: null; width: number; height: number }[] = []
    let failure = ''
    for (let i = 0; i < batch.length; i++) {
      setProgress(`Uploading ${i + 1} of ${batch.length}…`)
      try {
        const up = await uploadImageFile(batch[i], 'portfolio', token)
        done.push({ image_url: up.url, alt: null, width: up.width, height: up.height })
      } catch (err) {
        const e = guard(err)
        failure = `“${batch[i].name}” could not be uploaded: ${e.message}`
        break
      }
    }
    try {
      if (done.length > 0) {
        setProgress('Saving photos…')
        const res = await apiPost<{ item: AdminGallery }>(`/admin/portfolio/${id}/photos`, { add: done }, token).catch((err) => {
          throw guard(err)
        })
        applyItem(res.item)
      }
      const parts: string[] = []
      if (done.length > 0) parts.push(`Added ${done.length} ${done.length === 1 ? 'photo' : 'photos'}.`)
      if (skipped > 0)
        parts.push(`${skipped} ${skipped === 1 ? 'photo was' : 'photos were'} skipped because a gallery holds up to ${PHOTO_LIMIT}.`)
      if (parts.length) setPhotoNotice(parts.join(' '))
      if (failure) setPhotoError(done.length > 0 ? `${failure} The photos before it were added.` : failure)
    } catch (err) {
      setPhotoError(`The photos could not be saved: ${messageOf(err)}`)
    } finally {
      setUploading(false)
      setProgress('')
    }
  }

  async function makeCover(photoId: string) {
    setPhotoError('')
    setPhotoNotice('')
    setWorking(true)
    try {
      await patch({ cover_photo_id: photoId })
    } catch (err) {
      setPhotoError(messageOf(err))
    } finally {
      setWorking(false)
    }
  }

  async function saveAlt(photoId: string, alt: string) {
    try {
      await apiPatch(`/admin/portfolio/${id}/photos/${photoId}`, { alt }, token)
    } catch (err) {
      throw guard(err)
    }
    setGallery((cur) =>
      cur ? { ...cur, photos: (cur.photos ?? []).map((p) => (p.id === photoId ? { ...p, alt: alt || null } : p)) } : cur
    )
  }

  async function removePhoto() {
    if (!toRemove) return
    setWorking(true)
    setPhotoError('')
    setPhotoNotice('')
    try {
      const res = await apiPost<{ item: AdminGallery }>(`/admin/portfolio/${id}/photos`, { remove_ids: [toRemove.id] }, token).catch(
        (err) => {
          throw guard(err)
        }
      )
      applyItem(res.item)
    } catch (err) {
      setPhotoError(messageOf(err))
    } finally {
      setToRemove(null)
      setWorking(false)
    }
  }

  async function reorderPhotos(ids: string[]) {
    const before = photos
    const byId = new Map(before.map((p) => [p.id, p]))
    const next = ids.map((i) => byId.get(i)).filter((p): p is AdminPhoto => Boolean(p))
    setPhotoError('')
    setPhotoNotice('')
    setGallery({ ...g, photos: next })
    try {
      await apiPut(`/admin/portfolio/${id}/photos/order`, { ids }, token)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await load()
        setPhotoNotice('The photos changed in another tab, so they have been refreshed. Try that move again.')
        return
      }
      setGallery((cur) => (cur ? { ...cur, photos: before } : cur))
      setPhotoError(messageOf(guard(err)))
    }
  }

  async function deleteGallery() {
    setWorking(true)
    setDeleteError('')
    try {
      await apiDelete(`/admin/portfolio/${id}`, token)
      navigate('/admin/galleries')
    } catch (err) {
      setDeleteError(messageOf(guard(err)))
      setConfirmDeleteGallery(false)
      setWorking(false)
    }
  }

  return (
    <>
      <p>
        <BackLink />
      </p>
      <h1 className="mt-4 break-words text-[clamp(2.2rem,5vw,3.25rem)] leading-[1.05]">{g.title}</h1>
      <p className="mt-3 text-[15px] text-ink">
        {published ? 'Showing on the website.' : 'Not showing on the website yet.'}
        {published && (
          <>
            {' '}
            <Link
              to={`/gallery/${g.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-charcoal"
            >
              View on website<span className="sr-only"> (opens in a new tab)</span>
            </Link>
          </>
        )}
      </p>

      {/* Details */}
      <section className="mt-10 border border-line bg-ivory p-6 md:p-8" aria-labelledby="details-heading">
        <h2 id="details-heading" className="text-[28px] leading-tight">
          Details
        </h2>
        <form onSubmit={saveDetails} className="mt-6 flex max-w-2xl flex-col gap-5">
          <Field label="Title">
            <TextInput value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} required />
          </Field>
          <Field label="Category">
            <Select value={f.category} onChange={(e) => set({ category: e.target.value as Form['category'] })}>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Event date">
            <TextInput type="date" value={f.event_date} onChange={(e) => set({ event_date: e.target.value })} />
          </Field>
          <Field label="Location">
            <TextInput value={f.location} onChange={(e) => set({ location: e.target.value })} maxLength={120} />
          </Field>
          <Field
            label="Event description"
            hint={`Tell visitors about the event. The first lines show on its card on the Gallery page, and all of it on this gallery's own page. A blank line starts a new paragraph. ${f.summary.length} of 1,000 characters.`}
          >
            <TextArea rows={6} value={f.summary} onChange={(e) => set({ summary: e.target.value })} maxLength={1000} />
          </Field>
          <Field
            label="Link name"
            hint={`This gallery’s web address ends in /gallery/${slugShown}. Leave blank to make it from the title. Use lowercase letters, numbers and hyphens.`}
          >
            <TextInput value={f.slug} onChange={(e) => set({ slug: e.target.value })} maxLength={80} autoCapitalize="none" spellCheck={false} />
          </Field>

          {detailsError && <Notice tone="error">{detailsError}</Notice>}
          {saved && !dirty && <Notice tone="success">Saved</Notice>}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="submit"
              disabled={!dirty || saving}
              className="min-h-11 bg-charcoal px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-ivory disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {dirty && <span className="text-[14px] font-medium text-charcoal">You have unsaved changes.</span>}
          </div>
        </form>
      </section>

      {/* Color and visibility */}
      <section className="mt-8 border border-line bg-ivory p-6 md:p-8" aria-labelledby="look-heading">
        <h2 id="look-heading" className="text-[28px] leading-tight">
          Look and visibility
        </h2>
        <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-12">
          <div className="min-w-0 flex-1">
            <AccentPicker value={g.accent} onChange={changeAccent} />
            {colorError && (
              <div className="mt-3">
                <Notice tone="error">{colorError}</Notice>
              </div>
            )}
            <div className="mt-8">
              <ShowOnSiteToggle
                checked={published}
                disabled={showBusy || (photos.length === 0 && !published)}
                disabledHint={photos.length === 0 ? 'Add a photo first' : undefined}
                onChange={toggleShow}
              />
              {showError && (
                <div className="mt-3">
                  <Notice tone="error">{showError}</Notice>
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <p className="mb-2 text-[13px] text-warm-gray-deep">How it looks on the Gallery page</p>
            <CardPreview accent={g.accent} title={f.title || g.title} category={f.category} eventDate={f.event_date || null} description={f.summary} coverUrl={coverUrl} />
          </div>
        </div>
      </section>

      {/* Photos */}
      <section className="mt-8 border border-line bg-ivory p-6 md:p-8" aria-labelledby="photos-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="photos-heading" className="text-[28px] leading-tight">
            Photos
          </h2>
          <p className={`text-[14px] ${room === 0 ? 'font-medium text-accent-clay-deep' : 'text-warm-gray-deep'}`}>
            {photoCountText(photos.length)}
          </p>
        </div>
        <p className="mt-2 text-[15px] text-ink">
          The first photo is the cover unless you choose another. Drag photos, or use Earlier and Later, to change their order.
        </p>

        <div className="mt-6">
          <ImageDropzone
            multiple
            busy={uploading}
            disabled={room === 0 || working}
            onFiles={addFiles}
            onReject={(m) => setPhotoError(m)}
            title={room === 0 ? 'This gallery is full' : 'Drag photos here'}
            hint={room === 0 ? `Remove a photo to add another (${PHOTO_LIMIT} at most).` : `or tap to choose. You can add ${room} more.`}
          />
          {progress && (
            <p className="mt-3 text-[15px] text-charcoal" role="status">
              {progress}
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 empty:hidden">
          {photoNotice && (
            <Notice onDismiss={() => setPhotoNotice('')}>{photoNotice}</Notice>
          )}
          {photoError && (
            <Notice tone="error" onDismiss={() => setPhotoError('')}>
              {photoError}
            </Notice>
          )}
        </div>

        <div className="mt-6">
          {photos.length === 0 ? (
            <p className="text-[15px] text-warm-gray-deep">No photos yet.</p>
          ) : (
            <SortableGrid
              items={photos}
              getId={(p) => p.id}
              getLabel={(p) => `Photo ${photos.findIndex((x) => x.id === p.id) + 1}`}
              onReorder={reorderPhotos}
              renderItem={(p, info) => (
                <PhotoTile
                  photo={p}
                  index={info.index}
                  isCover={p.id === coverId}
                  busy={busy}
                  onSaveAlt={(alt) => saveAlt(p.id, alt)}
                  onMakeCover={() => makeCover(p.id)}
                  onRemove={() => setToRemove(p)}
                />
              )}
            />
          )}
        </div>
      </section>

      {/* Delete */}
      <section className="mt-12 border-t border-line pt-8">
        {deleteError && (
          <div className="mb-4">
            <Notice tone="error">{deleteError}</Notice>
          </div>
        )}
        <button
          type="button"
          onClick={() => setConfirmDeleteGallery(true)}
          className="min-h-11 border border-warm-gray px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-charcoal hover:bg-ivory-deep"
        >
          Delete this gallery
        </button>
      </section>

      <ConfirmDialog
        open={toRemove !== null}
        title="Remove this photo?"
        body="It will be taken out of this gallery. This can't be undone."
        confirmLabel="Remove photo"
        tone="danger"
        busy={working}
        onConfirm={removePhoto}
        onCancel={() => setToRemove(null)}
      />
      <ConfirmDialog
        open={confirmDeleteGallery}
        title="Delete this gallery?"
        body={`Delete “${g.title}”? ${photosGoToo(photos.length)}This can't be undone.`}
        confirmLabel="Delete gallery"
        tone="danger"
        busy={working}
        onConfirm={deleteGallery}
        onCancel={() => setConfirmDeleteGallery(false)}
      />
      {/* Not while a delete is under way: it navigates away on purpose. */}
      <UnsavedChangesGuard when={dirty && !working} />
    </>
  )
}

function BackLink() {
  return (
    <Link to="/admin/galleries" className="inline-flex min-h-11 items-center text-[14px] text-ink underline underline-offset-4 hover:text-charcoal">
      Back to galleries
    </Link>
  )
}
