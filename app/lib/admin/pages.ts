// How the admin lays out the Home and About pages for editing: which sections
// the form has, the order of the fields, and what each one is called. The
// fields themselves (and their original wording) belong to app/lib/pages.ts;
// this file only decides how they are shown to the owner.
//
// Sections follow each page from top to bottom and are named for what she sees
// on the website, so she can find a sentence in the form by where it sits on
// the page.
import type { AboutContent, HomeContent, PageContent, PageName } from '~/lib/pages'

export type FormField<K extends string = string> = {
  key: K
  label: string
  hint?: string
  /** How tall a multi-line box starts out. */
  rows?: number
}

export type FormSection<K extends string = string> = {
  /** Used for the section's heading id, so it must be unique within a page. */
  id: string
  title: string
  /** A line under the title saying where this is on the page, or what can't be changed here. */
  note?: string
  fields: readonly FormField<K>[]
}

// --- What kind of field a key is ---------------------------------------------
// Decided by the key's ending, the same rule app/lib/pages.ts and the API use.

export type FieldKind = 'photo' | 'description' | 'label' | 'heading' | 'sentence' | 'paragraphs'
export type TextKind = Exclude<FieldKind, 'photo'>

const ENDINGS: readonly (readonly [string, FieldKind])[] = [
  ['_image_url', 'photo'],
  ['_image_alt', 'description'],
  ['_eyebrow', 'label'],
  ['_title', 'heading'],
  ['_lede', 'sentence'],
  ['_body', 'paragraphs'],
]

export function fieldKind(key: string): FieldKind {
  const match = ENDINGS.find(([ending]) => key.endsWith(ending))
  if (!match) throw new Error(`Page field "${key}" has no known ending`)
  return match[1]
}

/** The most each kind of text may hold. The API refuses anything longer. */
export const MAX_LENGTH: Record<TextKind, number> = {
  description: 300,
  label: 80,
  heading: 160,
  sentence: 300,
  paragraphs: 3000,
}

/** "hero_image_alt" → "hero_image_url": the photo a description belongs to. */
export const photoKeyFor = (descriptionKey: string) => descriptionKey.replace(/_image_alt$/, '_image_url')

// --- Wording shared by many fields -------------------------------------------

const LABEL = 'Small label above the heading'
const ITALICS = 'Put *asterisks* around a word to show it in italics.'
// The top of the home page and the closing banner also colour the word.
const ITALICS_COLOR = 'Put *asterisks* around a word to show it in italics and in color.'
const PARAGRAPHS = 'A blank line starts a new paragraph.'
const DESCRIBE = 'Describe the photo'
const READ_ALOUD = 'A few words about what the photo shows. It is read aloud to people who can’t see the photo.'

const photo = <K extends string>(key: K, label = 'Photo') => ({ key, label }) satisfies FormField
const describe = <K extends string>(key: K) => ({ key, label: DESCRIBE, hint: READ_ALOUD }) satisfies FormField

// --- Home ----------------------------------------------------------------------

const HOME_FORM = [
  {
    id: 'hero',
    title: 'Top of the page',
    note: 'The large photo and heading visitors see first.',
    fields: [
      photo('hero_image_url'),
      describe('hero_image_alt'),
      { key: 'hero_eyebrow', label: LABEL },
      {
        key: 'hero_title',
        label: 'Heading',
        hint: ITALICS_COLOR,
      },
    ],
  },
  {
    id: 'intro',
    title: 'Introduction',
    note: 'The first thing visitors read after the top photo.',
    fields: [
      { key: 'intro_eyebrow', label: LABEL },
      { key: 'intro_title', label: 'Heading', hint: ITALICS },
      { key: 'intro_body', label: 'Text', hint: PARAGRAPHS, rows: 8 },
      photo('intro_image_url'),
      describe('intro_image_alt'),
    ],
  },
  {
    id: 'services',
    title: 'Services section',
    note: 'The heading above the three cards. The cards themselves are next.',
    fields: [
      { key: 'services_eyebrow', label: LABEL },
      { key: 'services_title', label: 'Heading', hint: ITALICS },
    ],
  },
  {
    id: 'teaser-1',
    title: 'Weddings card',
    note: 'The first card. It always opens the Weddings part of the Services page.',
    fields: [
      photo('teaser_1_image_url'),
      describe('teaser_1_image_alt'),
      { key: 'teaser_1_title', label: 'Card heading', hint: ITALICS },
      { key: 'teaser_1_body', label: 'Card text', hint: 'A sentence or two.', rows: 3 },
    ],
  },
  {
    id: 'teaser-2',
    title: 'Social & Corporate card',
    note: 'The second card. It always opens the Social & Corporate part of the Services page.',
    fields: [
      photo('teaser_2_image_url'),
      describe('teaser_2_image_alt'),
      { key: 'teaser_2_title', label: 'Card heading', hint: ITALICS },
      { key: 'teaser_2_body', label: 'Card text', hint: 'A sentence or two.', rows: 3 },
    ],
  },
  {
    id: 'teaser-3',
    title: 'Consulting card',
    note: 'The third card. It always opens the Consulting part of the Services page.',
    fields: [
      photo('teaser_3_image_url'),
      describe('teaser_3_image_alt'),
      { key: 'teaser_3_title', label: 'Card heading', hint: ITALICS },
      { key: 'teaser_3_body', label: 'Card text', hint: 'A sentence or two.', rows: 3 },
    ],
  },
  {
    id: 'portfolio',
    title: 'Recent work heading',
    note: 'Shown above the photos from your galleries. The photos themselves are under Galleries.',
    fields: [
      { key: 'portfolio_eyebrow', label: LABEL },
      { key: 'portfolio_title', label: 'Heading', hint: ITALICS },
    ],
  },
  {
    id: 'cta',
    title: 'Closing banner',
    note: 'The dark band at the bottom of the page, above the “Begin Your Inquiry” button.',
    fields: [{ key: 'cta_title', label: 'Heading', hint: ITALICS_COLOR }],
  },
] as const satisfies readonly FormSection<keyof HomeContent>[]

