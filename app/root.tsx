import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import type { Route } from './+types/root'
import './app.css'
import { asset } from '~/lib/asset'

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: asset('/favicon.svg'), type: 'image/svg+xml' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#faf7f2" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function HydrateFallback() {
  return <div className="min-h-screen bg-ivory" />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404
  return (
    <main className="gutter flex min-h-screen flex-col items-center justify-center text-center">
      <p className="label mb-6">{notFound ? '404' : 'Something went wrong'}</p>
      <h1 className="text-[clamp(40px,6vw,72px)] leading-none">
        {notFound ? 'This page has moved on.' : 'We hit a snag.'}
      </h1>
      <Link to="/" className="link-underline mt-12">Return home</Link>
    </main>
  )
}
