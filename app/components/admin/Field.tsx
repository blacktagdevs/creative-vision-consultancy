import { createContext, useContext, useId, type ComponentPropsWithoutRef, type ReactNode } from 'react'

// Lets the primitives below pick up the id and error wiring from their Field,
// so a screen doesn't repeat aria-describedby on every input.
type FieldContextValue = { id: string; describedBy?: string; invalid: boolean }
const FieldContext = createContext<FieldContextValue | null>(null)

type FieldProps = {
  id?: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ id, label, hint, error, children }: FieldProps) {
  const generated = useId()
  const fieldId = id ?? generated
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <FieldContext.Provider value={{ id: fieldId, describedBy, invalid: Boolean(error) }}>
      <div className="flex flex-col gap-2">
        <label htmlFor={fieldId} className="text-[14px] text-charcoal">
          {label}
        </label>
        {children}
        {hint && (
          <p id={hintId} className="text-[13px] leading-relaxed text-warm-gray-deep">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-[13px] font-medium text-charcoal">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  )
}

// 16px text stops iOS zooming into the field on focus. The border is warm gray
// rather than line, because a field's edge needs 3:1 contrast against the page.
const control =
  'w-full border bg-ivory px-4 py-3 text-[16px] text-charcoal placeholder:text-warm-gray-deep disabled:opacity-60'

type ControlProps = { id?: string; className?: string; 'aria-describedby'?: string }

// Merges what the enclosing Field supplies with what the caller passed, so
// neither overwrites the other.
function useControl<P extends ControlProps>({ className = '', ...props }: P) {
  const field = useContext(FieldContext)
  const describedBy = [field?.describedBy, props['aria-describedby']].filter(Boolean).join(' ') || undefined
  const edge = field?.invalid ? 'border-charcoal' : 'border-warm-gray focus:border-charcoal'
  return {
    ...props,
    id: props.id ?? field?.id,
    'aria-describedby': describedBy,
    'aria-invalid': field?.invalid || undefined,
    className: `${control} ${edge} ${className}`,
  }
}

export function TextInput(props: ComponentPropsWithoutRef<'input'>) {
  return <input {...useControl(props)} />
}

export function TextArea(props: ComponentPropsWithoutRef<'textarea'>) {
  return <textarea rows={4} {...useControl(props)} />
}

export function Select(props: ComponentPropsWithoutRef<'select'>) {
  return <select {...useControl(props)} />
}
