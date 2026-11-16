import { Link } from 'react-router'
import type { Route } from './+types/gallery'
import { CtaBand } from '~/components/CtaBand'
import { PageHeader } from '~/components/PageHeader'
import { ACCENT, accentOf } from '~/lib/accent'
import { getJson, type PortfolioItem } from '~/lib/api'
import { formatEventMonth, PORTFOLIO_CATEGORY_LABEL, paragraphs } from '~/lib/format'
import { pageMeta } from '~/lib/site'
import { sized } from '~/lib/image'
import { live } from '~/lib/live'

const INTRO =
  'Explore a curated selection of weddings, celebrations, and social events that reflect our signature approach. Each event is designed to feel effortless for our clients and seamless for their guests.'

export const meta: Route.MetaFunction = () => pageMeta('Gallery', INTRO, '/gallery')

async function load() {
  const { items } = await getJson<{ items: PortfolioItem[] }>('/portfolio')
  return { items }
}

export const loader = load

// In the browser: fetch again so visitors see edits made since the last build.
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return live(load, serverLoader)
}
clientLoader.hydrate = true as const

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
            {items.map((p, i) => {
              const a = ACCENT[accentOf(p.accent)]
              return (
                // Every third card in the desktop grid drops lower, for an editorial rhythm.
                <li key={p.id} className={i % 3 === 1 ? 'lg:translate-y-16' : ''}>
                  <Link to={`/gallery/${p.slug}`} className={`group block p-4 transition-colors duration-500 sm:p-5 ${a.bg} ${a.bgHover}`}>
                    <div className="aspect-[4/5] overflow-hidden bg-white/40">
                      {p.cover_url && (
                        <img
                          src={sized(p.cover_url, 'thumb')}
                          alt={p.cover_alt || p.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          loading={i < 3 ? 'eager' : 'lazy'}
                        />
                      )}
                    </div>
                    <div className="px-1 pb-2 pt-6">
                      <p className={`label mb-2 ${a.deep}`}>
                        {PORTFOLIO_CATEGORY_LABEL[p.category]}
                        {p.event_date ? ` · ${formatEventMonth(p.event_date)}` : ''}
                      </p>
                      <h2 className="text-[28px] leading-tight">{p.title}</h2>
                      {/* A teaser: the opening paragraph, cut at three lines. The
                          whole description is on the gallery's own page. */}
                      {p.summary && (
                        <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-ink">
                          {paragraphs(p.summary)[0]}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <div className="lg:h-16" />
      <CtaBand />
    </>
  )
}
