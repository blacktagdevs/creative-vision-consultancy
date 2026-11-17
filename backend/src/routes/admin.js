// Admin API for what the owner manages. Services, portfolio galleries and
// testimonials share one shape (list, create, edit, delete, reorder,
// publish/unpublish), so their routes are generated from RESOURCES rather than
// written out three times. Portfolio photos, the Home and About pages' wording,
// and uploads have their own routes below.
//
// Caps (LIMITS) are checked inside the create transaction under an advisory
// lock, so two quick clicks on "Add" can't both squeeze past the limit.
//
// Nothing here rebuilds the site. Visitors' browsers fetch published content
// from the public API when a page opens, so a change shows on the next page
// load; the prerendered HTML catches up on the hourly deploy.
import { Router } from 'express'
import { query, withTransaction } from '../db.js'
import { LIMITS } from '../config.js'
import { wrap } from '../lib/http.js'
import { requireAdmin } from '../lib/auth.js'
import { deleteImages, imagesConfigured, ourImageId, uploadImage } from '../lib/images.js'
import { pageImages, pageParam, validatePageChanges } from '../lib/pages.js'
import {
  ValidationError, slugify, uuidList, uuidParam, validateFields, validatePhoto,
} from '../lib/validation.js'
import { PHOTOS_SQL, portfolioListSql } from '../queries.js'

export const adminRouter = Router()

adminRouter.use(requireAdmin)
adminRouter.param('id', uuidParam)
adminRouter.param('photoId', uuidParam)
adminRouter.param('page', pageParam)

const RESOURCES = {
  services: { table: 'services', limit: LIMITS.services, slugFrom: 'name', noun: 'services', newAt: 'end' },
  // Newest work first: a gallery she just added should lead the page until
  // she decides otherwise.
  portfolio: { table: 'portfolio_items', limit: LIMITS.portfolio, slugFrom: 'title', noun: 'galleries', newAt: 'start' },
  testimonials: { table: 'testimonials', limit: LIMITS.testimonials, noun: 'testimonials', newAt: 'end' },
}

// Inline data URIs are a local-dev fallback only, so the admin works on a
// laptop without storage keys. In production images never go into Postgres:
// with storage unconfigured, uploads fail loudly instead of falling back.
const inlineAllowed = () => !imagesConfigured() && process.env.NODE_ENV !== 'production'

function limitError(spec) {
  const err = new ValidationError(
    `You can have up to ${spec.limit} ${spec.noun}. Remove one to add another.`,
    409
  )
  err.code = 'limit_reached'
  err.limit = spec.limit
  return err
}

/** The first free slug: "ify-oscar", then "ify-oscar-2", and so on. */
async function uniqueSlug(client, table, base, exceptId = null) {
  const root = base || 'item'
  const { rows } = await client.query(
    `SELECT slug FROM ${table} WHERE (slug = $1 OR slug LIKE $1 || '-%') AND id IS DISTINCT FROM $2`,
    [root, exceptId]
  )
  const taken = new Set(rows.map((r) => r.slug))
  if (!taken.has(root)) return root
  for (let n = 2; ; n++) if (!taken.has(`${root}-${n}`)) return `${root}-${n}`
}

