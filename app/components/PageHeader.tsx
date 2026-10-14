// The centred header that opens every inner page (Direction A services.html).
export function PageHeader({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
  return (
    <section className="gutter border-b border-line pb-20 pt-36 text-center sm:pb-24 sm:pt-44">
      <p className="label mb-7">{eyebrow}</p>
      <h1 className="text-[clamp(52px,8vw,108px)] leading-none">{title}</h1>
      {lede && (
        <p className="display mx-auto mt-10 max-w-[44ch] text-[19px] italic leading-relaxed text-warm-gray-deep sm:text-[22px]">
          {lede}
        </p>
      )}
    </section>
  )
}
