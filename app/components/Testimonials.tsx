import { useState } from 'react'
import type { Testimonial } from '~/lib/api'

// One quote at a time, centred and large (Direction A). With several, small
// dots step through them. No autoplay: a review someone is halfway through
// reading shouldn't slide away.
export function Testimonials({ items }: { items: Testimonial[] }) {
  const [i, setI] = useState(0)
  if (items.length === 0) return null
  const t = items[Math.min(i, items.length - 1)]

  return (
    <section className="gutter py-32 text-center sm:py-48" aria-roledescription="carousel" aria-label="Client reviews">
      <p className="label mb-10">— Kind Words</p>
      <figure key={t.id} className="animate-[fade_0.6s_ease]">
        <blockquote className="display mx-auto mb-10 max-w-[28ch] text-[clamp(26px,3.5vw,44px)] italic leading-[1.4]">
          “{t.quote}”
        </blockquote>
        <figcaption className="label">
          — {t.attribution}
          {t.event_label ? `, ${t.event_label}` : ''}
        </figcaption>
      </figure>
      {items.length > 1 && (
        <div className="mt-12 flex justify-center gap-1">
          {items.map((item, n) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setI(n)}
              aria-label={`Review ${n + 1} of ${items.length}`}
              aria-current={n === i}
              className="p-2"
            >
              <span className={`block h-1.5 w-1.5 rounded-full ${n === i ? 'bg-charcoal' : 'bg-line'}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
