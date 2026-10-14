import { useSearchParams } from 'react-router'
import type { Route } from './+types/inquire'
import { InquiryEmbed } from '~/components/InquiryEmbed'
import { PageHeader } from '~/components/PageHeader'
import { getJson, type Service } from '~/lib/api'
import { pageMeta } from '~/lib/site'

export const meta: Route.MetaFunction = () =>
  pageMeta(
    'Inquire',
    'Begin your inquiry with Creative Vision Consultancy for wedding planning, social and corporate events, or consulting.',
    '/inquire'
  )

export async function loader() {
  const { services } = await getJson<{ services: Service[] }>('/services')
  return { services: services.map((s) => ({ slug: s.slug, name: s.name })) }
}

export default function Inquire({ loaderData }: Route.ComponentProps) {
  // "Inquire Here" on a service links to /inquire?service=<slug>. The page is
  // prerendered without a query, so this resolves in the browser.
  const [params] = useSearchParams()
  const chosen = loaderData.services.find((s) => s.slug === params.get('service'))

  return (
    <>
      <PageHeader
        eyebrow="Inquire"
        title="Let’s Begin"
        lede="We look forward to creating something unforgettable with you."
      />
      <section className="gutter mx-auto max-w-[900px] py-20 lg:py-28">
        {chosen && (
          <p className="label mb-10 text-center">
            Inquiring about <span className="text-charcoal">{chosen.name}</span>
          </p>
        )}
        <InquiryEmbed />
        <p className="mx-auto mt-14 max-w-[56ch] text-center text-[14px] leading-[1.8] text-warm-gray-deep">
          We intentionally take on a limited number of events to ensure exceptional service. Submitting an inquiry
          does not guarantee availability.
        </p>
      </section>
    </>
  )
}
