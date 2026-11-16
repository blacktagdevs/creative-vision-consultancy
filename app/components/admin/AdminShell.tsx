import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { Logo } from '~/components/Logo'

const TABS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/galleries', label: 'Galleries', end: false },
  { to: '/admin/services', label: 'Services', end: false },
  { to: '/admin/testimonials', label: 'Testimonials', end: false },
]

type Props = {
  email: string
  onSignOut: () => void
  children: ReactNode
}

/* Chrome shared by every signed-in admin screen. It's a plain tool for the owner
   to use on a phone, so it favours large, obvious controls over the editorial
   pacing of the public site. */
export function AdminShell({ email, onSignOut, children }: Props) {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-11 items-center border-b-2 text-[13px] uppercase tracking-[0.2em] transition-colors ${
      isActive ? 'border-charcoal text-charcoal' : 'border-transparent text-warm-gray-deep hover:text-charcoal'
    }`

  return (
    <div className="min-h-screen bg-ivory">
      <a
        href="#admin-main"
        className="sr-only bg-charcoal px-4 py-2 text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>

      <header className="border-b border-line">
        <div className="gutter flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/admin" className="shrink-0">
              <Logo className="h-11" />
            </Link>
            <span className="label">Admin</span>
          </div>
          <div className="flex items-center gap-5 text-[14px] text-ink">
            <Link to="/" className="min-h-11 inline-flex items-center underline underline-offset-4 hover:text-charcoal">
              View site
            </Link>
            <span className="hidden sm:inline">{email}</span>
            <button
              type="button"
              onClick={onSignOut}
              className="min-h-11 inline-flex items-center hover:text-charcoal"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Wraps rather than scrolling: a sideways strip hid "Testimonials" at phone width. */}
        <nav aria-label="Admin sections" className="gutter mt-3">
          <ul className="flex flex-wrap gap-x-6 gap-y-1 whitespace-nowrap">
            {TABS.map((tab) => (
              <li key={tab.to}>
                <NavLink to={tab.to} end={tab.end} className={tabClass}>
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="admin-main" tabIndex={-1} className="gutter mx-auto max-w-5xl py-10 focus:outline-none md:py-14">
        {children}
      </main>
    </div>
  )
}
