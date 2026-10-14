import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { NAV, SITE } from '~/lib/site'

// Fixed nav. Over the home hero it's white on the photo; everywhere else, and
// once the hero scrolls away, it's charcoal on an ivory bar. (Direction A used
// mix-blend-mode: difference instead, which turned muddy grey over the real
// hero's bright sky.)
//
// On phones the links collapse behind a hamburger into a dropdown that hangs
// from the bar. It deliberately doesn't take over the screen: the page stays
// in view, and a tap anywhere outside the dropdown closes it.
export function Nav() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    if (!isHome) return
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight - 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // An open dropdown joins the bar into one ivory block, even over the hero.
  const light = isHome && !pastHero && !open

  return (
    <>
      {/* Invisible layer under the dropdown: a tap outside it closes the menu. */}
      {open && <div className="fixed inset-0 z-30 md:hidden" aria-hidden onClick={() => setOpen(false)} />}

      <header
        className={`fixed inset-x-0 top-0 z-40 transition-[background-color,color] duration-300 ${
          light
            ? 'text-white'
            : `${open ? 'bg-ivory' : 'bg-ivory/95 backdrop-blur-sm'} text-charcoal shadow-[0_1px_0_var(--color-line)]`
        }`}
      >
        <div
          className={`gutter flex items-center justify-between transition-[padding] duration-300 ${
            light ? 'py-6 lg:py-7' : 'py-4 lg:py-5'
          }`}
        >
          <Link to="/" className="display text-[17px] tracking-[0.14em] sm:text-[20px]" aria-label={`${SITE.name} home`}>
            Creative Vision Consultancy
          </Link>
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex gap-9 text-[11px] uppercase tracking-[0.22em] lg:gap-11">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `transition-opacity hover:opacity-60 ${isActive ? 'border-b border-current pb-1' : ''}`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <button
            type="button"
            className="-mr-2.5 p-2.5 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {open && (
          <nav id="mobile-menu" aria-label="Main" className="gutter border-t border-line pb-6 md:hidden">
            <ul>
              {NAV.map((item) => (
                <li key={item.to} className="border-b border-line last:border-b-0">
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center justify-between py-3.5 text-[11px] uppercase tracking-[0.22em] ${
                        isActive ? 'text-charcoal' : 'text-warm-gray-deep'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {item.label}
                        {isActive && <span className="h-1 w-1 rounded-full bg-rose-deep" aria-hidden />}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
    </>
  )
}

// Thin strokes to match the 1px rules used across the site. currentColor, so
// the icon follows the nav: white over the hero, charcoal on ivory.
function MenuIcon() {
  return (
    <svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <line x1="0" y1="1" x2="26" y2="1" />
      <line x1="0" y1="7" x2="26" y2="7" />
      <line x1="0" y1="13" x2="26" y2="13" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <line x1="6" y1="0" x2="20" y2="14" />
      <line x1="20" y1="0" x2="6" y2="14" />
    </svg>
  )
}
