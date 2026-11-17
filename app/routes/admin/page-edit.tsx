import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import type { Route } from './+types/page-edit'
import { Notice } from '~/components/admin/Notice'
import { UnsavedChangesGuard } from '~/components/admin/UnsavedChangesGuard'
import { PagePhotoField, PageTextField } from '~/components/admin/page/PageFields'
import { SaveBar } from '~/components/admin/page/SaveBar'
import { changedFields, clean, draftFromPage, originalsOf, type PageDraft } from '~/components/admin/page/draft'
import { messageFor } from '~/components/admin/service/errors'
import { ApiError, apiGet, apiPatch } from '~/lib/admin/api'
import { useAdminContext } from '~/lib/admin/context'
import {
  PAGE_FORMS,
  fieldKind,
  pageInfo,
  pageStatus,
  photoKeyFor,
  type FormField,
  type FormSection,
  type PageInfo,
} from '~/lib/admin/pages'
import type { AdminPage } from '~/lib/admin/types'
import { uploadImageFile } from '~/lib/admin/upload'
import type { PageOverrides } from '~/lib/pages'

export const meta: Route.MetaFunction = ({ params }) => [
  { title: `${pageInfo(params.page)?.title ?? 'Page'} page | CVC Admin` },
  { name: 'robots', content: 'noindex' },
]

const back = (
  <Link
    to="/admin/pages"
    className="inline-flex min-h-11 items-center text-[14px] text-ink underline underline-offset-4 hover:text-charcoal"
  >
    Back to pages
  </Link>
)

export default function PageEditScreen() {
  const { page } = useParams()
  const info = pageInfo(page)

  if (!info) {
    return (
      <>
        {back}
        <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.25rem)] leading-[1.05]">Page</h1>
        <div className="mt-8">
          <Notice tone="error">We couldn’t find that page. Home and About are the pages you can change here.</Notice>
        </div>
      </>
    )
  }

  // Keyed, so going from one page's editor to the other starts from a clean form.
  return <PageEditor key={info.page} info={info} />
}

