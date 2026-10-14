import type { Route } from './+types/about'
import { CtaBand } from '~/components/CtaBand'
import { PageHeader } from '~/components/PageHeader'
import { pageMeta } from '~/lib/site'

export const meta: Route.MetaFunction = () =>
  pageMeta(
    'About',
    'Creative Vision Consultancy is a full-service wedding and event management company based in Atlanta, serving weddings, social, and corporate events nationwide.',
    '/about'
  )

export default function About() {
  return (
    <>
      <PageHeader eyebrow="Our Story" title="About" lede="Care, precision, and respect for the story being told." />

      <section className="gutter mx-auto grid max-w-[1320px] items-center gap-16 py-28 md:grid-cols-2 lg:gap-28 lg:py-36">
        <div className="aspect-[4/5] overflow-hidden">
          <img
            src="/images/couple-garden.webp"
            alt="A groom kissing his bride’s forehead as she holds a bouquet of white roses"
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <p className="label mb-6">— Creative Vision Consultancy</p>
          <h2 className="section-title">Personal, intentional, unforgettable.</h2>
          <div className="max-w-[50ch] space-y-6 text-[17px] leading-[1.75] text-ink">
            <p>
              Creative Vision Consultancy is a full-service wedding and event management company serving weddings,
              social, and corporate events. From intimate gatherings to large-scale celebrations, we transform your
              vision into a seamless, thoughtfully curated experience that feels personal, intentional, and
              unforgettable.
            </p>
            <p>
              From planning to execution, our goal is for clients to fully enjoy their day, knowing every detail has
              been managed and every guest is considered. Based in Atlanta and serving clients nationwide, we approach
              every event with care, precision, and respect for the story being told.
            </p>
          </div>
        </div>
      </section>

      <section className="gutter bg-ivory-deep py-28 lg:py-36">
        <div className="mx-auto grid max-w-[1320px] items-center gap-16 md:grid-cols-2 lg:gap-28">
          <div className="md:order-2">
            {/* IMAGE: owner portrait — not yet supplied by the client */}
            <div className="flex aspect-[4/5] items-end bg-rose/30 p-6">
              <span className="label text-warm-gray-deep">Portrait coming soon</span>
            </div>
          </div>
          <div>
            <p className="label mb-6">— Meet the Owner</p>
            <h2 className="section-title">A dynamic experience curator.</h2>
            <p className="max-w-[50ch] text-[17px] leading-[1.75] text-ink">
              CVC is owned by a dynamic experience curator with a background in event production and business
              management. With over seven years of experience, she is passionate about creating meaningful, memorable
              moments that reflect each client’s vision. Known for her attention to detail and calm, organized
              approach, she ensures every event feels effortless, elevated, and truly personal.
            </p>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
