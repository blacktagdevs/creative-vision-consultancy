// Photos uploaded in the admin are Cloudflare Images delivery URLs,
// https://imagedelivery.net/<hash>/<id>/<variant>. Swapping the last segment
// picks a size, so a grid loads ~900px versions and only the lightbox pulls the
// large one. Anything else (bundled images, placeholders) passes through.
export type ImageSize = 'thumb' | 'large'

const VARIANT: Record<ImageSize, string> = { thumb: 'cvcthumb', large: 'cvclarge' }
const DELIVERY = /^(https:\/\/imagedelivery\.net\/[^/]+\/[^/]+\/)[A-Za-z0-9]+$/

export function sized(url: string, size: ImageSize) {
  const m = DELIVERY.exec(url)
  return m ? `${m[1]}${VARIANT[size]}` : url
}
