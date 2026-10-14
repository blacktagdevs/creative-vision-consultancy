import { Outlet } from 'react-router'
import { Footer } from '~/components/Footer'
import { Nav } from '~/components/Nav'

export default function SiteLayout() {
  return (
    <>
      <a href="#main" className="sr-only z-50 bg-charcoal px-4 py-2 text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
