import { PUBLICATION_SECTIONS } from '@/components/research-note/config/branding'
import type { OutputType } from '@/components/research-note/storage/types'
import {
  buildAgentPrompt,
  buildCitationFixPrompt,
  orchestrateSectionDraft,
} from '@/components/research-note/ai/agents'
import {
  minCitationsForSection,
  countBankCitations,
  sourcesForReferenceSync,
  type CiteSource,
} from '@/components/research-note/ai/agents/citationBank'
import { syncPublicationReferences } from '@/components/research-note/ai/agents/syncPublicationReferences'
import { generate } from './client'

export interface GeneratedDraft {
  content: string
  provider: string
  model: string
  /** Which section agent produced this draft. */
  agentId: string
  /** Papers fetched from the research API and used as source material. */
  literatureCount: number
  /** How many bibliography entries were added/updated in Publication → References. */
  referencesAdded: number
  referencesUpdated: number
  referencesTotal: number
}

/** Strip em/en dashes from model output (prefer commas or hyphens). */
export function sanitizeDashes(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/,{2,}/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/([.!?]),\s+/g, '$1 ')
}

/** Title/Keywords should stay single-line plain text. */
function sanitizePlainSection(section: string | null, text: string): string {
  if (section !== 'Title' && section !== 'Keywords') return text
  return text
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(section === 'Keywords' ? ', ' : ' ')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Keep only the requested publication section if the model outputs multiple
 * IMRaD headings in one response.
 */
function isolatePublicationSection(section: string, text: string): string {
  let content = text.trim()
  if (!content) return content

  const ownHeading = new RegExp(`^#{1,3}\\s*${escapeRegExp(section)}\\s*$`, 'im')
  content = content.replace(ownHeading, '').trim()

  let cutAt = content.length
  for (const other of PUBLICATION_SECTIONS) {
    if (other === section) continue
    const next = new RegExp(`^#{1,3}\\s*${escapeRegExp(other)}\\s*$`, 'im')
    const match = next.exec(content)
    if (match?.index !== undefined && match.index < cutAt) {
      cutAt = match.index
    }
  }
  return content.slice(0, cutAt).trim()
}

function finalizeSectionContent(section: string, raw: string): string {
  let content = sanitizeDashes(raw)
  content = sanitizePlainSection(section, content)
  if (section !== 'Title' && section !== 'Keywords') {
    content = isolatePublicationSection(section, content)
  }
  return sanitizeDashes(content)
}

/**
 * If the draft is missing enough bank citations, run a citation-only fix pass
 * (especially important for Introduction).
 */
async function ensureInTextCitations(
  section: string,
  content: string,
  sources: CiteSource[],
  provider: string,
  model: string,
): Promise<{ content: string; provider: string; model: string }> {
  if (sources.length === 0) return { content, provider, model }

  const min = minCitationsForSection(section, sources.length)
  const found = countBankCitations(content, sources)
  if (found >= min) return { content, provider, model }

  const { system, user } = buildCitationFixPrompt(section, content, sources)
  const fixed = await generate({
    system,
    messages: [{ role: 'user', content: user }],
    maxTokens: section === 'Introduction' || section === 'Literature Review' || section === 'Discussion' ? 6144 : 3072,
  })

  const next = finalizeSectionContent(section, fixed.text)
  // Keep the better of the two if fix somehow emptied the draft.
  if (next.trim().length < Math.min(80, content.trim().length / 2)) {
    return { content, provider, model }
  }
  return { content: next, provider: fixed.provider, model: fixed.model }
}

/**
 * Multi-agent draft generation: generates ONE publication section at a time.
 * Progress Reports must be written manually (no whole-doc gen).
 */
export async function generateDraft(
  projectId: string,
  outputType: OutputType,
  section: string | null,
  existingContent?: string | null,
): Promise<GeneratedDraft> {
  if (outputType !== 'publication' || !section) {
    throw new Error('Generate draft is available per Manuscript section only.')
  }
  if (section === 'References') {
    throw new Error(
      'References are updated automatically when you generate or refine body sections with citations.',
    )
  }

  const { ctx, bundle } = await orchestrateSectionDraft(
    projectId,
    outputType,
    section,
    existingContent,
  )
  const { system, user } = buildAgentPrompt(ctx, bundle)
  const maxTokens =
    section === 'Title' || section === 'Keywords'
      ? 512
      : section === 'Literature Review' || section === 'Introduction' || section === 'Discussion'
        ? 6144
        : 4096

  const result = await generate({
    system,
    messages: [{ role: 'user', content: user }],
    maxTokens,
  })

  let content = finalizeSectionContent(section, result.text)
  let provider = result.provider
  let model = result.model

  if (bundle.target.useInTextCitations && bundle.citeSources.length > 0) {
    const ensured = await ensureInTextCitations(
      section,
      content,
      bundle.citeSources,
      provider,
      model,
    )
    content = ensured.content
    provider = ensured.provider
    model = ensured.model
  }

  let referencesAdded = 0
  let referencesUpdated = 0
  let referencesTotal = 0

  if (bundle.target.useInTextCitations && bundle.citeSources.length > 0) {
    const toStore = sourcesForReferenceSync(content, bundle.citeSources)
    const sync = await syncPublicationReferences(
      projectId,
      toStore,
      provider,
      model,
    )
    referencesAdded = sync.added
    referencesUpdated = sync.updated
    referencesTotal = sync.total
  }

  return {
    content,
    provider,
    model,
    agentId: bundle.target.id,
    literatureCount: bundle.literatureCount,
    referencesAdded,
    referencesUpdated,
    referencesTotal,
  }
}
