import { Outlet } from 'react-router'
import type { Route } from './+types/layout'
import { AdminShell } from '~/components/admin/AdminShell'
import { LoginForm } from '~/components/admin/LoginForm'
import type { AdminContext } from '~/lib/admin/context'
import { useAdminSession } from '~/lib/admin/session'

export const meta: Route.MetaFunction = () => [
  { title: 'CVC Admin' },
  { name: 'robots', content: 'noindex' },
]

/* Gate for everything under /admin. The session is checked against the API
   before any screen renders, so a stale token lands on the sign-in form instead
   of a page full of failed requests. Client-only: never prerendered. */
export default function AdminLayout() {
  const session = useAdminSession()

  if (session.status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory">
        <p className="text-[15px] text-ink">Checking your session…</p>
      </div>
    )
  }

  if (session.status === 'signed-out') {
    return <LoginForm initialError={session.error} />
  }

  const context: AdminContext = {
    token: session.token,
    email: session.email,
    storage: session.storage,
    onUnauthorized: session.expire,
  }

  return (
    <AdminShell email={session.email} onSignOut={session.signOut}>
      <Outlet context={context} />
    </AdminShell>
  )
}