function PageEditor({ info }: { info: PageInfo }) {
  const { page, title, path } = info
  const { token, onUnauthorized } = useAdminContext()
  const sections: readonly FormSection[] = PAGE_FORMS[page]
  const originals = originalsOf(page)

  // `saved` is what the server holds, which is only the fields she has changed.
  // `draft` is the form: every field, as the website shows it. Save sends only
  // the difference.
  const [saved, setSaved] = useState<PageOverrides | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [draft, setDraft] = useState<PageDraft | null>(null)
  const [loadError, setLoadError] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedNotice, setSavedNotice] = useState(false)

  // She can start a second photo while the first is still uploading, so
  // uploads and their errors are tracked per field.
  const [uploading, setUploading] = useState<string[]>([])
  const [photoErrors, setPhotoErrors] = useState<Record<string, string>>({})

  function show(res: AdminPage) {
    setSaved(res.content ?? {})
    setSavedAt(res.updated_at)
    setDraft(draftFromPage(page, res.content ?? {}))
  }

  useEffect(() => {
    let alive = true
    apiGet<AdminPage>(`/admin/pages/${page}`, token)
      .then((res) => {
        if (alive) show(res)
      })
      .catch((err) => {
        if (!alive) return
        if (err instanceof ApiError && err.status === 401) return onUnauthorized()
        setLoadError(messageFor(err))
      })
    return () => {
      alive = false
    }
  }, [page, token, onUnauthorized])

  const heading = <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.25rem)] leading-[1.05]">{title} page</h1>

  if (loadError) {
    return (
      <>
        {back}
        {heading}
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

  const onSite = draftFromPage(page, saved)
  const dirty = changedFields(page, draft, saved) !== null

  // Any edit clears the "Saved" line, so it never claims more than is true.
  function edit(key: string, value: string | null) {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
    setSavedNotice(false)
  }

  function setPhotoError(key: string, message: string) {
    setPhotoErrors((errors) => ({ ...errors, [key]: message }))
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setSaveError('')
    setSavedNotice(false)
    const body = changedFields(page, draft!, saved!)
    if (!body || uploading.length > 0) return
    setSaving(true)
    try {
      // The response is the page as stored, so a box she emptied refills with
      // the original wording.
      show(await apiPatch<AdminPage>(`/admin/pages/${page}`, body, token))
      setSavedNotice(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized()
      setSaveError(messageFor(err))
    } finally {
      setSaving(false)
    }
  }

  // The photo is uploaded now but only lands on the page when Save is pressed.
  async function addPhoto(key: string, files: File[]) {
    setUploading((keys) => [...keys, key])
    setPhotoError(key, '')
    try {
      const { url } = await uploadImageFile(files[0], 'pages', token)
      edit(key, url)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized()
      setPhotoError(key, messageFor(err))
    } finally {
      setUploading((keys) => keys.filter((k) => k !== key))
    }
  }

  function renderField(field: FormField) {
    const { key } = field
    const kind = fieldKind(key)

    if (kind === 'photo') {
      return (
        <PagePhotoField
          key={key}
          field={field}
          url={draft![key] || null}
          original={originals[key] || null}
          onSite={onSite[key] || null}
          busy={uploading.includes(key)}
          disabled={saving}
          error={photoErrors[key]}
          onFiles={(files) => addPhoto(key, files)}
          onReject={(message) => setPhotoError(key, message)}
          onOriginal={() => {
            setPhotoError(key, '')
            edit(key, originals[key])
          }}
        />
      )
    }

    let note: string | undefined
    if (kind === 'description') {
      const photoKey = photoKeyFor(key)
      // Nothing to describe until there is a photo.
      if (!draft![photoKey]) return null
      // A description written for the old photo is easy to leave behind.
      const photoChanged = clean(draft![photoKey]) !== clean(onSite[photoKey])
      if (photoChanged && clean(draft![key]) === clean(onSite[key])) {
        note = 'You changed the photo. Check that this still describes it.'
      }
    }

    return (
      <PageTextField
        key={key}
        field={field}
        kind={kind}
        value={draft![key] ?? ''}
        original={originals[key] ?? ''}
        note={note}
        onChange={(value) => edit(key, value)}
      />
    )
  }

  return (
    <>
      {back}
      {heading}
      <p className="mt-3 text-[14px] text-warm-gray-deep">
        {pageStatus(saved, savedAt)}
      </p>
      <Link
        to={path}
        target="_blank"
        rel="noopener"
        className="mt-3 inline-flex min-h-11 w-fit items-center border-b border-charcoal pb-1 text-[11px] uppercase tracking-[0.3em] text-charcoal"
      >
        View on website
        <span className="sr-only"> (opens in a new tab)</span>
      </Link>
      <p className="mt-6 max-w-prose text-[16px] text-ink">
        The sections below follow the page from top to bottom. To go back to the original wording anywhere, empty
        the box and save.
      </p>

      <form onSubmit={save} noValidate className="mt-10 max-w-2xl">
        <fieldset disabled={saving} className="flex min-w-0 flex-col gap-14 border-0 p-0">
          {sections.map((section) => {
            const headingId = `${section.id}-heading`
            return (
              <section key={section.id} aria-labelledby={headingId} className="flex flex-col gap-6">
                <div>
                  <h2 id={headingId} className="text-[28px] leading-tight">
                    {section.title}
                  </h2>
                  {section.note && <p className="mt-2 text-[15px] leading-relaxed text-ink">{section.note}</p>}
                </div>
                {section.fields.map(renderField)}
              </section>
            )
          })}
        </fieldset>

        <SaveBar
          dirty={dirty}
          saving={saving}
          uploading={uploading.length > 0}
          saved={savedNotice}
          error={saveError}
          viewPath={path}
        />
      </form>

      <UnsavedChangesGuard when={dirty} />
    </>
  )
}
