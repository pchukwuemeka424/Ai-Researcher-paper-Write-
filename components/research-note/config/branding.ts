/**
 * Central branding & label configuration.
 *
 * NON-NEGOTIABLE (CLAUDE.md): the app name and tab labels must be changeable
 * in ONE place. This is that place. Rename the app or relabel any tab here and
 * it propagates everywhere. Do not hard-code these strings elsewhere.
 */

export const APP_NAME = 'Research Note'
export const APP_TAGLINE =
  'Capture Materials, Data, Figures, Lab Log, progress reports, and manuscript sections — then export all captured as PDF.'

/**
 * Project workspace tabs (single AI Drafts surface).
 */
export const AI_DRAFT_TABS = {
  notes: 'Materials',
  data: 'Data',
  images: 'Figures',
  eln: 'Lab Log',
  progressReports: 'Progress Reports',
  publication: 'Manuscript',
} as const

export type AiDraftTabKey = keyof typeof AI_DRAFT_TABS

/** Short usability hints shown under each workspace tab. */
export const AI_DRAFT_HINTS: Record<AiDraftTabKey, string> = {
  notes: 'Capture readings, ideas, and source notes',
  data: 'Import spreadsheets, run stats, plot charts',
  images: 'Store figures, photos, and plots',
  eln: 'Timestamped experiment and lab records',
  progressReports: 'Progress %, milestones, logs, and next steps',
  publication: 'Write the full paper section by section',
}

/** Longer instruction shown as a dismissible tip when a tab is active. */
export const AI_DRAFT_GUIDES: Record<AiDraftTabKey, string> = {
  notes:
    'Start here. Capture literature notes, quotes, and working ideas. These materials feed Progress Reports and Manuscript drafts.',
  data: 'Import a spreadsheet or create a blank sheet. Run statistics and save charts to Figures so they appear in your draft PDF.',
  images:
    'Upload images or drag them in. Figures from Data charts and Lab Log pastes also appear here for reuse in write-ups.',
  eln: 'Log what you did and observed. Entries are append-only once saved, so your Methods and Results stay reproducible.',
  progressReports:
    'Live progress %, work done, Lab Log digest, milestones, and blockers — compose a narrative for supervisors from notebook activity.',
  publication:
    'Work section by section (Title → References). Set your reference style once — in-text cites and the bibliography stay aligned.',
}

/** Nav groups for the redesigned workspace sidebar. */
export const AI_DRAFT_NAV_GROUPS: { id: string; label: string; keys: AiDraftTabKey[] }[] = [
  {
    id: 'capture',
    label: '',
    keys: ['notes', 'data', 'images', 'eln'],
  },
  {
    id: 'write',
    label: '',
    keys: ['progressReports', 'publication'],
  },
]

/** Document draft types (subset of AI_DRAFT_TABS). */
export const OUTPUT_TABS = {
  progressReports: 'Progress Reports',
  publication: 'Manuscript',
} as const

/** Sections that use a plain text input (not the Word editor). */
export const PLAIN_PUBLICATION_SECTIONS = ['Title', 'Keywords'] as const

/** Standard manuscript sections under the Manuscript tab. */
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

/** Short guidance for each manuscript section. */
export const PUBLICATION_SECTION_GUIDES: Record<string, string> = {
  Title: 'Use a clear, searchable title that names the topic, population, or method — not a working nickname.',
  Abstract:
    'Summarise purpose, method, key findings, and implications in one tight paragraph (usually 150–300 words).',
  Keywords: 'List 4–8 searchable terms, separated by commas. Prefer controlled vocabulary when your field has one.',
  Introduction: 'Frame the problem, gap, and research question. End with what this paper contributes.',
  'Literature Review':
    'Synthesise prior work by theme or debate. Cite sources you have captured in Materials and Lab Log.',
  'Materials & Methods':
    'Describe procedures so another researcher could reproduce them. Pull detail from Lab Log entries.',
  Results: 'Report findings without interpretation. Reference figures and tables from Data and Figures.',
  Discussion: 'Interpret results against the literature. Note limitations and implications.',
  Conclusion: 'Restate the answer to the research question and the takeaway for practice or further study.',
  References:
    'Auto-built from cited sources. Change Reference style above to reformat this list and in-text citations.',
  Acknowledgements: 'Credit funders, labs, assistants, and anyone who supported the work (not co-authors).',
  Supplementary: 'Extra tables, instruments, or appendices that support but do not belong in the main text.',
}

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
