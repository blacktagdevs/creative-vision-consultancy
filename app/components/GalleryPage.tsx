import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { CtaBand } from '~/components/CtaBand'
import { Lightbox } from '~/components/Lightbox'
import { ACCENT, accentOf } from '~/lib/accent'
import { formatEventMonth, paragraphs, PORTFOLIO_CATEGORY_LABEL } from '~/lib/format'
import type { GalleryData } from '~/lib/gallery-detail'
import { sized } from '~/lib/image'

// One gallery's page. Rendered by both gallery routes (see app/routes.ts):
// a route's component only receives its loaded data when it is declared in
// the route's own file, so each route wraps this rather than re-exporting it.
export function GalleryPage({ item, photos, next }: GalleryData) {
  const [open, setOpen] = useState<number | null>(null)
  const close = useCallback(() => setOpen(null), [])
  const when = formatEventMonth(item.event_date)
  const tone = ACCENT[accentOf(item.accent)]
  const nextTone = next ? ACCENT[accentOf(next.accent)] : null

  return (
    <>
      <section className={`gutter pb-16 pt-36 text-center sm:pb-20 sm:pt-44 ${tone.bg}`}>
        <Link to="/gallery" className={`label mb-7 inline-block hover:text-charcoal ${tone.deep}`}>
          ← Gallery
        </Link>
        <h1 className="mx-auto max-w-[18ch] text-[clamp(44px,7vw,96px)] leading-[1.02]">{item.title}</h1>
        <p className={`label mt-8 ${tone.deep}`}>
          {[PORTFOLIO_CATEGORY_LABEL[item.category], when, item.location].filter(Boolean).join(' · ')}
        </p>
        {item.summary && (
          <div className="display mx-auto mt-8 max-w-[52ch] space-y-4 text-[19px] italic leading-relaxed text-ink">
            {paragraphs(item.summary).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </section>

      <section className="gutter py-16 lg:py-24">
        {/* CSS columns: a masonry that keeps each photo's own proportions. */}
        <ul className="mx-auto max-w-[1440px] columns-1 gap-4 sm:columns-2 lg:columns-3 lg:gap-6">
          {photos.map((p, i) => (
            <li key={p.id} className="mb-4 break-inside-avoid lg:mb-6">
              <button type="button" onClick={() => setOpen(i)} className="group block w-full overflow-hidden" aria-label={`Open photo ${i + 1}`}>
                <img
                  src={sized(p.image_url, 'thumb')}
                  alt={p.alt || `${item.title}, photo ${i + 1}`}
                  width={p.width ?? undefined}
                  height={p.height ?? undefined}
                  className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.02]"
                  loading={i < 3 ? 'eager' : 'lazy'}
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {next && nextTone && (
        <section className={`gutter py-20 text-center ${nextTone.bg}`}>
          <p className={`label mb-5 ${nextTone.deep}`}>Next</p>
          <Link to={`/gallery/${next.slug}`} className="display text-[clamp(32px,4vw,52px)] leading-tight hover:underline hover:decoration-1 hover:underline-offset-8">
            {next.title} →
          </Link>
        </section>
      )}

      <CtaBand />
      <Lightbox photos={photos} index={open} title={item.title} onChange={setOpen} onClose={close} />
    </>
  )
}
