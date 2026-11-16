import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { Route } from './+types/services'
import { CapCounter } from '~/components/admin/CapCounter'
import { ConfirmDialog } from '~/components/admin/ConfirmDialog'
import { Notice } from '~/components/admin/Notice'
import { ShowOnSiteToggle } from '~/components/admin/ShowOnSiteToggle'
import { SortableList } from '~/components/admin/SortableList'
import { AddServiceDialog } from '~/components/admin/service/AddServiceDialog'
import { messageFor } from '~/components/admin/service/errors'
import { orderAfterGroupMove } from '~/components/admin/service/order'
import { CATEGORIES, CATEGORY_LABEL, priceLine, type ServiceCategory } from '~/components/admin/service/labels'
import { useResourceList } from '~/lib/admin/useResourceList'
import type { AdminService } from '~/lib/admin/types'
import { sized } from '~/lib/image'

export const meta: Route.MetaFunction = () => [
  { title: 'Services | CVC Admin' },
  { name: 'robots', content: 'noindex' },
]

export default function ServicesScreen() {
  const navigate = useNavigate()
  const { items, count, limit, loading, error, notice, create, update, remove, reorder } =
    useResourceList<AdminService>('services')
  const [adding, setAdding] = useState(false)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<AdminService | null>(null)
  const [deleting, setDeleting] = useState(false)
  // `limit` is 0 until the list loads, so only call it full once it has.
  const full = !loading && count >= limit

  function reorderGroup(category: ServiceCategory, groupIds: string[]) {
    setActionError('')
    reorder(orderAfterGroupMove(items, category, groupIds)).catch((err) => setActionError(messageFor(err)))
  }

  async function setShown(item: AdminService, shown: boolean) {
    setActionError('')
    setBusyId(item.id)
    try {
      await update(item.id, { status: shown ? 'published' : 'draft' })
    } catch (err) {
      setActionError(messageFor(err))
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await remove(toDelete.id)
    } catch (err) {
      setActionError(messageFor(err))
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  return (
    <>
      <h1 className="text-[clamp(2.2rem,5vw,3.25rem)] leading-[1.05]">Services</h1>
      <p className="mt-4 max-w-prose text-[16px] text-ink">
        The order here is the order on the Services page. Drag a row, or use Move up and Move down.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {loading ? (
          <p className="text-[14px] text-warm-gray-deep">Loading…</p>
        ) : (
          <CapCounter count={count} limit={limit} noun="services" />
        )}
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={loading || full}
          className="inline-flex min-h-11 w-fit items-center justify-center bg-charcoal px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-ivory disabled:opacity-50"
        >
          Add service
        </button>
      </div>
      {full && (
        <p className="mt-3 text-[14px] text-ink">
          You’ve reached the limit of {limit} services. Delete one to add another.
        </p>
      )}

      {(error || notice || actionError) && (
        <div className="mt-8 flex flex-col gap-3">
          {error && <Notice tone="error">{error}</Notice>}
          {notice && <Notice>{notice}</Notice>}
          {actionError && <Notice tone="error">{actionError}</Notice>}
        </div>
      )}

      {CATEGORIES.map((category) => {
        const group = items.filter((item) => item.category === category)
        const headingId = `${category}-heading`
        return (
          <section key={category} aria-labelledby={headingId} className="mt-12">
            <h2 id={headingId} className="text-[28px] leading-tight">
              {CATEGORY_LABEL[category]}
            </h2>
            {loading ? null : group.length === 0 ? (
              <p className="mt-6 text-[15px] text-ink">No services here yet.</p>
            ) : (
              <div className="mt-6">
                <SortableList
                  items={group}
                  getId={(item) => item.id}
                  getLabel={(item) => item.name}
                  onReorder={(ids) => reorderGroup(category, ids)}
                  renderItem={(item) => (
                    <ServiceRow
                      item={item}
                      busy={busyId === item.id}
                      onShown={(shown) => setShown(item, shown)}
                      onDelete={() => setToDelete(item)}
                    />
                  )}
                />
              </div>
            )}
          </section>
        )
      })}

      <AddServiceDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreate={create}
        onCreated={(item) => navigate(`/admin/services/${item.id}`)}
      />
      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this service?"
        body={toDelete ? `“${toDelete.name}” will be removed from the list and from the website. This can’t be undone.` : ''}
        confirmLabel="Delete service"
        tone="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}

function ServiceRow({
  item,
  busy,
  onShown,
  onDelete,
}: {
  item: AdminService
  busy: boolean
  onShown: (shown: boolean) => void
  onDelete: () => void
}) {
  return (
    <div className="border border-line bg-ivory p-4">
      <div className="flex gap-4">
        {item.image_url && (
          <img src={sized(item.image_url, 'thumb')} alt="" className="h-20 w-16 shrink-0 border border-line object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="break-words text-[18px] leading-snug text-charcoal">{item.name}</p>
          <p className="mt-1 text-[14px] text-ink">{priceLine(item)}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-4">
        <ShowOnSiteToggle checked={item.status === 'published'} disabled={busy} onChange={onShown} />
        <div className="flex items-center gap-6">
          <Link
            to={`/admin/services/${item.id}`}
            className="inline-flex min-h-11 items-center text-[14px] text-charcoal underline underline-offset-4"
          >
            Edit
            <span className="sr-only"> {item.name}</span>
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex min-h-11 items-center text-[14px] text-warm-gray-deep underline underline-offset-4 hover:text-charcoal"
          >
            Delete
            <span className="sr-only"> {item.name}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
