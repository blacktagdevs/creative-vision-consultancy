import { API_BASE } from '~/lib/api'

// Admin requests. Public pages never use these; they fetch through
// app/lib/api.ts. Errors carry the API's own message so screens can show it.
export class ApiError extends Error {
  status: number
  /** Machine-readable reason, e.g. 'limit_reached' when a cap is hit. */
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return null as T
  const text = await res.text()
  // A proxy error page is HTML, not JSON. Fall back to the status line rather
  // than throwing a SyntaxError at the owner.
  let data: { error?: string; code?: string } | null = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.code)
  }
  return data as T
}

function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function apiGet<T>(path: string, token?: string): Promise<T> {
  return fetch(`${API_BASE}${path}`, { headers: authHeader(token) }).then((res) => parse<T>(res))
}

function apiSend<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((res) => parse<T>(res))
}

export const apiPost = <T,>(path: string, body?: unknown, token?: string) =>
  apiSend<T>('POST', path, body, token)
export const apiPatch = <T,>(path: string, body?: unknown, token?: string) =>
  apiSend<T>('PATCH', path, body, token)
export const apiPut = <T,>(path: string, body?: unknown, token?: string) =>
  apiSend<T>('PUT', path, body, token)
export const apiDelete = <T,>(path: string, token?: string) =>
  apiSend<T>('DELETE', path, undefined, token)

// --- Session token -----------------------------------------------------------
// Kept in localStorage so a reload doesn't sign the owner out. Storage can be
// blocked (private windows, some embedded browsers), so every access is
// guarded and a blocked store just means being asked to sign in again.
const TOKEN_KEY = 'cvc_admin_token'

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Not persisted; the session lasts until the tab closes or reloads.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing to clear.
  }
}
