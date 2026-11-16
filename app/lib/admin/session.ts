import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiGet, clearToken, getToken, setToken } from './api'

/** 'cloudflare-images' when photo uploads go to storage, 'inline' when they stay in the database (local dev). */
export type AdminStorage = 'cloudflare-images' | 'inline' | null

type SessionState = {
  status: 'checking' | 'signed-in' | 'signed-out'
  email: string
  storage: AdminStorage
  /** Shown on the sign-in screen, e.g. why the session ended. */
  error: string
  token: string
}

const SIGNED_OUT: SessionState = { status: 'signed-out', email: '', storage: null, error: '', token: '' }

/* Pull a magic-link result out of the URL fragment and scrub it from the address
   bar. Fragments never reach a server or a log, which is why the token arrives
   this way. Idempotent: a second call sees an already-clean URL and does nothing,
   so running under StrictMode's double-invoke is safe. */
function consumeUrlFragment(): string {
  if (typeof window === 'undefined') return ''
  const { hash, pathname, search } = window.location
  if (!hash.startsWith('#token=') && !hash.startsWith('#error=')) return ''
  if (hash.startsWith('#token=')) setToken(hash.slice('#token='.length))
  window.history.replaceState(null, '', pathname + search)
  return hash.startsWith('#error=') ? 'That login link was invalid or has expired.' : ''
}

function initialState(): SessionState {
  if (typeof window === 'undefined') return SIGNED_OUT
  const error = consumeUrlFragment()
  if (error) return { ...SIGNED_OUT, error }
  const token = getToken()
  if (!token) return SIGNED_OUT
  return { status: 'checking', email: '', storage: null, error: '', token }
}

/* One place that owns the admin session. A token in localStorage is not proof of
   a live session — it may be expired or signed with a rotated secret — so
   /admin/me is always the arbiter before a dashboard renders. */
export function useAdminSession() {
  const [state, setState] = useState<SessionState>(initialState)

  useEffect(() => {
    if (state.status !== 'checking') return
    let alive = true
    apiGet<{ email: string; storage: 'cloudflare-images' | 'inline' }>('/admin/me', state.token)
      .then((me) => {
        if (alive) setState({ status: 'signed-in', email: me.email, storage: me.storage, error: '', token: state.token })
      })
      .catch((err) => {
        if (!alive) return
        const expired = err instanceof ApiError && err.status === 401
        if (expired) clearToken()
        setState({
          ...SIGNED_OUT,
          error: expired ? 'Your session has ended. Please sign in again.' : 'Could not reach the CVC API.',
        })
      })
    return () => {
      alive = false
    }
  }, [state.status, state.token])

  const signOut = useCallback(() => {
    clearToken()
    setState(SIGNED_OUT)
  }, [])

  /** A request came back 401 mid-session: drop the token and say why. */
  const expire = useCallback(() => {
    clearToken()
    setState({ ...SIGNED_OUT, error: 'Your session has ended. Please sign in again.' })
  }, [])

  return { ...state, signOut, expire }
}
