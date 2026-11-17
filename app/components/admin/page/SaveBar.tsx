import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Notice } from '~/components/admin/Notice'

type Props = {
  dirty: boolean
  saving: boolean
  uploading: boolean
  /** True from a successful save until the next edit. */
  saved: boolean
  error: string
  /** Where the page lives on the website, for the link offered after a save. */
  viewPath: string
}

// Room left between the bar and the field being edited.
const GAP = 16

/**
 * The Save button for a long form. It is the last thing in the form, and once
 * there is something to save (or something to say about a save) it also holds
 * to the bottom of the screen, so she never scrolls past nine sections to
 * reach it on a phone.
 *
 * It is sticky rather than fixed on purpose: at the end of the form it settles
 * into its own place below the last field instead of sitting on top of it.
 * While it is held to the screen it must not hide the box she is typing in,
 * which it would otherwise do the moment her first keystroke brings it up.
 */
export function SaveBar({ dirty, saving, uploading, saved, error, viewPath }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const pinned = dirty || saving || saved || Boolean(error)
  const status = saving ? '' : uploading ? 'Waiting for the photo…' : dirty ? 'Not saved yet' : ''

  useEffect(() => {
    const bar = ref.current
    const form = bar?.closest('form')
    if (!pinned || !bar || !form) return
    const root = document.documentElement

    // Lift the field in use above the bar if the bar is over it, along with
    // the lines under it (its hint, and "the original wording comes back" when
    // she empties it), which are the ones its aria-describedby points at. A
    // box taller than the space left keeps its top in view instead.
    function keepClear() {
      const el = document.activeElement
      if (!bar || !(el instanceof HTMLElement) || bar.contains(el) || !form!.contains(el)) return
      const field = el.getBoundingClientRect()
      const notes = (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)
      const bottom = Math.max(
        field.bottom,
        ...notes.map((id) => document.getElementById(id)?.getBoundingClientRect().bottom ?? 0)
      )
      const top = bar.getBoundingClientRect().top
      const lift = Math.min(bottom + GAP - top, field.top - GAP)
      // Instant: the page scrolls smoothly by default, and her next keystroke
      // would stop a smooth scroll partway.
      if (lift > 0) window.scrollBy({ top: lift, behavior: 'instant' })
    }

    // Scroll padding makes the browser's own scrolling (tabbing to a field,
    // keeping the caret in view while typing) stop short of the bar as well.
    function reserve() {
      root.style.scrollPaddingBottom = `${bar!.offsetHeight + GAP}px`
      keepClear()
    }

    // A line under the field can appear as she types, so look again once the
    // page has caught up with the keystroke.
    let frame = 0
    function afterInput() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(keepClear)
    }

    reserve()
    const resized = new ResizeObserver(reserve)
    resized.observe(bar)
    form.addEventListener('focusin', keepClear)
    form.addEventListener('input', afterInput)
    return () => {
      resized.disconnect()
      cancelAnimationFrame(frame)
      form.removeEventListener('focusin', keepClear)
      form.removeEventListener('input', afterInput)
      root.style.scrollPaddingBottom = ''
    }
  }, [pinned])

  return (
    <div
      ref={ref}
      className={`mt-12 flex flex-col gap-3 ${
        pinned
          ? 'sticky bottom-0 z-10 -mx-4 border-t border-warm-gray bg-ivory px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:mx-0 sm:px-0'
          : ''
      }`}
    >
      {error && <Notice tone="error">{error}</Notice>}
      {saved && (
        <Notice tone="success">
          Saved.{' '}
          <Link to={viewPath} target="_blank" rel="noopener" className="underline underline-offset-4">
            View it on the website
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>
        </Notice>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="submit"
          disabled={!dirty || saving || uploading}
          className="min-h-11 bg-charcoal px-8 py-4 text-[11px] uppercase tracking-[0.25em] text-ivory disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {status && (
          <p role="status" className="text-[14px] text-ink">
            {status}
          </p>
        )}
      </div>
    </div>
  )
}
