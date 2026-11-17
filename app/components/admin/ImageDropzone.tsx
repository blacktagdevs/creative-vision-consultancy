import { useRef, useState } from 'react'

type Props = {
  /** Called with the image files the owner dropped or picked. Never empty. */
  onFiles: (files: File[]) => void
  /** Rejected drops report here rather than the component owning its own copy. */
  onReject?: (message: string) => void
  multiple?: boolean
  disabled?: boolean
  busy?: boolean
  /** When set, the zone shows this image with Replace / Remove instead of the prompt. */
  previewUrl?: string | null
  onRemove?: () => void
  title?: string
  hint?: string
  className?: string
  /** Wording and size for the preview, for screens where the defaults don't fit. */
  previewTitle?: string
  replaceLabel?: string
  removeLabel?: string
  previewClassName?: string
}

/**
 * A drop target that looks like one at rest, not only once a file is over it.
 * Shared by the service photo field, the gallery uploader and the page editor.
 */
export function ImageDropzone({
  onFiles,
  onReject,
  multiple = false,
  disabled = false,
  busy = false,
  previewUrl = null,
  onRemove,
  title,
  hint,
  className = '',
  previewTitle = 'Photo added',
  replaceLabel = 'Replace',
  removeLabel = 'Remove',
  previewClassName = 'h-20 w-16',
}: Props) {
  const [dragging, setDragging] = useState(false)
  // Children fire dragleave as the pointer crosses them, so count enter/leave
  // pairs rather than trusting one leave to mean the drag is gone.
  const depth = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const inactive = disabled || busy
  const browse = () => inputRef.current?.click()

  function take(list: FileList | null) {
    const images = Array.from(list || []).filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) {
      onReject?.(
        multiple
          ? 'Those files aren’t images. Try JPG, PNG, or WebP.'
          : 'That file isn’t an image. Try a JPG, PNG, or WebP.'
      )
      return
    }
    onFiles(multiple ? images : images.slice(0, 1))
  }

  const frame = dragging
    ? 'border-solid border-charcoal bg-rose/25'
    : 'border-dashed border-warm-gray bg-ivory-deep hover:bg-line/60'

  return (
    <div
      className={`border transition-colors ${frame} ${inactive ? 'opacity-70' : ''} ${className}`}
      onDragEnter={(e) => {
        e.preventDefault()
        depth.current += 1
        setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault()
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        depth.current = 0
        setDragging(false)
        if (inactive) return
        take(e.dataTransfer?.files ?? null)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        disabled={inactive}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          take(e.target.files)
          e.target.value = '' // allow re-picking the same file
        }}
      />

      {previewUrl ? (
        <div className="flex items-center gap-4 p-4">
          <img src={previewUrl} alt="" className={`${previewClassName} shrink-0 border border-line object-cover`} />
          <div className="min-w-0">
            <p className="text-[15px] text-charcoal">{busy ? 'Uploading…' : previewTitle}</p>
            {hint && <p className="mt-0.5 text-[13px] text-warm-gray-deep">{hint}</p>}
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              <button
                type="button"
                onClick={browse}
                disabled={inactive}
                className="min-h-11 text-[14px] text-charcoal underline underline-offset-4 disabled:opacity-50"
              >
                {replaceLabel}
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={inactive}
                  className="min-h-11 text-[14px] text-warm-gray-deep underline underline-offset-4 hover:text-charcoal disabled:opacity-50"
                >
                  {removeLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={browse}
          disabled={inactive}
          className="flex w-full flex-col items-center justify-center gap-1 px-4 py-10 text-center disabled:cursor-default"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mb-1 h-6 w-6 text-charcoal">
            <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[15px] text-charcoal">
            {busy
              ? 'Uploading…'
              : dragging
                ? 'Drop to upload'
                : (title ?? (multiple ? 'Drag photos here' : 'Drag a photo here'))}
          </span>
          <span className="text-[13px] text-warm-gray-deep">
            {busy ? 'Keep this page open until it finishes' : (hint ?? 'or tap to choose. JPG, PNG or WebP.')}
          </span>
        </button>
      )}
    </div>
  )
}
