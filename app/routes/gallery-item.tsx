import { useCallback, useState } from 'react'
import { data, Link } from 'react-router'
import type { Route } from './+types/gallery-item'
import { CtaBand } from '~/components/CtaBand'
import { Lightbox } from '~/components/Lightbox'
import { getJson, type Photo, type PortfolioItem } from '~/lib/api'
import { formatEventMonth, paragraphs, PORTFOLIO_CATEGORY_LABEL } from '~/lib/format'
import { pageMeta } from '~/lib/site'
import { sized } from '~/lib/image'

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const [detail, list] = await Promise.all([
      getJson<{ item: PortfolioItem; photos: Photo[] }>(`/portfolio/${encodeURIComponent(params.slug)}`),
      getJson<{ items: PortfolioItem[] }>('/portfolio'),
    ])
    // The next gallery in her chosen order, wrapping round, for the footer link.
    const at = list.items.findIndex((i) => i.id === detail.item.id)
    const next = list.items.length > 1 ? list.items[(at + 1) % list.items.length] : null
    return { ...detail, next }
  } catch (err) {
    if ((err as { status?: number }).status === 404) throw data('Not found', { status: 404 })
    throw err
  }
}

export const meta: Route.MetaFunction = ({ loaderData, params }) => {
  if (!loaderData) return [{ title: 'Not found' }]
  const { item } = loaderData
  const description =
    item.summary ||
    `${item.title} — a ${PORTFOLIO_CATEGORY_LABEL[item.category].toLowerCase()} planned by Creative Vision Consultancy.`
  return pageMeta(item.title, description, `/gallery/${params.slug}`)
}

export default function GalleryItem({ loaderData }: Route.ComponentProps) {
  const { item, photos, next } = loaderData
  const [open, setOpen] = useState<number | null>(null)
  const close = useCallback(() => setOpen(null), [])
  const when = formatEventMonth(item.event_date)

  return (
    <>
      <section className="gutter border-b border-line pb-16 pt-36 text-center sm:pb-20 sm:pt-44">
        <Link to="/gallery" className="label mb-7 inline-block hover:text-charcoal">
          ← Gallery
        </Link>
        <h1 className="mx-auto max-w-[18ch] text-[clamp(44px,7vw,96px)] leading-[1.02]">{item.title}</h1>
        <p className="label mt-8">
          {[PORTFOLIO_CATEGORY_LABEL[item.category], when, item.location].filter(Boolean).join(' · ')}
        </p>
        {item.summary && (
          <div className="display mx-auto mt-8 max-w-[52ch] space-y-4 text-[19px] italic leading-relaxed text-warm-gray-deep">
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

      {next && (
        <section className="gutter border-t border-line py-20 text-center">
          <p className="label mb-5">Next</p>
          <Link to={`/gallery/${next.slug}`} className="display text-[clamp(32px,4vw,52px)] leading-tight hover:text-rose-deep">
            {next.title} →
          </Link>
        </section>
      )}

      <CtaBand />
      <Lightbox photos={photos} index={open} title={item.title} onChange={setOpen} onClose={close} />
    </>
  )
}
