import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { Route } from './+types/galleries'
import { CapCounter } from '~/components/admin/CapCounter'
import { ConfirmDialog } from '~/components/admin/ConfirmDialog'
import { Notice } from '~/components/admin/Notice'
import { ShowOnSiteToggle } from '~/components/admin/ShowOnSiteToggle'
import { SortableList } from '~/components/admin/SortableList'
import { AddGalleryDialog } from '~/components/admin/gallery/AddGalleryDialog'
import { photoCountText, photosGoToo } from '~/components/admin/gallery/constants'
import type { AdminGallery } from '~/lib/admin/types'
import { useResourceList } from '~/lib/admin/useResourceList'
import { ACCENT, accentOf } from '~/lib/accent'
import { formatEventMonth, PORTFOLIO_CATEGORY_LABEL } from '~/lib/format'
import { sized } from '~/lib/image'

export const meta: Route.MetaFunction = () => [
  { title: 'Galleries | CVC Admin' },
  { name: 'robots', content: 'noindex' },
]

const message = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong. Please try again.')

export default function GalleriesScreen() {
  const list = useResourceList<AdminGallery>('portfolio')
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<AdminGallery | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Row-level errors, keyed by gallery id; null id means a list-level one.
  const [rowError, setRowError] = useState<{ id: string | null; text: string } | null>(null)

  const atCap = list.limit > 0 && list.count >= list.limit

  async function create(title: string, category: string) {
    const created = await list.create({ title, category, status: 'draft' })
    navigate(`/admin/galleries/${created.id}`)
  }

  async function toggle(g: AdminGallery, show: boolean) {
    setRowError(null)
    try {
      await list.update(g.id, { status: show ? 'published' : 'draft' })
    } catch (err) {
      setRowError({ id: g.id, text: message(err) })
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    setRowError(null)
    try {
      await list.remove(toDelete.id)
      setToDelete(null)
    } catch (err) {
      setRowError({ id: toDelete.id, text: message(err) })
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  async function reorder(ids: string[]) {
    setRowError(null)
    try {
      await list.reorder(ids)
    } catch (err) {
      setRowError({ id: null, text: message(err) })
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[clamp(2.2rem,5vw,3.25rem)] leading-[1.05]">Galleries</h1>
          <div className="mt-3">
            {!list.loading && <CapCounter count={list.count} limit={list.limit} noun="galleries" />}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={atCap || list.loading}
            aria-describedby={atCap ? 'cap-reason' : undefined}
            className="min-h-11 bg-charcoal px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-ivory disabled:opacity-50"
          >
            Add gallery
          </button>
          {atCap && (
            <p id="cap-reason" className="max-w-xs text-[13px] text-warm-gray-deep sm:text-right">
              You’ve reached the limit of {list.limit} galleries. Delete one to add another.
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 max-w-prose text-[16px] text-ink">
        New galleries appear first on the website. The order here is the order visitors see.
      </p>

      <div className="mt-6 flex flex-col gap-3 empty:hidden">
        {list.error && <Notice tone="error">{list.error}</Notice>}
        {list.notice && <Notice>{list.notice}</Notice>}
        {rowError?.id === null && (
          <Notice tone="error" onDismiss={() => setRowError(null)}>
            {rowError.text}
          </Notice>
        )}
      </div>

      <div className="mt-8">
        {list.loading ? (
          <p className="text-[15px] text-warm-gray-deep">Loading…</p>
        ) : list.items.length === 0 ? (
          <p className="border border-line bg-ivory-deep p-6 text-[15px] text-ink">
            No galleries yet. Choose “Add gallery” to create your first one.
          </p>
        ) : (
          <SortableList
            items={list.items}
            getId={(g) => g.id}
            getLabel={(g) => g.title}
            onReorder={reorder}
            renderItem={(g) => {
              const a = ACCENT[accentOf(g.accent)]
              const month = g.event_date ? formatEventMonth(g.event_date) : null
              const published = g.status === 'published'
              return (
                <article className="flex flex-col gap-4 border border-line bg-ivory p-4 sm:flex-row sm:items-start">
                  <div className={`h-28 w-24 shrink-0 overflow-hidden ${a.bg}`}>
                    {g.cover_url && (
                      <img src={sized(g.cover_url, 'thumb')} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div>
                      <h2 className="break-words text-[24px] leading-tight">{g.title}</h2>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[14px] text-ink">
                        <span>
                          {PORTFOLIO_CATEGORY_LABEL[g.category]}
                          {month ? ` · ${month}` : ''}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span aria-hidden="true" className={`inline-block h-3 w-3 border border-warm-gray ${a.swatch}`} />
                          <span>{a.label}</span>
                        </span>
                      </p>
                      <p className="mt-1 text-[14px] text-warm-gray-deep">{photoCountText(g.photo_count)}</p>
                    </div>
                    <ShowOnSiteToggle
                      checked={published}
                      disabled={g.photo_count === 0 && !published}
                      disabledHint="Add a photo first"
                      onChange={(next) => toggle(g, next)}
                    />
                    {rowError?.id === g.id && (
                      <Notice tone="error" onDismiss={() => setRowError(null)}>
                        {rowError.text}
                      </Notice>
                    )}
                    <div className="flex flex-wrap gap-x-6">
                      <Link
                        to={`/admin/galleries/${g.id}`}
                        className="inline-flex min-h-11 items-center border-b border-charcoal text-[11px] uppercase tracking-[0.3em] text-charcoal"
                      >
                        Edit<span className="sr-only"> {g.title}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setToDelete(g)}
                        className="min-h-11 text-[14px] text-warm-gray-deep underline underline-offset-4 hover:text-charcoal"
                      >
                        Delete<span className="sr-only"> {g.title}</span>
                      </button>
                    </div>
                  </div>
                </article>
              )
            }}
          />
        )}
      </div>

      <AddGalleryDialog open={adding} onCancel={() => setAdding(false)} onCreate={create} />

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this gallery?"
        body={
          toDelete
            ? `Delete “${toDelete.title}”? ${photosGoToo(toDelete.photo_count)}This can't be undone.`
            : ''
        }
        confirmLabel="Delete gallery"
        tone="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
