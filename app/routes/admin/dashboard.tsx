import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { Route } from './+types/dashboard'
import { CapCounter } from '~/components/admin/CapCounter'
import { Notice } from '~/components/admin/Notice'
import { ApiError, apiGet } from '~/lib/admin/api'
import { useAdminContext } from '~/lib/admin/context'
import type { AdminGallery, AdminService, AdminTestimonial, ListResponse } from '~/lib/admin/types'

export const meta: Route.MetaFunction = () => [
  { title: 'Dashboard | CVC Admin' },
  { name: 'robots', content: 'noindex' },
]

type Lists = {
  galleries: ListResponse<AdminGallery>
  services: ListResponse<AdminService>
  testimonials: ListResponse<AdminTestimonial>
}

export default function Dashboard() {
  const { token, onUnauthorized } = useAdminContext()
  const [lists, setLists] = useState<Lists | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([
      apiGet<ListResponse<AdminGallery>>('/admin/portfolio', token),
      apiGet<ListResponse<AdminService>>('/admin/services', token),
      apiGet<ListResponse<AdminTestimonial>>('/admin/testimonials', token),
    ])
      .then(([galleries, services, testimonials]) => {
        if (alive) setLists({ galleries, services, testimonials })
      })
      .catch((err) => {
        if (!alive) return
        if (err instanceof ApiError && err.status === 401) return onUnauthorized()
        setError('Could not load your website content. Try refreshing the page.')
      })
    return () => {
      alive = false
    }
  }, [token, onUnauthorized])

  const shown = (rows: { status: string }[]) => rows.filter((r) => r.status === 'published').length

  return (
    <>
      <h1 className="text-[clamp(2.2rem,5vw,3.25rem)] leading-[1.05]">Your website</h1>
      <p className="mt-4 max-w-prose text-[16px] text-ink">
        Choose what to change below. Anything you save shows on the website as soon as the page is next opened.
      </p>

      {error && (
        <div className="mt-8">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card title="Galleries" to="/admin/galleries">
          {lists ? (
            <>
              <CapCounter count={lists.galleries.count} limit={lists.galleries.limit} noun="galleries" />
              <p className="text-[15px] text-ink">{shown(lists.galleries.items)} shown on website</p>
            </>
          ) : (
            <Loading />
          )}
        </Card>

        <Card title="Services" to="/admin/services">
          {lists ? (
            <>
              <CapCounter count={lists.services.count} limit={lists.services.limit} noun="services" />
              <p className="text-[15px] text-ink">{shown(lists.services.items)} shown on website</p>
            </>
          ) : (
            <Loading />
          )}
        </Card>

        <Card title="Testimonials" to="/admin/testimonials">
          {lists ? (
            <>
              <CapCounter count={lists.testimonials.count} limit={lists.testimonials.limit} noun="testimonials" />
              <p className="text-[15px] text-ink">{shown(lists.testimonials.items)} shown on website</p>
            </>
          ) : (
            <Loading />
          )}
        </Card>

        <section className="flex flex-col border border-line bg-ivory-deep p-6 md:p-8" aria-labelledby="inquiries-heading">
          <h2 id="inquiries-heading" className="text-[28px] leading-tight">
            Inquiries
          </h2>
          <p className="mt-4 flex-1 text-[15px] leading-relaxed text-ink">
            New inquiries arrive in Dubsado, not here. Answer them and send proposals, contracts and invoices
            from your Dubsado account.
          </p>
          <a
            href="https://portal.dubsado.com/login"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex min-h-11 w-fit items-center border-b border-charcoal pb-1 text-[11px] uppercase tracking-[0.3em] text-charcoal"
          >
            Open Dubsado
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </section>
      </div>

      <p className="mt-12">
        <Link to="/" className="inline-flex min-h-11 items-center text-[14px] text-ink underline underline-offset-4 hover:text-charcoal">
          View the website
        </Link>
      </p>
    </>
  )
}

function Card({ title, to, children }: { title: string; to: string; children: ReactNode }) {
  const headingId = `${title.toLowerCase()}-heading`
  return (
    <section className="flex flex-col border border-line bg-ivory p-6 md:p-8" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-[28px] leading-tight">
        {title}
      </h2>
      <div className="mt-4 flex flex-1 flex-col gap-2">{children}</div>
      <Link
        to={to}
        className="mt-8 inline-flex min-h-11 w-fit items-center border-b border-charcoal pb-1 text-[11px] uppercase tracking-[0.3em] text-charcoal"
      >
        Manage
        <span className="sr-only"> {title.toLowerCase()}</span>
      </Link>
    </section>
  )
}

function Loading() {
  return <p className="text-[15px] text-warm-gray-deep">Loading…</p>
}
