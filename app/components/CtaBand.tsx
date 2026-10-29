import { Link } from 'react-router'

export function CtaBand({ title = 'Let’s create something unforgettable.' }: { title?: string }) {
  return (
    <section className="gutter bg-charcoal py-28 text-center text-ivory sm:py-36">
      <h2 className="mx-auto mb-10 max-w-[18ch] text-[clamp(38px,5vw,68px)] leading-[1.1]">{title}</h2>
      <Link to="/inquire" className="btn-outline border-ivory hover:bg-ivory hover:text-charcoal">
        Begin Your Inquiry
      </Link>
    </section>
  )
}
