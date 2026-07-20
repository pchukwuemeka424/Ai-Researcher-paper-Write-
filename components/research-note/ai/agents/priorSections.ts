import { PUBLICATION_SECTIONS } from '@/components/research-note/config/branding'
import { draftContentToMarkdown, draftContentToPlainText } from '@/components/research-note/lib/markdown'
import { listDrafts } from '@/components/research-note/storage/repositories'
import type { Draft } from '@/components/research-note/storage/types'

/** Per-section body cap for cascade context. */
const PER_SECTION_CAP = 4000

export interface PriorSectionContent {
  section: string
  content: string
}

export interface FilledSectionsBundle {
  /** Sections before the target in manuscript order (Title → …). */
  prior: PriorSectionContent[]
  /** Sections after the target that already have content. */
  later: PriorSectionContent[]
}

function bodyOf(draft: Draft): string {
  const raw = draft.content.trim()
  if (!raw) return ''
  return sectionBodyText(draft.section, raw)
}

/** Normalize draft body for prompts (plain Title/Keywords vs Markdown sections). */
export function sectionBodyText(section: string | null, raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const text =
    section === 'Title' || section === 'Keywords'
      ? draftContentToPlainText(trimmed)
      : draftContentToMarkdown(trimmed).trim()
  if (!text) return ''
  return text.length > PER_SECTION_CAP
    ? text.slice(0, PER_SECTION_CAP) + '\n…(trimmed)'
    : text
}

function mapFilled(
  bySection: Map<string, Draft>,
  from: number,
  to: number,
  exclude: string,
): PriorSectionContent[] {
  const out: PriorSectionContent[] = []
  for (let i = from; i < to; i++) {
    const name = PUBLICATION_SECTIONS[i]!
    if (name === exclude) continue
    const draft = bySection.get(name)
    if (!draft) continue
    const content = bodyOf(draft)
    if (!content) continue
    out.push({ section: name, content })
  }
  return out
}

/**
 * Collect every publication section that already has user/AI content,
 * split into prior (before target) and later (after target). Empty
 * sections are skipped. Title is always first when present.
 */
export async function getFilledPublicationSections(
  projectId: string,
  targetSection: string,
): Promise<FilledSectionsBundle> {
  const drafts = await listDrafts(projectId)
  const bySection = new Map<string, Draft>()
  for (const d of drafts) {
    if (d.outputType !== 'publication' || !d.section) continue
    if (!d.content.trim()) continue
    bySection.set(d.section, d)
  }

  const targetIdx = PUBLICATION_SECTIONS.indexOf(
    targetSection as (typeof PUBLICATION_SECTIONS)[number],
  )
  const idx = targetIdx >= 0 ? targetIdx : PUBLICATION_SECTIONS.length

  return {
    prior: mapFilled(bySection, 0, idx, targetSection),
    later: mapFilled(bySection, idx + 1, PUBLICATION_SECTIONS.length, targetSection),
  }
}

/** @deprecated Prefer getFilledPublicationSections — kept for callers that only need prior. */
export async function getPriorPublicationSections(
  projectId: string,
  targetSection: string,
): Promise<PriorSectionContent[]> {
  const { prior } = await getFilledPublicationSections(projectId, targetSection)
  return prior
}

/** Format prior sections for the agent prompt (Title → Abstract → …). */
export function formatPriorSections(prior: PriorSectionContent[]): string {
  if (prior.length === 0) return ''
  const blocks = prior.map((p) => `### ${p.section}\n${p.content}`)
  return [
    '## Prior publication sections (already filled — stay aligned)',
    'Checked in manuscript order. Match terminology, aims, and claims from these write-ups. Do not contradict them.',
    '',
    ...blocks,
  ].join('\n')
}

/** Format later filled sections so early sections stay consistent with later write-ups. */
export function formatLaterSections(later: PriorSectionContent[]): string {
  if (later.length === 0) return ''
  const blocks = later.map((p) => `### ${p.section}\n${p.content}`)
  return [
    '## Later publication sections (already filled — stay consistent)',
    'These sections already exist. Do not invent claims that conflict with them. Prefer their facts when refining earlier text.',
    '',
    ...blocks,
  ].join('\n')
}

/** Prefer the manuscript Title draft for literature search when available. */
export function titleFromPrior(prior: PriorSectionContent[]): string {
  return prior.find((p) => p.section === 'Title')?.content.trim() ?? ''
}
