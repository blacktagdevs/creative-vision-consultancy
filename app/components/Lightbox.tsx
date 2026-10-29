import { useEffect, useRef } from 'react'
import type { Photo } from '~/lib/api'
import { sized } from '~/lib/image'

// Full-screen photo viewer on a native <dialog>, which brings focus trapping,
// Escape to close, and an inert background for free. Arrow keys step through.
export function Lightbox({
  photos,
  index,
  title,
  onChange,
  onClose,
}: {
  photos: Photo[]
  index: number | null
  title: string
  onChange: (i: number) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const open = index !== null

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onChange((index + 1) % photos.length)
      if (e.key === 'ArrowLeft') onChange((index - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, index, photos.length, onChange])

  const at = index ?? 0
  const photo = open ? photos[at] : null

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={`${title} photos`}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-charcoal/95 p-0 text-ivory backdrop:bg-black/60"
    >
      {photo && (
        <div className="flex h-full flex-col">
          <div className="gutter flex items-center justify-between py-5 text-[11px] uppercase tracking-[0.22em]">
            <span>
              {at + 1} / {photos.length}
            </span>
            <button type="button" onClick={onClose} className="-mr-2 p-2" autoFocus>
              Close
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-16">
            <img src={sized(photo.image_url, 'large')} alt={photo.alt || title} className="max-h-full max-w-full object-contain" />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => onChange((at - 1 + photos.length) % photos.length)}
                  className="absolute left-0 top-0 h-full w-1/4 text-left text-3xl opacity-60 hover:opacity-100 sm:w-16 sm:text-center"
                >
                  <span className="px-3">‹</span>
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => onChange((at + 1) % photos.length)}
                  className="absolute right-0 top-0 h-full w-1/4 text-right text-3xl opacity-60 hover:opacity-100 sm:w-16 sm:text-center"
                >
                  <span className="px-3">›</span>
                </button>
              </>
            )}
          </div>
          {photo.alt && <p className="gutter pb-6 text-center text-[13px] text-ivory/70">{photo.alt}</p>}
        </div>
      )}
    </dialog>
  )
}
