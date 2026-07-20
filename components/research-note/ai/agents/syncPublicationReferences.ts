import {
  applyStyleToCiteSources,
  type CiteSource,
} from '@/components/research-note/ai/agents/citationBank'
import { type CitationStyle } from '@/components/research-note/features/references/citation'
import {
  getProjectCitationStyle,
  mergePublicationCiteBank,
} from '@/components/research-note/features/references/citationStyleSettings'
import { draftContentToMarkdown } from '@/components/research-note/lib/markdown'
import {
  getDraftFor,
  saveDraft,
} from '@/components/research-note/storage/repositories'
import { renderReferenceList } from './referenceList'

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[*_[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Merge newly used citation sources into the Publication → References draft.
 * Formats entries in the project's active citation style and persists the bank.
 */
export async function syncPublicationReferences(
  projectId: string,
  usedSources: CiteSource[],
  provider: string,
  model: string,
  styleOverride?: CitationStyle,
): Promise<{ added: number; updated: number; total: number }> {
  if (usedSources.length === 0) {
    return { added: 0, updated: 0, total: 0 }
  }

  const style = styleOverride ?? (await getProjectCitationStyle(projectId))
  const mergedBank = await mergePublicationCiteBank(projectId, usedSources)
  const styledBank = applyStyleToCiteSources(mergedBank, style)

  const existing = await getDraftFor(projectId, 'publication', 'References')
  const currentMd = existing?.content
    ? draftContentToMarkdown(existing.content)
    : ''

  let added = 0
  let updated = 0
  for (const source of usedSources) {
    const key = normalizeTitle(source.title)
    if (!key) continue
    if (!currentMd.toLowerCase().includes(key)) {
      added += 1
    } else {
      updated += 1
    }
  }

  await saveDraft(projectId, 'publication', 'References', {
    content: renderReferenceList(styledBank, style),
    humanEdited: false,
    provider,
    model,
  })

  return { added, updated, total: styledBank.length }
}