function insertSql(table, data) {
  const cols = Object.keys(data)
  const params = cols.map((_, i) => `$${i + 1}`)
  return {
    text: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${params.join(', ')}) RETURNING *`,
    values: Object.values(data),
  }
}

/**
 * Delete the stored objects behind removed images, but only the ones nothing
 * points at any more. Call only after the delete has committed: objects can't
 * be rolled back, and a broken image on a surviving row is worse than a leak.
 *
 * Everywhere an image can be used has to be asked: gallery photos, services,
 * and the Home and About pages. A page's content is one flat object, so each
 * of its values is looked at. Leave a place out and removing a photo there
 * would take it off a page that still shows it.
 */
async function purgeUnreferencedImages(urls) {
  const candidates = [...new Set((urls || []).filter((u) => ourImageId(u)))]
  if (candidates.length === 0) return
  const { rows } = await query(
    `SELECT image_url FROM portfolio_photos WHERE image_url = ANY($1::text[])
     UNION
     SELECT image_url FROM services WHERE image_url = ANY($1::text[])
     UNION
     SELECT field.value FROM page_content, jsonb_each_text(content) AS field
     WHERE field.value = ANY($1::text[])`,
    [candidates]
  )
  const stillUsed = new Set(rows.map((r) => r.image_url))
  await deleteImages(candidates.filter((u) => !stillUsed.has(u)))
}

async function loadAdminItem(name, id, client = { query }) {
  const spec = RESOURCES[name]
  if (name === 'portfolio') {
    const { rows } = await client.query(portfolioListSql('p.id = $1'), [id])
    if (!rows[0]) return null
    const photos = await client.query(PHOTOS_SQL, [id])
    return { ...rows[0], photos: photos.rows }
  }
  const { rows } = await client.query(`SELECT * FROM ${spec.table} WHERE id = $1`, [id])
  return rows[0] || null
}

// ---------------------------------------------------------------------------
// Generic resource routes
// ---------------------------------------------------------------------------

for (const [name, spec] of Object.entries(RESOURCES)) {
  const { table } = spec

  // GET /admin/<name> — everything, drafts included, plus where she stands
  // against the cap so the screen can say "7 of 12".
  adminRouter.get(`/${name}`, wrap(async (_req, res) => {
    const sql = name === 'portfolio'
      ? portfolioListSql()
      : `SELECT * FROM ${table} ORDER BY sort_order, created_at`
    const { rows } = await query(sql)
    res.json({ items: rows, count: rows.length, limit: spec.limit })
  }))

  adminRouter.post(`/${name}`, wrap(async (req, res) => {
    const data = validateFields(name, req.body, { allowInline: inlineAllowed() })
    // A cover has to be one of the gallery's own photos, and a new gallery has none.
    delete data.cover_photo_id

    const created = await withTransaction(async (client) => {
      // Serialises creates per table for the rest of this transaction, so the
      // count below can't be stale by the time the insert lands.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`cap:${table}`])
      const { rows: [{ n, lo, hi }] } = await client.query(
        `SELECT count(*)::int AS n, min(sort_order) AS lo, max(sort_order) AS hi FROM ${table}`
      )
      if (n >= spec.limit) throw limitError(spec)

      if (spec.slugFrom) {
        data.slug = await uniqueSlug(client, table, data.slug || slugify(data[spec.slugFrom]))
      }
      data.sort_order = n === 0 ? 0 : spec.newAt === 'start' ? lo - 1 : hi + 1

      const { rows } = await client.query(insertSql(table, data))
      return rows[0]
    })

    res.status(201).json(await loadAdminItem(name, created.id))
  }))

  adminRouter.get(`/${name}/:id`, wrap(async (req, res) => {
    const item = await loadAdminItem(name, req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json(item)
  }))

  adminRouter.patch(`/${name}/:id`, wrap(async (req, res) => {
    const data = validateFields(name, req.body, { partial: true, allowInline: inlineAllowed() })
    const { id } = req.params

    const result = await withTransaction(async (client) => {
      const { rows: [before] } = await client.query(`SELECT * FROM ${table} WHERE id = $1 FOR UPDATE`, [id])
      if (!before) return null

      if (data.cover_photo_id) {
        const own = await client.query(
          'SELECT 1 FROM portfolio_photos WHERE id = $1 AND portfolio_item_id = $2',
          [data.cover_photo_id, id]
        )
        if (!own.rowCount) throw new ValidationError('The cover must be one of this gallery’s photos')
      }
      // Clearing the link name means "make one from the title again".
      if (spec.slugFrom && 'slug' in data && !data.slug) {
        data.slug = await uniqueSlug(client, table, slugify(data[spec.slugFrom] ?? before[spec.slugFrom]), id)
      }

      const cols = Object.keys(data)
      if (cols.length === 0) return { before, after: before }
      const sets = cols.map((c, i) => `${c} = $${i + 2}`)
      const { rows: [after] } = await client.query(
        `UPDATE ${table} SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`,
        [id, ...Object.values(data)]
      )
      return { before, after }
    })

    if (!result) return res.status(404).json({ error: 'Not found' })
    const { before, after } = result

    if (before.image_url && before.image_url !== after.image_url) {
      await purgeUnreferencedImages([before.image_url])
    }
    res.json(await loadAdminItem(name, id))
  }))

  adminRouter.delete(`/${name}/:id`, wrap(async (req, res) => {
    const { id } = req.params
    const removed = await withTransaction(async (client) => {
      const photos = name === 'portfolio'
        ? (await client.query('SELECT image_url FROM portfolio_photos WHERE portfolio_item_id = $1', [id])).rows
        : []
      const { rows } = await client.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id])
      return rows[0] ? { row: rows[0], urls: [rows[0].image_url, ...photos.map((p) => p.image_url)] } : null
    })
    if (!removed) return res.status(404).json({ error: 'Not found' })

    await purgeUnreferencedImages(removed.urls.filter(Boolean))
    res.status(204).end()
  }))

  // PUT /admin/<name>/order { ids } — the full list in its new order. Anything
  // other than exactly the current set means her screen is out of date, so it
  // is refused rather than half-applied.
  adminRouter.put(`/${name}/order`, wrap(async (req, res) => {
    const ids = uuidList(req.body?.ids)
    await withTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`cap:${table}`])
      const { rows } = await client.query(`SELECT id FROM ${table}`)
      const current = new Set(rows.map((r) => r.id))
      if (ids.length !== current.size || !ids.every((i) => current.has(i))) {
        throw new ValidationError('This list changed since you opened it. Refresh and try again.', 409)
      }
      await client.query(
        `UPDATE ${table} t SET sort_order = x.ord
         FROM unnest($1::uuid[]) WITH ORDINALITY AS x(id, ord)
         WHERE t.id = x.id`,
        [ids]
      )
    })
    res.json({ ok: true })
  }))
}

// ---------------------------------------------------------------------------
// Portfolio photos
// ---------------------------------------------------------------------------

// POST /admin/portfolio/:id/photos { add: [...], remove_ids: [...] } — adds and
// removals in one transaction (Craft Cart's batch pattern: per-photo calls
// raced each other and left the grid disagreeing with the database).
adminRouter.post('/portfolio/:id/photos', wrap(async (req, res) => {
  const { id } = req.params
  const add = Array.isArray(req.body?.add) ? req.body.add.map((p) => validatePhoto(p, { allowInline: inlineAllowed() })) : []
  const removeIds = uuidList(req.body?.remove_ids, 'remove_ids')
  if (add.length === 0 && removeIds.length === 0) throw new ValidationError('Nothing to add or remove')

  const result = await withTransaction(async (client) => {
    // Locking the gallery row serialises batches against the same gallery.
    const item = await client.query('SELECT 1 FROM portfolio_items WHERE id = $1 FOR UPDATE', [id])
    if (!item.rowCount) return null

    const removed = removeIds.length
      ? (await client.query(
          'DELETE FROM portfolio_photos WHERE portfolio_item_id = $1 AND id = ANY($2::uuid[]) RETURNING image_url',
          [id, removeIds]
        )).rows
      : []

    const { rows: [{ n, hi }] } = await client.query(
      'SELECT count(*)::int AS n, coalesce(max(sort_order), -1) AS hi FROM portfolio_photos WHERE portfolio_item_id = $1',
      [id]
    )
    if (n + add.length > LIMITS.photosPerItem) {
      const err = new ValidationError(
        `A gallery holds up to ${LIMITS.photosPerItem} photos. This one has ${n}, so ${Math.max(0, LIMITS.photosPerItem - n)} more will fit.`,
        409
      )
      err.code = 'limit_reached'
      err.limit = LIMITS.photosPerItem
      throw err
    }

    for (const [i, p] of add.entries()) {
      await client.query(
        `INSERT INTO portfolio_photos (portfolio_item_id, image_url, alt, width, height, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, p.image_url, p.alt, p.width, p.height, hi + 1 + i]
      )
    }
    await client.query('UPDATE portfolio_items SET updated_at = now() WHERE id = $1', [id])
    return { removedUrls: removed.map((r) => r.image_url), added: add.length, removed: removed.length }
  })

  if (!result) return res.status(404).json({ error: 'Not found' })
  await purgeUnreferencedImages(result.removedUrls)
  res.json({ added: result.added, removed: result.removed, item: await loadAdminItem('portfolio', id) })
}))

