import { ApiError } from '~/lib/admin/api'

/** The message to show the owner. API errors carry their own wording; a failed fetch gets plain English. */
export function messageFor(err: unknown): string {
  if (err instanceof ApiError) return err.message
  // Upload and file errors are plain Errors with readable messages.
  if (err instanceof Error && err.name !== 'TypeError') return err.message
  return 'Could not reach the CVC API. Check your connection and try again.'
}
