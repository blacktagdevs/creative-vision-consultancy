import { useEffect } from 'react'
import { INQUIRY } from '~/lib/site'

// The inquiry step. Which of the two shapes this takes is still being decided
// with the client: Dubsado's hosted form (the embed she sent) or a link to
// book a discovery call. Flip INQUIRY.mode in lib/site.ts.
export function InquiryEmbed() {
  if (INQUIRY.mode === 'discovery-call' && INQUIRY.discoveryCallUrl) {
    return (
      <div className="text-center">
        <a href={INQUIRY.discoveryCallUrl} className="btn-outline border-charcoal hover:bg-charcoal hover:text-ivory">
          Book a Discovery Call
        </a>
      </div>
    )
  }
  return <DubsadoForm />
}

const RESIZER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/iframe-resizer/3.5.14/iframeResizer.min.js'

function DubsadoForm() {
  // Dubsado's snippet: iframe-resizer grows the frame to fit the form, so the
  // page scrolls as one instead of a box scrolling inside it.
  useEffect(() => {
    type Resizer = (opts: object, target?: string) => void
    const w = window as unknown as { iFrameResize?: Resizer }
    const start = () => w.iFrameResize?.({ checkOrigin: false }, '#dubsado-inquiry')
    if (w.iFrameResize) return start()
    const s = document.createElement('script')
    s.src = RESIZER_SRC
    s.async = true
    s.onload = start
    document.head.appendChild(s)
  }, [])

  return (
    <iframe
      id="dubsado-inquiry"
      title="Inquiry form"
      src={INQUIRY.dubsadoFormUrl}
      className="block min-h-[750px] w-full border-0"
      loading="lazy"
    />
  )
}
