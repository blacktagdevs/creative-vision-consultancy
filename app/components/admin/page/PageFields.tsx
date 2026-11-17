import { useId } from 'react'
import { Field, TextArea, TextInput } from '~/components/admin/Field'
import { ImageDropzone } from '~/components/admin/ImageDropzone'
import { Notice } from '~/components/admin/Notice'
import { MAX_LENGTH, type FormField, type TextKind } from '~/lib/admin/pages'
import { clean } from './draft'

// A line under a field that she needs to notice, as opposed to the grey hint.
const NOTE = 'text-[13px] font-medium leading-relaxed text-charcoal'

type TextProps = {
  field: FormField
  kind: TextKind
  value: string
  /** The page's own wording for this field. Shows in grey when the box is empty. */
  original: string
  /** Something to tell her about this field right now, e.g. that its photo changed. */
  note?: string
  onChange: (value: string) => void
}

/**
 * One piece of the page's wording. An empty box never leaves a hole on the
 * website: the original wording comes back instead, so the box shows it in
 * grey and a line underneath says so before she saves.
 */
export function PageTextField({ field, kind, value, original, note, onChange }: TextProps) {
  const noteId = useId()
  const shown = clean(value) === '' ? 'Empty, so the original wording (shown in grey) comes back when you save.' : note
  const shared = {
    value,
    maxLength: MAX_LENGTH[kind],
    placeholder: original,
    'aria-describedby': shown ? noteId : undefined,
  }

  return (
    <Field label={field.label} hint={field.hint}>
      {kind === 'label' ? (
        <TextInput {...shared} onChange={(e) => onChange(e.target.value)} />
      ) : kind === 'heading' ? (
        // A heading can run to 160 characters, more than a one-line box shows
        // on a phone, so it wraps and grows like the paragraphs. It is still one
        // line on the website, so Enter and pasted line breaks become spaces.
        <TextArea
          {...shared}
          rows={1}
          className="resize-none [field-sizing:content]"
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault()
          }}
          onChange={(e) => onChange(e.target.value.replace(/\s*\n\s*/g, ' '))}
        />
      ) : (
        // Grows with the text where the browser can, so a long story never
        // hides inside a box she has to scroll on a phone. Elsewhere `rows`
        // sets the height.
        <TextArea
          {...shared}
          rows={field.rows ?? (kind === 'description' ? 2 : 4)}
          className="min-h-[4.5rem] [field-sizing:content]"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {shown && (
        <p id={noteId} role="status" className={NOTE}>
          {shown}
        </p>
      )}
    </Field>
  )
}

type PhotoProps = {
  field: FormField
  /** The photo in the form now, or null when there is none. */
  url: string | null
  /** The page's own photo, or null where it never had one (the owner portrait). */
  original: string | null
  /** The photo the website is showing, so the field can say what Save will change. */
  onSite: string | null
  busy: boolean
  disabled: boolean
  error?: string
  onFiles: (files: File[]) => void
  onReject: (message: string) => void
  /** Put the original photo back, or take the photo off where there is no original. */
  onOriginal: () => void
}

/**
 * One of the page's photos. It always shows what the form holds, the original
 * included, and says whether that is on the website yet: a new photo uploads
 * straight away but only lands on the page when she saves.
 */
export function PagePhotoField({
  field,
  url,
  original,
  onSite,
  busy,
  disabled,
  error,
  onFiles,
  onReject,
  onOriginal,
}: PhotoProps) {
  const labelId = useId()
  const isOriginal = clean(url) === clean(original)
  const waiting = clean(url) !== clean(onSite)
  const pressSave = 'Not on the website yet. Press Save changes.'

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <p id={labelId} className="text-[14px] text-charcoal">
        {field.label}
      </p>
      {url ? (
        <ImageDropzone
          previewUrl={url}
          previewClassName="h-28 w-24"
          previewTitle={isOriginal ? 'Original photo' : waiting ? 'New photo' : 'Your photo'}
          hint={waiting ? pressSave : 'On the website now.'}
          replaceLabel="Replace photo"
          removeLabel={original ? 'Use the original photo' : 'Remove photo'}
          busy={busy}
          disabled={disabled}
          onFiles={onFiles}
          onReject={onReject}
          onRemove={isOriginal ? undefined : onOriginal}
        />
      ) : (
        <ImageDropzone
          title="No photo here yet"
          hint="Drag one here, or tap to choose. JPG, PNG or WebP."
          busy={busy}
          disabled={disabled}
          onFiles={onFiles}
          onReject={onReject}
        />
      )}
      {!url && waiting && <p className={NOTE}>The photo is still on the website. Press Save changes to take it off.</p>}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  )
}