adminRouter.put('/portfolio/:id/photos/order', wrap(async (req, res) => {
  const { id } = req.params
  const ids = uuidList(req.body?.ids)
  const found = await withTransaction(async (client) => {
    const item = await client.query('SELECT 1 FROM portfolio_items WHERE id = $1 FOR UPDATE', [id])
    if (!item.rowCount) return false
    const { rows } = await client.query('SELECT id FROM portfolio_photos WHERE portfolio_item_id = $1', [id])
    const current = new Set(rows.map((r) => r.id))
    if (ids.length !== current.size || !ids.every((i) => current.has(i))) {
      throw new ValidationError('These photos changed since you opened them. Refresh and try again.', 409)
    }
    await client.query(
      `UPDATE portfolio_photos p SET sort_order = x.ord
       FROM unnest($1::uuid[]) WITH ORDINALITY AS x(id, ord)
       WHERE p.id = x.id`,
      [ids]
    )
    return true
  })
  if (!found) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
}))

// PATCH /admin/portfolio/:id/photos/:photoId { alt } — the photo description,
// read aloud by screen readers and shown in the lightbox.
adminRouter.patch('/portfolio/:id/photos/:photoId', wrap(async (req, res) => {
  const alt = typeof req.body?.alt === 'string' ? req.body.alt.trim().slice(0, 300) || null : null
  const { rows } = await query(
    `UPDATE portfolio_photos ph SET alt = $3
     FROM portfolio_items p
     WHERE ph.id = $2 AND ph.portfolio_item_id = $1 AND p.id = ph.portfolio_item_id
     RETURNING ph.*`,
    [req.params.id, req.params.photoId, alt]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  res.json(rows[0])
}))

// ---------------------------------------------------------------------------
// Pages — the Home and About pages' words and photos
// ---------------------------------------------------------------------------

/** A page as the admin sees it. updated_at is null until its first save. */
async function loadAdminPage(page) {
  const { rows } = await query('SELECT content, updated_at FROM page_content WHERE page = $1', [page])
  return { page, content: rows[0]?.content ?? {}, updated_at: rows[0]?.updated_at ?? null }
}

adminRouter.get('/pages/:page', wrap(async (req, res) => {
  res.json(await loadAdminPage(req.params.page))
}))

// PATCH /admin/pages/:page { key: text, ... } — only the fields sent change.
// Text is stored; null or blank removes the field, which puts the original
// wording or photo back on the site.
adminRouter.patch('/pages/:page', wrap(async (req, res) => {
  const { page } = req.params
  const { set, remove } = validatePageChanges(page, req.body, { allowInline: inlineAllowed() })
  // Nothing of this page's in the body: leave it, and its saved time, alone.
  if (Object.keys(set).length === 0 && remove.length === 0) return res.json(await loadAdminPage(page))

  const { before, after } = await withTransaction(async (client) => {
    // A page has no row until its first save, so make sure there is one to
    // lock. The lock makes two saves of a page take turns: each merges into
    // what the one before it stored, and `before` is exactly what this save
    // replaced, which is what decides the photos to clean up below.
    await client.query('INSERT INTO page_content (page) VALUES ($1) ON CONFLICT (page) DO NOTHING', [page])
    const { rows: [before] } = await client.query(
      'SELECT content FROM page_content WHERE page = $1 FOR UPDATE',
      [page]
    )
    const { rows: [after] } = await client.query(
      `UPDATE page_content SET content = (content - $2::text[]) || $3::jsonb, updated_at = now()
       WHERE page = $1 RETURNING content, updated_at`,
      [page, remove, JSON.stringify(set)]
    )
    return { before, after }
  })

  // Photos this save took off the page. They may still be on the other page,
  // a service or a gallery, which purgeUnreferencedImages checks.
  const kept = new Set(pageImages(page, after.content))
  await purgeUnreferencedImages(pageImages(page, before.content).filter((url) => !kept.has(url)))
  res.json({ page, content: after.content, updated_at: after.updated_at })
}))

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

// Uploads are filed by where they are used; anything unrecognised goes with
// the gallery photos, which is where most of them belong.
const UPLOAD_KINDS = ['portfolio', 'services', 'pages']

// POST /admin/upload { data, kind } — a base64 image data URI (already shrunk
// in the browser) stored in Cloudflare Images, tagged project=cvc. 503 when it
// isn't configured; the admin then keeps the data URI inline.
adminRouter.post('/upload', wrap(async (req, res) => {
  if (!imagesConfigured()) return res.status(503).json({ error: 'Image storage is not configured' })
  const folder = UPLOAD_KINDS.includes(req.body?.kind) ? req.body.kind : 'portfolio'
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(req.body?.data || '')
  if (!m) return res.status(400).json({ error: 'Expected a JPEG, PNG or WebP image' })
  const buffer = Buffer.from(m[2], 'base64')
  if (buffer.length > 6 * 1024 * 1024) return res.status(413).json({ error: 'Image too large (max ~6MB)' })
  res.json({ url: await uploadImage(folder, buffer, m[1].toLowerCase()) })
}))
