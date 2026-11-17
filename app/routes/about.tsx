import type { Route } from './+types/about'
import { CtaBand } from '~/components/CtaBand'
import { PageHeader } from '~/components/PageHeader'
import { Paragraphs } from '~/components/Paragraphs'
import { pageMeta } from '~/lib/site'
import { emphasised } from '~/lib/emphasis'
import { sized } from '~/lib/image'
import { live } from '~/lib/live'
import { loadPage } from '~/lib/pages'

export const meta: Route.MetaFunction = () =>
  pageMeta(
    'About',
    'Creative Vision Consultancy is a full-service wedding and event management company based in Atlanta, serving weddings, social, and corporate events nationwide.',
    '/about'
  )

// The page's words and photos, which she edits under Pages in the admin. Read
// at build time (prerender) and again in the browser; anything she hasn't
// changed arrives as the original.
async function load() {
  return { content: await loadPage('about') }
}

export const loader = load

// In the browser: fetch again so visitors see edits made since the last build.
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return live(load, serverLoader)
}
clientLoader.hydrate = true as const

export default function About({ loaderData }: Route.ComponentProps) {
  const { content: c } = loaderData
  return (
    <>
      <PageHeader eyebrow={c.header_eyebrow} title={c.header_title} lede={c.header_lede} />

      <section className="gutter mx-auto grid max-w-[1320px] items-center gap-16 py-28 md:grid-cols-2 lg:gap-28 lg:py-36">
        <div className="aspect-[4/5] overflow-hidden">
          <img src={sized(c.story_image_url, 'large')} alt={c.story_image_alt} className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="label mb-6">{`— ${c.story_eyebrow}`}</p>
          <h2 className="section-title">{emphasised(c.story_title)}</h2>
          <Paragraphs text={c.story_body} className="max-w-[50ch] space-y-6 text-[17px] leading-[1.75] text-ink" />
        </div>
      </section>

      <section className="gutter bg-ivory-deep py-28 lg:py-36">
        <div className="mx-auto grid max-w-[1320px] items-center gap-16 md:grid-cols-2 lg:gap-28">
          <div className="md:order-2">
            {c.owner_image_url ? (
              // Her portrait, in the frame the placeholder held for it. The crop
              // favours the upper part of the photo so a tall portrait loses
              // floor rather than the top of her head.
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={sized(c.owner_image_url, 'large')}
                  alt={c.owner_image_alt}
                  className="h-full w-full object-cover object-[50%_25%]"
                  loading="lazy"
                />
              </div>
            ) : (
              // No portrait uploaded yet: hold its place so the layout doesn't shift when one arrives.
              <div className="flex aspect-[4/5] items-end bg-rose/30 p-6">
                <span className="label text-warm-gray-deep">Portrait coming soon</span>
              </div>
            )}
          </div>
          <div>
            <p className="label mb-6">{`— ${c.owner_eyebrow}`}</p>
            <h2 className="section-title">{emphasised(c.owner_title)}</h2>
            <Paragraphs text={c.owner_body} className="max-w-[50ch] space-y-6 text-[17px] leading-[1.75] text-ink" />
          </div>
        </div>
      </section>

      <CtaBand title={c.cta_title} />
    </>
  )
}
