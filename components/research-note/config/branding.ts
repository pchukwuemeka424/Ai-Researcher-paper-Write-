/**
 * Central branding & label configuration.
 *
 * NON-NEGOTIABLE (CLAUDE.md): the app name and tab labels must be changeable
 * in ONE place. This is that place. Rename the app or relabel any tab here and
 * it propagates everywhere. Do not hard-code these strings elsewhere.
 */

export const APP_NAME = 'Research Note'
export const APP_TAGLINE = 'Capture notes, data, lab log, and AI drafts in one place.'

/**
 * Project workspace tabs (single AI Drafts surface).
 */
export const AI_DRAFT_TABS = {
  notes: 'Materials',
  data: 'Data',
  images: 'Figures',
  eln: 'Lab Log',
  labReports: 'Lab Reports',
  progressReports: 'Progress Reports',
  publication: 'Publication',
} as const

/** Document draft types (subset of AI_DRAFT_TABS). */
export const OUTPUT_TABS = {
  labReports: 'Lab Reports',
  progressReports: 'Progress Reports',
  publication: 'Publication',
} as const

/** Sections that use a plain text input (not the Word editor). */
export const PLAIN_PUBLICATION_SECTIONS = ['Title', 'Keywords'] as const

/** Standard manuscript sections under the Publication tab. */
export const PUBLICATION_SECTIONS = [
  'Title',
  'Abstract',
  'Keywords',
  'Introduction',
  'Literature Review',
  'Materials & Methods',
  'Results',
  'Discussion',
  'Conclusion',
  'References',
  'Acknowledgements',
  'Supplementary',
] as const

export type AiDraftTabKey = keyof typeof AI_DRAFT_TABS
export type OutputTabKey = keyof typeof OUTPUT_TABS
export type PublicationSection = (typeof PUBLICATION_SECTIONS)[number]

export function isPlainPublicationSection(section: string | null): boolean {
  return section === 'Title' || section === 'Keywords'
}

/** Sections that should not run research-API drafting (assembled or short fields). */
export function isAutoManagedPublicationSection(section: string | null): boolean {
  return section === 'References'
}

export function isOutputTabKey(key: string): key is OutputTabKey {
  return key in OUTPUT_TABS
}
