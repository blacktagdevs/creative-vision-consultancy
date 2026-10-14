// Cloudflare R2 upload via the S3-compatible API (this backend is a plain Node
// service, not a Worker, so no R2 binding). Objects are namespaced under
// `${prefix}/<folder>/...` and served from the bucket's public base URL.
import { AwsClient } from 'aws4fetch'
import crypto from 'node:crypto'
import { config } from '../config.js'

const r2 = config.r2
const client = r2.accessKeyId && r2.secretAccessKey
  ? new AwsClient({ accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey, region: 'auto', service: 's3' })
  : null

export function r2Configured() {
  return !!(client && r2.endpoint && r2.publicBase)
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

// Uploads a Buffer, returns the public URL. `folder` is e.g. 'services' | 'portfolio'.
export async function uploadImage(folder, buffer, contentType) {
  if (!r2Configured()) throw new Error('R2 is not configured')
  const ext = EXT[contentType] || 'bin'
  const key = `${r2.prefix}/${folder}/${crypto.randomUUID()}.${ext}`
  const res = await client.fetch(`${r2.endpoint}/${r2.bucket}/${key}`, {
    method: 'PUT',
    body: buffer,
    headers: {
      'Content-Type': contentType,
      // images are content-addressed by random key, so cache hard + immutable
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`R2 upload failed (${res.status}): ${detail.slice(0, 200)}`)
  }
  return `${r2.publicBase.replace(/\/$/, '')}/${key}`
}

/**
 * The storage key behind one of our public URLs, or null if the URL isn't ours
 * to touch. Pure so it can be tested without R2 configured.
 *
 * The prefix check is the important one. CVC shares a bucket with other
 * BlackTag projects, each under its own prefix, so a delete must never be able
 * to reach outside `${prefix}/` — not for a crafted URL, and not for a row that
 * predates the prefix arrangement.
 */
export function keyFromPublicUrl(url, { publicBase, prefix } = {}) {
  if (typeof url !== 'string' || !publicBase || !prefix) return null
  const base = `${publicBase.replace(/\/$/, '')}/`
  // Anything not served from our own base: data: URIs from the inline
  // fallback, and images hand-entered from somewhere else.
  if (!url.startsWith(base)) return null
  const key = url.slice(base.length).split('?')[0]
  if (!key.startsWith(`${prefix}/`)) return null
  if (key.includes('..') || key.includes('//')) return null
  return key
}

/** As above, against the running configuration. */
export function r2KeyFromUrl(url) {
  if (!r2Configured()) return null
  return keyFromPublicUrl(url, { publicBase: r2.publicBase, prefix: r2.prefix })
}

/**
 * Best-effort delete of stored objects. Never throws: the database row is
 * already gone by the time this runs, so a storage failure must not turn a
 * completed delete into an error the admin can't act on. A stranded object
 * costs pennies; a 500 after the row vanished costs trust in the screen.
 */
export async function deleteImages(urls) {
  const keys = [...new Set((urls || []).map(r2KeyFromUrl).filter(Boolean))]
  let deleted = 0
  let failed = 0

  for (const key of keys) {
    try {
      const res = await client.fetch(`${r2.endpoint}/${r2.bucket}/${key}`, { method: 'DELETE' })
      // R2 answers 204 for a delete and 404 when it was already gone. Both
      // leave us where we wanted to be.
      if (res.ok || res.status === 404) {
        deleted += 1
      } else {
        failed += 1
        console.warn(`[r2] could not delete ${key}: ${res.status}`)
      }
    } catch (err) {
      failed += 1
      console.warn(`[r2] could not delete ${key}: ${err.message}`)
    }
  }

  return { deleted, failed }
}
