import { Link } from 'react-router'
import type { Route } from './+types/gallery'
import { CtaBand } from '~/components/CtaBand'
import { PageHeader } from '~/components/PageHeader'
import { getJson, type PortfolioItem } from '~/lib/api'
import { formatEventMonth, PORTFOLIO_CATEGORY_LABEL } from '~/lib/format'
import { pageMeta } from '~/lib/site'

const INTRO =
  'Explore a curated selection of weddings, celebrations, and social events that reflect our signature approach. Each event is designed to feel effortless for our clients and seamless for their guests.'

export const meta: Route.MetaFunction = () => pageMeta('Gallery', INTRO, '/gallery')

export async function loader() {
  const { items } = await getJson<{ items: PortfolioItem[] }>('/portfolio')
  return { items }
}

export default function Gallery({ loaderData }: Route.ComponentProps) {
  const { items } = loaderData
  return (
    <>
      <PageHeader eyebrow="Portfolio" title="Gallery" lede={INTRO} />
      <section className="gutter mx-auto max-w-[1320px] py-24 lg:py-32">
        {items.length === 0 ? (
          <p className="text-center text-warm-gray-deep">New work is on its way.</p>
        ) : (
          <ul className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-12 lg:gap-y-20">
            {items.map((p, i) => (
              // Every third card in the desktop grid drops lower, for an editorial rhythm.
              <li key={p.id} className={i % 3 === 1 ? 'lg:translate-y-16' : ''}>
                <Link to={`/gallery/${p.slug}`} className="group block">
                  <div className="mb-6 aspect-[4/5] overflow-hidden bg-ivory-deep">
                    {p.cover_url && (
                      <img
                        src={p.cover_url}
                        alt={p.cover_alt || p.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        loading={i < 3 ? 'eager' : 'lazy'}
                      />
                    )}
                  </div>
                  <p className="label mb-2">
                    {PORTFOLIO_CATEGORY_LABEL[p.category]}
                    {p.event_date ? ` · ${formatEventMonth(p.event_date)}` : ''}
                  </p>
                  <h2 className="text-[28px] leading-tight">{p.title}</h2>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="lg:h-16" />
      <CtaBand />
    </>
  )
}
