// Public read API. This is what the site's prerender reads at build time, so
// it only ever returns published rows, in the order the owner arranged them.
import { Router } from 'express'
import { query } from '../db.js'
import { wrap } from '../lib/http.js'
import { PHOTOS_SQL, portfolioListSql } from '../queries.js'

export const publicRouter = Router()

// Drafts and housekeeping columns stay out of public responses.
function publicService(s) {
  const { status: _s, created_at: _c, updated_at: _u, ...rest } = s
  return rest
}

function publicPortfolio(p) {
  const { status: _s, created_at: _c, updated_at: _u, cover_photo_id: _cp, ...rest } = p
  return rest
}

publicRouter.get('/services', wrap(async (_req, res) => {
  const { rows } = await query(
    `SELECT * FROM services WHERE status = 'published' ORDER BY sort_order, created_at`
  )
  res.json({ services: rows.map(publicService) })
}))

publicRouter.get('/portfolio', wrap(async (_req, res) => {
  const { rows } = await query(portfolioListSql(`p.status = 'published'`))
  res.json({ items: rows.map(publicPortfolio) })
}))

publicRouter.get('/portfolio/:slug', wrap(async (req, res) => {
  const { rows } = await query(portfolioListSql(`p.status = 'published' AND p.slug = $1`), [req.params.slug])
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  const photos = await query(PHOTOS_SQL, [rows[0].id])
  res.json({ item: publicPortfolio(rows[0]), photos: photos.rows })
}))

publicRouter.get('/testimonials', wrap(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, quote, attribution, event_label, sort_order
     FROM testimonials WHERE status = 'published' ORDER BY sort_order, created_at`
  )
  res.json({ testimonials: rows })
}))
