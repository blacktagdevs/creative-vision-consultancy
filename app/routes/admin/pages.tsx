import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Route } from './+types/pages'
import { ApiError, apiGet } from '~/lib/admin/api'
import { useAdminContext } from '~/lib/admin/context'
import { PAGES, pageStatus, type PageInfo } from '~/lib/admin/pages'
import type { AdminPage } from '~/lib/admin/types'
import { sized } from '~/lib/image'
import { mergePage, type PageName } from '~/lib/pages'

export const meta: Route.MetaFunction = () => [
  { title: 'Pages | CVC Admin' },
  { name: 'robots', content: 'noindex' },
]

export default function PagesScreen() {
  const { token, onUnauthorized } = useAdminContext()
  // The list itself never changes, so it shows at once. What the API adds is
  // each page's current photo and when it was last changed; if that can't be
  // fetched the rows are still usable, and the editor reports the problem.
  const [loaded, setLoaded] = useState<Partial<Record<PageName, AdminPage>>>({})

  useEffect(() => {
    let alive = true
    for (const { page } of PAGES) {
      apiGet<AdminPage>(`/admin/pages/${page}`, token)
        .then((res) => {
          if (alive) setLoaded((all) => ({ ...all, [page]: res }))
        })
        .catch((err) => {
          if (alive && err instanceof ApiError && err.status === 401) onUnauthorized()
        })
    }
    return () => {
      alive = false
    }
  }, [token, onUnauthorized])

  return (
    <>
      <h1 className="text-[clamp(2.2rem,5vw,3.25rem)] leading-[1.05]">Pages</h1>
      <p className="mt-4 max-w-prose text-[16px] text-ink">
        Change the words and photos on your Home and About pages.
      </p>

      <ul className="mt-10 flex max-w-2xl flex-col gap-4">
        {PAGES.map((info) => (
          <li key={info.page}>
            <PageRow info={info} saved={loaded[info.page]} />
          </li>
        ))}
      </ul>
    </>
  )
}

function PageRow({ info, saved }: { info: PageInfo; saved?: AdminPage }) {
  const content: Record<string, string | null> = mergePage(info.page, saved?.content)
  const photo = content[info.thumbKey]

  return (
    <div className="border border-line bg-ivory p-4">
      <div className="flex gap-4">
        {photo && <img src={sized(photo, 'thumb')} alt="" className="h-20 w-16 shrink-0 border border-line object-cover" />}
        <div className="min-w-0 flex-1">
          <h2 className="text-[28px] leading-tight">{info.title}</h2>
          <p className="mt-1 text-[15px] text-ink">{info.blurb}</p>
          {saved && <p className="mt-1 text-[14px] text-warm-gray-deep">{pageStatus(saved.content, saved.updated_at)}</p>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4">
        <Link
          to={`/admin/pages/${info.page}`}
          className="inline-flex min-h-11 items-center justify-center bg-charcoal px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-ivory"
        >
          Edit
          <span className="sr-only"> the {info.title} page</span>
        </Link>
        <Link
          to={info.path}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center text-[14px] text-charcoal underline underline-offset-4"
        >
          View on website
          <span className="sr-only">: {info.title} (opens in a new tab)</span>
        </Link>
      </div>
    </div>
  )
}
