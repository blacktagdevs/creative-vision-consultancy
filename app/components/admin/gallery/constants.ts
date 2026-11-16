/** The most photos one gallery can hold; the API refuses more. */
export const PHOTO_LIMIT = 40

export const CATEGORY_OPTIONS = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'social', label: 'Celebration' },
  { value: 'corporate', label: 'Corporate' },
] as const

export const photoCountText = (n: number) => `${n} of ${PHOTO_LIMIT} photos`

/** The delete warning's middle sentence; an empty gallery has nothing to lose. */
export function photosGoToo(n: number) {
  if (n === 0) return ''
  return `Its ${n} ${n === 1 ? 'photo' : 'photos'} will be deleted too. `
}
