import { Link } from 'react-router'
import { LOGIN, NAV, SITE } from '~/lib/site'
import { Logo } from './Logo'

export function Footer() {
  const social = Object.entries(SITE.social).filter(([, url]) => url)
  return (
    <footer className="gutter border-t border-line pb-12 pt-20 text-[13px] text-warm-gray-deep">
      <div className="mx-auto grid max-w-[1320px] gap-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo className="h-16" />
          <p className="mt-5 max-w-[28ch]">{SITE.tagline}.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2.5">
          {NAV.filter((n) => n.to !== '/').map((n) => (
            <Link key={n.to} to={n.to} className="w-fit hover:text-charcoal">
              {n.label}
            </Link>
          ))}
          <Link to={LOGIN.to} className="mt-2 w-fit border-b border-current pb-0.5 hover:text-charcoal">
            {LOGIN.label}
          </Link>
        </nav>
        {social.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {social.map(([name, url]) => (
              <a key={name} href={url} className="w-fit capitalize hover:text-charcoal" rel="noopener" target="_blank">
                {name}
              </a>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          <span>{SITE.location}</span>
          <span>{SITE.reach}</span>
        </div>
      </div>
      <p className="mx-auto mt-16 max-w-[1320px] text-[11px] tracking-[0.12em]">
        © {new Date().getFullYear()} {SITE.name}
      </p>
    </footer>
  )
}
