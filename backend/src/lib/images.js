// Cloudflare Images: storage, resizing and delivery for service and portfolio
// photos. Postgres keeps only each photo's delivery URL
// (https://imagedelivery.net/<account hash>/<image id>/<variant>); the site
// swaps the variant segment for the size it needs (see app/lib/image.ts).
//
// The Images account is shared with other BlackTag sites (Blk Girls Shoot), so
// every upload is tagged with metadata { project: 'cvc' }, and a delete only
// goes through for an image that carries that tag, so nothing here can remove
// another site's photo.
import { config } from '../config.js'

const PROJECT = 'cvc'
const im = config.images

export function imagesConfigured() {
  return Boolean(im.accountId && im.accountHash && im.token)
}

const api = (path = '') => `https://api.cloudflare.com/client/v4/accounts/${im.accountId}/images/v1${path}`
const auth = () => ({ Authorization: `Bearer ${im.token}` })

/** Public URL for an image in a named variant. "public" is the full-size default. */
export function deliveryUrl(id, variant = 'public', accountHash = im.accountHash) {
  return `https://imagedelivery.net/${accountHash}/${id}/${variant}`
}

/**
 * The image id behind one of our delivery URLs, or null if the URL isn't one
 * of ours: another account's, an Unsplash placeholder, a data URI. Pure, so it
 * can be tested without credentials.
 */
export function imageIdFromUrl(url, { accountHash } = {}) {
  if (typeof url !== 'string' || !accountHash) return null
  const m = /^https:\/\/imagedelivery\.net\/([^/]+)\/([A-Za-z0-9-]{8,64})\/[A-Za-z0-9]+$/.exec(url)
  if (!m || m[1] !== accountHash) return null
  return m[2]
}

/** As above, against the running configuration. */
export function ourImageId(url) {
  if (!imagesConfigured()) return null
  return imageIdFromUrl(url, { accountHash: im.accountHash })
}

/** Uploads a Buffer and returns its delivery URL (public variant). */
export async function uploadImage(kind, buffer, contentType) {
  if (!imagesConfigured()) throw new Error('Cloudflare Images is not configured')
  const form = new FormData()
  const ext = contentType.split('/')[1] || 'jpg'
  form.append('file', new Blob([buffer], { type: contentType }), `${kind}.${ext}`)
  form.append('metadata', JSON.stringify({ project: PROJECT, kind }))

  const res = await fetch(api(), { method: 'POST', headers: auth(), body: form })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.success) {
    const detail = body?.errors?.map((e) => e.message).join('; ') || res.status
    throw new Error(`Cloudflare Images upload failed: ${detail}`)
  }
  return deliveryUrl(body.result.id)
}

/**
 * Best-effort delete. Never throws: the database row is already gone by the
 * time this runs, so a storage failure must not turn a completed delete into
 * an error the admin can't act on. A stranded image costs a fraction of a
 * cent; a 500 after the row vanished costs trust in the screen.
 */
export async function deleteImages(urls) {
  const ids = [...new Set((urls || []).map(ourImageId).filter(Boolean))]
  let deleted = 0
  let skipped = 0
  let failed = 0

  for (const id of ids) {
    try {
      // Read the tag before deleting: the account isn't ours alone.
      const info = await fetch(api(`/${id}`), { headers: auth() })
      if (info.status === 404) { deleted += 1; continue } // already gone
      const body = await info.json().catch(() => null)
      if (body?.result?.meta?.project !== PROJECT) {
        skipped += 1
        console.warn(`[images] refusing to delete ${id}: not tagged project=${PROJECT}`)
        continue
      }
      const res = await fetch(api(`/${id}`), { method: 'DELETE', headers: auth() })
      if (res.ok || res.status === 404) deleted += 1
      else { failed += 1; console.warn(`[images] could not delete ${id}: ${res.status}`) }
    } catch (err) {
      failed += 1
      console.warn(`[images] could not delete ${id}: ${err.message}`)
    }
  }
  return { deleted, skipped, failed }
}

/**
 * The sizes the site asks for. Named variants are account-wide, so they carry
 * the project name; scripts/setup-image-variants.js creates them once.
 */
export const VARIANTS = {
  cvcthumb: { fit: 'scale-down', width: 900, metadata: 'none' }, // grids and cards
  cvclarge: { fit: 'scale-down', width: 2000, metadata: 'none' }, // lightbox, hero-sized
}
