import { useEffect } from 'react'
import { useBlocker } from 'react-router'
import { ConfirmDialog } from './ConfirmDialog'

/* Keeps unsaved edits from vanishing. Moving to another admin screen is a
   client-side route change, which beforeunload never sees, so the router's
   blocker asks first with the site's own dialog. Closing or reloading the tab
   can only be stopped by the browser's prompt. */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => when && currentLocation.pathname !== nextLocation.pathname
  )

  useEffect(() => {
    if (!when) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [when])

  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="Leave without saving?"
      body="You have changes on this page that haven’t been saved. If you leave now, they’ll be lost."
      confirmLabel="Leave without saving"
      tone="danger"
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  )
}
