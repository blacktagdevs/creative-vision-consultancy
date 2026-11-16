import { useState, type FormEvent } from 'react'
import { apiPost } from '~/lib/admin/api'
import { Logo } from '~/components/Logo'
import { Field, TextInput } from './Field'
import { Notice } from './Notice'

/* Passwordless sign-in. The API answers the same way whether or not the address
   is allowed, so this form can't be used to discover who the admins are. The
   emailed link is the only way in: it lands back on /admin with the session in
   the URL fragment, which useAdminSession picks up. */
export function LoginForm({ initialError = '' }: { initialError?: string }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initialError)

  async function requestLink(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setError('')
    try {
      await apiPost('/admin/auth/request', { email })
      setSent(true)
    } catch {
      setError('Could not reach the CVC API. Is the backend running?')
    } finally {
      setBusy(false)
    }
  }

  return (
    // svh, not vh: on phones 100vh is taller than the visible area, which
    // pushed the form below the fold.
    <div className="gutter flex min-h-svh items-center justify-center bg-ivory-deep py-10">
      <main className="w-full max-w-[420px] border border-line bg-ivory px-6 py-10 sm:px-10 sm:py-12">
        <div>
          <Logo className="h-16" />
          <p className="label mt-4">Admin</p>
          <h1 className="mt-8 text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.1]">Sign in to manage your website</h1>

          {sent ? (
            <div className="mt-8 flex flex-col gap-4">
              <Notice>
                If that email is authorized, a login link is on its way. It is good for 15 minutes.
              </Notice>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="min-h-11 w-fit text-[14px] text-ink underline underline-offset-4 hover:text-charcoal"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={requestLink} className="mt-8 flex flex-col gap-6">
              <Field label="Email">
                <TextInput
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-charcoal px-8 py-4 text-[11px] uppercase tracking-[0.32em] text-ivory transition-opacity disabled:opacity-55"
              >
                {busy ? 'Sending…' : 'Email me a login link'}
              </button>
            </form>
          )}

          {error && (
            <div className="mt-6">
              <Notice tone="error">{error}</Notice>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
