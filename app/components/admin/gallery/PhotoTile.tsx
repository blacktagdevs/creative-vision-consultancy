import { useEffect, useState } from 'react'
import { sized } from '~/lib/image'
import type { AdminPhoto } from '~/lib/admin/types'

type Props = {
  photo: AdminPhoto
  index: number
  isCover: boolean
  busy: boolean
  /** Throws with a readable message on failure. */
  onSaveAlt: (alt: string) => Promise<void>
  onMakeCover: () => void
  onRemove: () => void
}

export function PhotoTile({ photo, index, isCover, busy, onSaveAlt, onMakeCover, onRemove }: Props) {
  const [alt, setAlt] = useState(photo.alt ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState('')

  // Follow the server's value if the gallery is reloaded underneath us.
  useEffect(() => setAlt(photo.alt ?? ''), [photo.alt])

  async function save() {
    const next = alt.trim()
    if (next === (photo.alt ?? '')) return
    setState('saving')
    setError('')
    try {
      await onSaveAlt(next)
      setState('saved')
    } catch (err) {
      setState('idle')
      setError(err instanceof Error ? err.message : 'Could not save the description.')
    }
  }

  return (
    <div className="flex flex-col border border-line bg-ivory">
      <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep">
        <img
          src={sized(photo.image_url, 'thumb')}
          alt={photo.alt || `Photo ${index + 1}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {isCover && (
          <span className="absolute left-2 top-2 bg-charcoal px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-ivory">
            Cover
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-3">
        <label className="flex flex-col gap-1">
          <span className="sr-only">Describe photo {index + 1}</span>
          <input
            type="text"
            value={alt}
            maxLength={300}
            placeholder="Describe this photo"
            onChange={(e) => {
              setAlt(e.target.value)
              setState('idle')
            }}
            onBlur={save}
            className="w-full border border-warm-gray bg-ivory px-3 py-2 text-[16px] text-charcoal placeholder:text-warm-gray-deep focus:border-charcoal"
          />
        </label>
        <p className="min-h-4 text-[12px] text-warm-gray-deep" aria-live="polite">
          {error ? <span className="font-medium text-charcoal">{error}</span> : state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : ''}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          {isCover ? (
            <span className="min-h-11 content-center text-[13px] text-warm-gray-deep">Cover photo</span>
          ) : (
            <button
              type="button"
              onClick={onMakeCover}
              disabled={busy}
              className="min-h-11 text-[14px] text-charcoal underline underline-offset-4 disabled:opacity-50"
            >
              Make cover photo
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="min-h-11 text-[14px] text-warm-gray-deep underline underline-offset-4 hover:text-charcoal disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
