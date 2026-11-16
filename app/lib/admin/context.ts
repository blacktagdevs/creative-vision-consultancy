import { useOutletContext } from 'react-router'
import type { AdminStorage } from './session'

/** What the /admin layout hands down to each admin screen. */
export type AdminContext = {
  token: string
  email: string
  storage: AdminStorage
  /** Called when a request comes back 401 — drops the session and shows the login. */
  onUnauthorized: () => void
}

export const useAdminContext = () => useOutletContext<AdminContext>()