// --- About ---------------------------------------------------------------------

const ABOUT_FORM = [
  {
    id: 'header',
    title: 'Page heading',
    note: 'The top of the page.',
    fields: [
      { key: 'header_eyebrow', label: LABEL },
      { key: 'header_title', label: 'Heading', hint: ITALICS },
      { key: 'header_lede', label: 'Line under the heading', hint: 'One sentence.', rows: 3 },
    ],
  },
  {
    id: 'story',
    title: 'Your story',
    fields: [
      photo('story_image_url'),
      describe('story_image_alt'),
      { key: 'story_eyebrow', label: LABEL },
      { key: 'story_title', label: 'Heading', hint: ITALICS },
      { key: 'story_body', label: 'Text', hint: PARAGRAPHS, rows: 12 },
    ],
  },
  {
    id: 'owner',
    title: 'Meet the owner',
    fields: [
      photo('owner_image_url', 'Portrait'),
      describe('owner_image_alt'),
      { key: 'owner_eyebrow', label: LABEL },
      { key: 'owner_title', label: 'Heading', hint: ITALICS },
      { key: 'owner_body', label: 'Text', hint: PARAGRAPHS, rows: 8 },
    ],
  },
  {
    id: 'cta',
    title: 'Closing banner',
    note: 'The dark band at the bottom of the page, above the “Begin Your Inquiry” button.',
    fields: [{ key: 'cta_title', label: 'Heading', hint: ITALICS_COLOR }],
  },
] as const satisfies readonly FormSection<keyof AboutContent>[]

// --- Every field must be in its form -------------------------------------------
// A field added to app/lib/pages.ts later would otherwise be editable in theory
// and missing from the admin in practice. If a form leaves one out, Covers<>
// turns into a type nothing fits, so PAGE_FORMS below stops compiling and the
// error names the field.

type KeysIn<S extends readonly FormSection[]> = S[number]['fields'][number]['key']
type Covers<P extends PageName, S extends readonly FormSection[]> = [
  Exclude<keyof PageContent<P>, KeysIn<S>>,
] extends [never]
  ? readonly FormSection<keyof PageContent<P> & string>[]
  : { 'fields missing from the form': Exclude<keyof PageContent<P>, KeysIn<S>> }

export const PAGE_FORMS: {
  home: Covers<'home', typeof HOME_FORM>
  about: Covers<'about', typeof ABOUT_FORM>
} = { home: HOME_FORM, about: ABOUT_FORM }

// --- The pages themselves ------------------------------------------------------

export type PageInfo = {
  page: PageName
  title: string
  /** Where the page lives on the website. */
  path: string
  blurb: string
  /** The photo that stands for the page in the list. */
  thumbKey: string
}

export const PAGES: readonly PageInfo[] = [
  {
    page: 'home',
    title: 'Home',
    path: '/',
    blurb: 'The first page visitors see.',
    thumbKey: 'hero_image_url' satisfies keyof HomeContent,
  },
  {
    page: 'about',
    title: 'About',
    path: '/about',
    blurb: 'Your story, and a little about you.',
    thumbKey: 'story_image_url' satisfies keyof AboutContent,
  },
]

export const pageInfo = (name: string | undefined) => PAGES.find((p) => p.page === name)

/**
 * One line on where a page stands, e.g. "Last changed November 3, 2026" (in
 * her own time zone). A page with nothing of hers on it says so instead, even
 * if it has been saved before: putting everything back still counts as a save.
 */
export function pageStatus(content: Record<string, unknown> | null | undefined, updatedAt: string | null | undefined) {
  const date = updatedAt ? new Date(updatedAt) : null
  const hasChanges = Object.values(content ?? {}).some((v) => typeof v === 'string' && v.trim())
  if (!hasChanges || !date || Number.isNaN(date.getTime())) return 'Showing the original wording and photos'
  return `Last changed ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
}
