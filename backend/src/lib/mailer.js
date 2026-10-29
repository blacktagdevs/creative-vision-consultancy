// Transactional email. Used only for the admin magic-link login — the site
// sends nothing else from the server.
import { config } from '../config.js'

// Sends the magic-link email. If Loops isn't configured (local dev), logs the
// link to the console instead so the flow is still testable.
export async function sendMagicLink(email, url) {
  const { apiKey, magicLinkTemplateId } = config.loops

  if (!apiKey || !magicLinkTemplateId) {
    console.log(`[mail:dev] magic link for ${email}: ${url}`)
    return { delivered: false, dev: true }
  }

  const res = await fetch('https://app.loops.so/api/v1/transactional', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionalId: magicLinkTemplateId,
      email,
      dataVariables: { loginUrl: url },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Loops send failed (${res.status}): ${detail}`)
  }
  return { delivered: true }
}
