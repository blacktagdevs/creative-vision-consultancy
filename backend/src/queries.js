// SQL shared by the public and admin routes.

/*
 * Portfolio rows with their cover photo. The cover is the chosen
 * cover_photo_id when set, otherwise the gallery's first photo, so a gallery
 * always shows something as soon as it has one photo. `where` is a trusted
 * fragment written in this codebase, never built from input.
 */
export function portfolioListSql(where = 'TRUE') {
  return `
    SELECT p.*,
           cover.image_url AS cover_url,
           cover.alt       AS cover_alt,
           cover.width     AS cover_width,
           cover.height    AS cover_height,
           (SELECT count(*)::int FROM portfolio_photos c WHERE c.portfolio_item_id = p.id) AS photo_count
    FROM portfolio_items p
    LEFT JOIN LATERAL (
      SELECT ph.image_url, ph.alt, ph.width, ph.height
      FROM portfolio_photos ph
      WHERE ph.portfolio_item_id = p.id
      ORDER BY (ph.id IS NOT DISTINCT FROM p.cover_photo_id) DESC, ph.sort_order, ph.created_at
      LIMIT 1
    ) cover ON TRUE
    WHERE ${where}
    ORDER BY p.sort_order, p.created_at`
}

export const PHOTOS_SQL = `
  SELECT id, image_url, alt, width, height, sort_order
  FROM portfolio_photos
  WHERE portfolio_item_id = $1
  ORDER BY sort_order, created_at`
