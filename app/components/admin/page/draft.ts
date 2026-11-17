import { mergePage, PAGE_DEFAULTS, type PageName, type PageOverrides } from '~/lib/pages'

/** The page editor's form state: every field of the page. A photo field with no photo is null. */
export type PageDraft = Record<string, string | null>

/** The page's own wording and photos, before any change of hers. */
export const originalsOf = (page: PageName): PageDraft => PAGE_DEFAULTS[page]

/** The form as it should open: what is on the website now, hers where she has changed it. */
export function draftFromPage(page: PageName, saved: PageOverrides): PageDraft {
  return { ...mergePage(page, saved) }
}

/** Compared trimmed, because the API trims what it stores. */
export const clean = (value: string | null | undefined) => (value ?? '').trim()

/**
 * Only the fields that differ from what the website shows now, in the shape
 * the API takes. Null when nothing differs, so Save stays off until something
 * changes.
 *
 * A field left empty, or put back to the original wording or photo, is sent as
 * null: that removes her version, so the original shows again and nothing is
 * stored that only repeats it.
 */
export function changedFields(
  page: PageName,
  draft: PageDraft,
  saved: PageOverrides
): Record<string, string | null> | null {
  const originals = originalsOf(page)
  const onSite = draftFromPage(page, saved)
  const changes: Record<string, string | null> = {}
  for (const key of Object.keys(originals)) {
    const original = clean(originals[key])
    const next = clean(draft[key]) || original
    if (next === clean(onSite[key])) continue
    changes[key] = next === original ? null : next
  }
  return Object.keys(changes).length > 0 ? changes : null
}
