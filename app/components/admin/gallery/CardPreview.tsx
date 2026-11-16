import { ACCENT, type Accent } from '~/lib/accent'
import { formatEventMonth, paragraphs, PORTFOLIO_CATEGORY_LABEL } from '~/lib/format'
import { sized } from '~/lib/image'

type Props = {
  accent: Accent
  title: string
  category: keyof typeof PORTFOLIO_CATEGORY_LABEL
  eventDate: string | null
  description: string
  coverUrl: string | null
}

/* A small copy of the card on the public Gallery page, so a colour choice can
   be judged without leaving the editor. */
export function CardPreview({ accent, title, category, eventDate, description, coverUrl }: Props) {
  const a = ACCENT[accent]
  const month = eventDate ? formatEventMonth(eventDate) : null
  return (
    <div className={`w-full max-w-[220px] p-3 transition-colors ${a.bg}`} aria-hidden="true">
      <div className="aspect-[4/5] overflow-hidden bg-white/40">
        {coverUrl && <img src={sized(coverUrl, 'thumb')} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="px-0.5 pb-1 pt-4">
        <p className={`label mb-1 !text-[9px] ${a.deep}`}>
          {PORTFOLIO_CATEGORY_LABEL[category]}
          {month ? ` · ${month}` : ''}
        </p>
        <p className="font-display text-[20px] leading-tight text-charcoal">{title || 'Untitled'}</p>
        {description.trim() && (
          <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-ink">{paragraphs(description)[0]}</p>
        )}
      </div>
    </div>
  )
}
