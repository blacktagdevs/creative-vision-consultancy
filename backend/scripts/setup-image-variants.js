// One-time setup: creates the named Cloudflare Images variants the site uses
// (VARIANTS in src/lib/images.js). Safe to re-run: existing variants are
// updated to match. Needs CF_ACCOUNT_ID and CF_IMAGES_TOKEN in the environment.
//
//   railway ssh --service api node scripts/setup-image-variants.js
import { config } from '../src/config.js'
import { VARIANTS } from '../src/lib/images.js'

const { accountId, token } = config.images
if (!accountId || !token) throw new Error('Set CF_ACCOUNT_ID and CF_IMAGES_TOKEN first')

const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/variants`
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

for (const [id, options] of Object.entries(VARIANTS)) {
  const exists = (await fetch(`${base}/${id}`, { headers })).ok
  const res = await fetch(exists ? `${base}/${id}` : base, {
    method: exists ? 'PATCH' : 'POST',
    headers,
    body: JSON.stringify(exists ? { options, neverRequireSignedURLs: true } : { id, options, neverRequireSignedURLs: true }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.success) {
    throw new Error(`${id}: ${body?.errors?.map((e) => e.message).join('; ') || res.status}`)
  }
  console.log(`${exists ? '~ updated' : '+ created'} variant ${id} (${options.width}px)`)
}
