import { useState } from 'react'
import type { Route } from './+types/testimonials'
import { CapCounter } from '~/components/admin/CapCounter'
import { ConfirmDialog } from '~/components/admin/ConfirmDialog'
import { Notice } from '~/components/admin/Notice'
import { SortableList } from '~/components/admin/SortableList'
import { messageFor } from '~/components/admin/service/errors'
import { NewTestimonialForm, TestimonialEditor } from '~/components/admin/service/TestimonialEditor'
import { useResourceList } from '~/lib/admin/useResourceList'
import type { AdminTestimonial } from '~/lib/admin/types'

export const meta: Route.MetaFunction = () => [
  { title: 'Testimonials | CVC Admin' },
  { name: 'robots', content: 'noindex' },
]

export default function TestimonialsScreen() {
  const { items, count, limit, loading, error, notice, create, update, remove, reorder } =
    useResourceList<AdminTestimonial>('testimonials')
  const [adding, setAdding] = useState(false)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<AdminTestimonial | null>(null)
  const [deleting, setDeleting] = useState(false)
  // `limit` is 0 until the list loads, so only call it full once it has.
  const full = !loading && count >= limit

  function reorderList(ids: string[]) {
    setActionError('')
    reorder(ids).catch((err) => setActionError(messageFor(err)))
  }

  async function setShown(item: AdminTestimonial, shown: boolean) {
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
      <h1 className="text-[clamp(2.2rem,5vw,3.25rem)] leading-[1.05]">Testimonials</h1>
      <p className="mt-4 max-w-prose text-[16px] text-ink">
        These appear at the bottom of the home page. Drag a row, or use Move up and Move down, to change their order.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {loading ? (
          <p className="text-[14px] text-warm-gray-deep">Loading…</p>
        ) : (
          <CapCounter count={count} limit={limit} noun="testimonials" />
        )}
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={loading || full || adding}
          className="inline-flex min-h-11 w-fit items-center justify-center bg-charcoal px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-ivory disabled:opacity-50"
        >
          Add testimonial
        </button>
      </div>
      {full && (
        <p className="mt-3 text-[14px] text-ink">
          You’ve reached the limit of {limit} testimonials. Delete one to add another.
        </p>
      )}

      {(error || notice || actionError) && (
        <div className="mt-8 flex flex-col gap-3">
          {error && <Notice tone="error">{error}</Notice>}
          {notice && <Notice>{notice}</Notice>}
          {actionError && <Notice tone="error">{actionError}</Notice>}
        </div>
      )}

      <div className="mt-8">
        {!loading && items.length === 0 && !adding && (
          <p className="text-[15px] text-ink">No testimonials yet.</p>
        )}
        {items.length > 0 && (
          <SortableList
            items={items}
            getId={(item) => item.id}
            getLabel={(item) => `Testimonial from ${item.attribution}`}
            onReorder={reorderList}
            renderItem={(item) => (
              <div className="border border-line bg-ivory p-4 md:p-6">
                <TestimonialEditor
                  item={item}
                  busy={busyId === item.id}
                  onSave={async (patch) => {
                    await update(item.id, patch)
                  }}
                  onShown={(shown) => setShown(item, shown)}
                  onDelete={() => setToDelete(item)}
                />
              </div>
            )}
          />
        )}
      </div>

      {adding && (
        <div className="mt-6 border border-line bg-ivory-deep p-4 md:p-6">
          <NewTestimonialForm onCreate={create} onDone={() => setAdding(false)} />
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this testimonial?"
        body={toDelete ? `The quote from “${toDelete.attribution}” will be removed. This can’t be undone.` : ''}
        confirmLabel="Delete testimonial"
        tone="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
