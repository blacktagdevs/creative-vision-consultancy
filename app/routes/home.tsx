import { Link } from 'react-router'
import type { Route } from './+types/home'
import { CtaBand } from '~/components/CtaBand'
import { Testimonials } from '~/components/Testimonials'
import { getJson, type PortfolioItem, type Testimonial } from '~/lib/api'
import { pageMeta, SITE } from '~/lib/site'
import { asset } from '~/lib/asset'

export const meta: Route.MetaFunction = () =>
  pageMeta(
    null,
    'Full-service wedding and event planning based in Atlanta and serving clients nationwide. Weddings, social celebrations, and corporate events, thoughtfully curated.',
    '/'
  )

// Runs at build time (prerender), not in the visitor's browser.
export async function loader() {
  const [portfolio, reviews] = await Promise.all([
    getJson<{ items: PortfolioItem[] }>('/portfolio'),
    getJson<{ testimonials: Testimonial[] }>('/testimonials'),
  ])
  return { portfolio: portfolio.items.slice(0, 6), testimonials: reviews.testimonials }
}

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

const TEASERS = [
  {
    title: 'Weddings',
    body: 'Full planning, partial planning, and month-of coordination — from vision to execution.',
    href: '/services#weddings',
    image: asset('/images/couple-garden.webp'),
    alt: 'Bride and groom embracing in a garden, her veil catching the light',
  },
  {
    title: 'Social & Corporate',
    body: 'Birthdays, brand events, and corporate gatherings produced with calm leadership.',
    href: '/services#social-corporate',
    // IMAGE: swap with a real CVC social/corporate event photo
    image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80',
    alt: 'An evening celebration table set with candles and flowers',
  },
  {
    title: 'Consulting',
    body: 'One-on-one sessions for the planner who wants direction without full service.',
    href: '/services#consulting',
    // IMAGE: swap with a real CVC consulting/detail photo
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80',
    alt: 'Event details arranged on a styled table',
  },
]

export default function Home({ loaderData }: Route.ComponentProps) {
  const { portfolio, testimonials } = loaderData
  return (
    <>
      {/* HERO — the photo is a portrait with the bride centred, so the words sit
          low and left on a gradient instead of across her face (as they did in
          the stock-photo draft). The top scrim keeps the blended nav legible
          against a bright sky. */}
      <section className="relative h-svh min-h-[620px] overflow-hidden bg-charcoal">
        <img
          src={asset('/images/hero-floral-arch.webp')}
          alt="A bride in an off-the-shoulder gown beneath a floral arch of lavender and pink blooms"
          className="h-full w-full object-cover object-[50%_22%]"
          fetchPriority="high"
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 via-45% to-transparent to-70% md:bg-gradient-to-tr md:from-black/70 md:via-black/20 md:via-40% md:to-transparent md:to-65%" />
        <div className="gutter absolute inset-x-0 bottom-0 pb-14 text-white sm:pb-20 lg:pb-24">
          <p className="label mb-6 text-white/85">Atlanta · Nationwide</p>
          <h1 className="max-w-[13ch] text-[clamp(42px,6.5vw,92px)] leading-[1.04]">
            Transforming visions into <em className="text-rose">extraordinary</em> experiences.
          </h1>
          <Link to="/inquire" className="btn-outline mt-10 border-white/60 hover:border-white hover:bg-white hover:text-charcoal sm:mt-12">
            Inquire Here
          </Link>
        </div>
      </section>

      {/* INTRO */}
      <section className="gutter mx-auto grid max-w-[1320px] items-center gap-16 py-28 md:grid-cols-2 lg:gap-28 lg:py-40">
        <div>
          <p className="label mb-6">— A Full-Service Studio</p>
          <h2 className="section-title">Curated celebrations, thoughtfully planned.</h2>
          <p className="max-w-[48ch] text-[17px] leading-[1.75] text-ink">
            {SITE.name} is a full-service wedding and event management company serving weddings, social, and
            corporate events. From intimate gatherings to large-scale celebrations, we transform your vision into a
            seamless, thoughtfully curated experience that feels personal, intentional, and unforgettable.
          </p>
          <Link to="/about" className="link-underline mt-10 inline-block">
            Our Story →
          </Link>
        </div>
        <div className="aspect-[4/5] overflow-hidden">
          <img
            src={asset('/images/bride-robe-window.webp')}
            alt="A bride in a tulle robe seated by a sunlit window"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </section>

      {/* SERVICES TEASER */}
      <section className="gutter bg-ivory-deep py-28 lg:py-36">
        <div className="mx-auto max-w-[1320px]">
          <p className="label mb-6">— Services</p>
          <h2 className="section-title">A practice built around presence and precision.</h2>
          <div className="mt-16 grid gap-14 md:grid-cols-3 md:gap-12">
            {TEASERS.map((t) => (
              <Link key={t.title} to={t.href} className="group block">
                <div className="mb-7 aspect-[3/4] overflow-hidden">
                  <img
                    src={t.image}
                    alt={t.alt}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                </div>
                <h3 className="mb-3 text-[28px]">{t.title}</h3>
                <p className="mb-5 text-[14px] leading-[1.7] text-warm-gray-deep">{t.body}</p>
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
              <p className="label mb-6">— Selected Work</p>
              <h2 className="section-title mb-0">A selection of recent celebrations.</h2>
            </div>
            <Link to="/gallery" className="link-underline">
              View the Gallery →
            </Link>
          </div>
          <div className="gutter mt-16 grid gap-4 md:grid-cols-12 md:gap-6">
            {portfolio.map((p, i) => (
              <Link key={p.id} to={`/gallery/${p.slug}`} className={`group relative overflow-hidden bg-ivory-deep ${GRID_SLOTS[i]}`}>
                {p.cover_url && (
                  <img
                    src={p.cover_url}
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

      <CtaBand />
    </>
  )
}
