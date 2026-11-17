import { Link } from 'react-router'
import type { Route } from './+types/home'
import { CtaBand } from '~/components/CtaBand'
import { Paragraphs } from '~/components/Paragraphs'
import { Testimonials } from '~/components/Testimonials'
import { getJson, type PortfolioItem, type Testimonial } from '~/lib/api'
import { pageMeta } from '~/lib/site'
import { ACCENT, accentOf } from '~/lib/accent'
import { emphasised } from '~/lib/emphasis'
import { sized } from '~/lib/image'
import { live } from '~/lib/live'
import { HOME_DEFAULTS, loadPage } from '~/lib/pages'

export const meta: Route.MetaFunction = () =>
  pageMeta(
    null,
    'Full-service wedding and event planning based in Atlanta and serving clients nationwide. Weddings, social celebrations, and corporate events, thoughtfully curated.',
    '/'
  )

// Content for the page: read at build time (prerender) and again in the browser.
// `content` is the page's own words and photos, which she edits under Pages in
// the admin; anything she hasn't changed arrives as the original.
async function load() {
  const [content, portfolio, reviews] = await Promise.all([
    loadPage('home'),
    getJson<{ items: PortfolioItem[] }>('/portfolio'),
    getJson<{ testimonials: Testimonial[] }>('/testimonials'),
  ])
  return { content, portfolio: portfolio.items.slice(0, 6), testimonials: reviews.testimonials }
}

export const loader = load

// In the browser: fetch again so visitors see edits made since the last build.
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return live(load, serverLoader)
}
clientLoader.hydrate = true as const

// Direction A's editorial grid: two wide, three tall, one panoramic. Each slot
// is a 12-column span and an aspect ratio; on phones everything stacks.
const GRID_SLOTS = [
  'md:col-span-7 aspect-[4/3]',
  'md:col-span-5 aspect-[4/5]',
  'md:col-span-4 aspect-[3/4]',
  'md:col-span-4 aspect-[3/4]',
  'md:col-span-4 aspect-[3/4]',
  'md:col-span-12 aspect-[4/3] md:aspect-[21/9]',
]

// The three service cards. Their words and photos are editable; where each one
// leads is not, so the card and its link can't drift apart.
const TEASERS = [
  { n: 1, href: '/services#weddings' },
  { n: 2, href: '/services#social-corporate' },
  { n: 3, href: '/services#consulting' },
] as const

export default function Home({ loaderData }: Route.ComponentProps) {
  const { content: c, portfolio, testimonials } = loaderData
  // The crop below was tuned by eye for the original hero photo. A photo she
  // uploads is an unknown, so it gets a general-purpose crop instead: centred,
  // a quarter of the way down, which keeps the upper third of a portrait (where
  // faces usually are) in view on a wide screen, clear of the nav and the words.
  const heroCrop = c.hero_image_url === HOME_DEFAULTS.hero_image_url ? 'object-[50%_22%]' : 'object-[50%_25%]'
  return (
    <>
      {/* HERO — the photo is a portrait with the bride centred, so the words sit
          low and left on a gradient instead of across her face (as they did in
          the stock-photo draft). The top scrim keeps the blended nav legible
          against a bright sky. */}
      <section className="relative h-svh min-h-[620px] overflow-hidden bg-charcoal">
        <img
          src={sized(c.hero_image_url, 'large')}
          alt={c.hero_image_alt}
          className={`h-full w-full object-cover ${heroCrop}`}
          fetchPriority="high"
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 via-45% to-transparent to-70% md:bg-gradient-to-tr md:from-black/70 md:via-black/20 md:via-40% md:to-transparent md:to-65%" />
        <div className="gutter absolute inset-x-0 bottom-0 pb-14 text-white sm:pb-20 lg:pb-24">
          <p className="label mb-6 text-white/85">{c.hero_eyebrow}</p>
          <h1 className="max-w-[13ch] text-[clamp(42px,6.5vw,92px)] leading-[1.04]">
            {emphasised(c.hero_title, 'text-rose')}
          </h1>
          <Link to="/inquire" className="btn-outline mt-10 border-white/60 hover:border-white hover:bg-white hover:text-charcoal sm:mt-12">
            Inquire Here
          </Link>
        </div>
      </section>

      {/* INTRO */}
      <section className="gutter mx-auto grid max-w-[1320px] items-center gap-16 py-28 md:grid-cols-2 lg:gap-28 lg:py-40">
        <div>
          <p className="label mb-6">{`— ${c.intro_eyebrow}`}</p>
          <h2 className="section-title">{emphasised(c.intro_title)}</h2>
          <Paragraphs text={c.intro_body} className="max-w-[48ch] space-y-6 text-[17px] leading-[1.75] text-ink" />
          <Link to="/about" className="link-underline mt-10 inline-block">
            Our Story →
          </Link>
        </div>
        <div className="aspect-[4/5] overflow-hidden">
          <img
            src={sized(c.intro_image_url, 'large')}
            alt={c.intro_image_alt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </section>

      {/* SERVICES TEASER */}
      <section className="gutter bg-ivory-deep py-28 lg:py-36">
        <div className="mx-auto max-w-[1320px]">
          <p className="label mb-6">{`— ${c.services_eyebrow}`}</p>
          <h2 className="section-title">{emphasised(c.services_title)}</h2>
          <div className="mt-16 grid gap-14 md:grid-cols-3 md:gap-12">
            {TEASERS.map(({ n, href }) => (
              <Link key={href} to={href} className="group block">
                <div className="mb-7 aspect-[3/4] overflow-hidden">
                  <img
                    src={sized(c[`teaser_${n}_image_url`], 'thumb')}
                    alt={c[`teaser_${n}_image_alt`]}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                </div>
                <h3 className="mb-3 text-[28px]">{emphasised(c[`teaser_${n}_title`])}</h3>
                <Paragraphs
                  text={c[`teaser_${n}_body`]}
                  className="mb-5 space-y-3 text-[14px] leading-[1.7] text-warm-gray-deep"
                />
                <span className="link-underline">View Packages →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      {portfolio.length > 0 && (
        <section className="pt-28 lg:pt-36">
          <div className="gutter mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-6">
            <div>
              <p className="label mb-6">{`— ${c.portfolio_eyebrow}`}</p>
              <h2 className="section-title mb-0">{emphasised(c.portfolio_title)}</h2>
            </div>
            <Link to="/gallery" className="link-underline">
              View the Gallery →
            </Link>
          </div>
          <div className="gutter mt-16 grid gap-4 md:grid-cols-12 md:gap-6">
            {portfolio.map((p, i) => (
              <Link key={p.id} to={`/gallery/${p.slug}`} className={`group relative overflow-hidden ${ACCENT[accentOf(p.accent)].bg} ${GRID_SLOTS[i]}`}>
                {p.cover_url && (
                  <img
                    src={sized(p.cover_url, 'thumb')}
                    alt={p.cover_alt || p.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent p-5 pt-16 text-white md:opacity-0 md:transition-opacity md:duration-500 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
                  <span className="display text-[22px]">{p.title}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* TESTIMONIALS — at the bottom, per the brief */}
      <Testimonials items={testimonials} />

      <CtaBand title={c.cta_title} />
    </>
  )
}
