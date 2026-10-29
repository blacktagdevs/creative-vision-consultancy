import { Link } from 'react-router'
import type { Route } from './+types/services'
import { CtaBand } from '~/components/CtaBand'
import { PageHeader } from '~/components/PageHeader'
import { getJson, type Service, type ServiceCategory } from '~/lib/api'
import { formatPrice, paragraphs } from '~/lib/format'
import { pageMeta } from '~/lib/site'
import { asset } from '~/lib/asset'

export const meta: Route.MetaFunction = () =>
  pageMeta(
    'Services',
    'Wedding full planning, partial planning, and month-of coordination, plus social and corporate event planning and one-on-one consulting.',
    '/services'
  )

export async function loader() {
  const { services } = await getJson<{ services: Service[] }>('/services')
  return { services }
}

const CATEGORIES: { key: ServiceCategory; id: string; label: string; title: string }[] = [
  { key: 'wedding', id: 'weddings', label: '— Weddings', title: 'For the day you’ve imagined.' },
  { key: 'social_corporate', id: 'social-corporate', label: '— Social & Corporate Events', title: 'Beyond the aisle.' },
]

// Shown when a service has no photo of its own. Rotates so neighbours differ.
const FALLBACK_IMAGES = [
  { src: asset('/images/couple-garden.webp'), alt: 'Bride and groom embracing in a garden' },
  { src: asset('/images/bride-robe-smile.webp'), alt: 'A bride smiling in a beaded tulle robe' },
  { src: asset('/images/hero-floral-arch.webp'), alt: 'A bride beneath a floral arch' },
  { src: asset('/images/bride-robe-window.webp'), alt: 'A bride seated by a sunlit window' },
]

export default function Services({ loaderData }: Route.ComponentProps) {
  const { services } = loaderData
  let imageIndex = 0

  return (
    <>
      <PageHeader
        eyebrow="Our Practice"
        title="Services"
        lede="Thoughtfully structured packages for weddings, social, and corporate events. Pricing reflects starting investment — final scope is tailored to each celebration."
      />

      {CATEGORIES.map((cat, ci) => {
        const items = services.filter((s) => s.category === cat.key)
        if (items.length === 0) return null
        return (
          <div key={cat.key}>
            {ci > 0 && <div className="mx-auto my-12 h-px w-20 bg-rose" />}
            <section id={cat.id} className="scroll-mt-20 px-4 pb-10 pt-28 text-center sm:pt-36">
              <p className="label mb-5">{cat.label}</p>
              <h2 className="text-[clamp(44px,6vw,80px)] leading-none">{cat.title}</h2>
            </section>
            {items.map((s, i) => {
              const fallback = FALLBACK_IMAGES[imageIndex++ % FALLBACK_IMAGES.length]
              return (
                <ServiceTier
                  key={s.id}
                  service={s}
                  number={i + 1}
                  flip={i % 2 === 1}
                  image={s.image_url ? { src: s.image_url, alt: s.name } : fallback}
                />
              )
            })}
          </div>
        )
      })}

      <CtaBand title="Not sure which is right for you?" />
    </>
  )
}

function ServiceTier({
  service: s,
  number,
  flip,
  image,
}: {
  service: Service
  number: number
  flip: boolean
  image: { src: string; alt: string }
}) {
  return (
    <article
      id={s.slug}
      className="gutter mx-auto grid max-w-[1320px] scroll-mt-20 items-center gap-12 py-14 md:grid-cols-2 md:gap-16 md:py-20 lg:gap-24"
    >
      <div className={`aspect-[4/5] overflow-hidden ${flip ? 'md:order-2' : ''}`}>
        <img src={image.src} alt={image.alt} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div>
        <p className="display mb-4 text-[18px] italic text-rose-deep">
          {String(number).padStart(2, '0')} · {s.name}
        </p>
        <h3 className="mb-7 text-[clamp(34px,4vw,56px)] leading-[1.05]">{s.name}</h3>
        <div className="max-w-[52ch] space-y-5 text-[16px] leading-[1.8] text-ink">
          {paragraphs(s.description).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {s.bullets.length > 0 && (
          <div className="mt-8 max-w-[52ch]">
            {s.bullets_heading && <p className="label mb-2">{s.bullets_heading}</p>}
            <ul>
              {s.bullets.map((b) => (
                <li key={b} className="display border-b border-line py-3.5 text-[19px]">
                  <span className="text-rose" aria-hidden>
                    —{' '}
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {s.closing_note && (
          <p className="display mt-7 max-w-[52ch] text-[16px] italic text-warm-gray-deep">{s.closing_note}</p>
        )}

        {s.price_from_cents !== null && (
          <p className="mt-8 flex max-w-[52ch] items-baseline gap-3 border-t border-line pt-7">
            <span className="label">{s.price_prefix}</span>
            <span className="display text-[28px] font-normal">{formatPrice(s.price_from_cents)}</span>
          </p>
        )}

        <Link
          to={`/inquire?service=${encodeURIComponent(s.slug)}`}
          className="btn-outline mt-9 border-charcoal hover:bg-charcoal hover:text-ivory"
        >
          Inquire Here
        </Link>
      </div>
    </article>
  )
}
