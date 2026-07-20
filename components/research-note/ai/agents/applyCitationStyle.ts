import {
  applyStyleToCiteSources,
  findUsedCiteSources,
  type CiteSource,
} from '@/components/research-note/ai/agents/citationBank'
import {
  formatInTextCite,
  isNumericCitationStyle,
  type CitationStyle,
} from '@/components/research-note/features/references/citation'
import {
  getPublicationCiteBank,
  mergePublicationCiteBank,
  setProjectCitationStyle,
} from '@/components/research-note/features/references/citationStyleSettings'
import { draftContentToMarkdown } from '@/components/research-note/lib/markdown'
import { PUBLICATION_SECTIONS } from '@/components/research-note/config/branding'
import { listDrafts, saveDraft } from '@/components/research-note/storage/repositories'
import { renderReferenceList } from './referenceList'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Rewrite in-text citations in a draft to the target style using soft Family+Year
 * matching, then style-specific replacement strings.
 */
export function rewriteInTextCitations(
  text: string,
  sources: CiteSource[],
  style: CitationStyle,
): string {
  if (!text.trim() || sources.length === 0) return text

  const styled = applyStyleToCiteSources(sources, style)
  let out = text

  const ordered = [...styled].sort((a, b) => {
    const af = a.authors[0] ? a.authors[0].length : 0
    const bf = b.authors[0] ? b.authors[0].length : 0
    return bf - af
  })

  for (const s of ordered) {
    const num = styled.findIndex((x) => x.id === s.id) + 1
    const forms = formatInTextCite(s, style, num)
    const family = s.authors[0]
      ? formatInTextCite(s, 'apa-7').narrative.split(' (')[0]!
      : ''
    const apa = formatInTextCite(s, 'apa-7')
    const harvard = formatInTextCite(s, 'harvard')
    const chicago = formatInTextCite(s, 'chicago-author-date')

    const replacements: Array<[string, string]> = [
      [apa.parenthetical, forms.parenthetical],
      [apa.narrative, forms.narrative],
      [harvard.parenthetical, forms.parenthetical],
      [harvard.narrative, forms.narrative],
      [chicago.parenthetical, forms.parenthetical],
      [chicago.narrative, forms.narrative],
      [s.parenthetical, forms.parenthetical],
      [s.narrative, forms.narrative],
    ]

    for (const [from, to] of replacements) {
      if (!from || from === to) continue
      out = out.split(from).join(to)
    }

    if (family && s.year && s.year !== 'n.d.' && !isNumericCitationStyle(style)) {
      const fam = escapeRegExp(family.replace(/\s+et\s+al\.?/i, '').trim())
      const yr = escapeRegExp(s.year)
      const softParen = new RegExp(
        `\\(\\s*${fam}\\b(?:\\s*,\\s*[^)]+|\\s+et\\s+al\\.?|\\s*(?:&|and)\\s+[^,)]+)?[,\\s]+${yr}\\s*\\)`,
        'gi',
      )
      const softNarr = new RegExp(
        `\\b${fam}\\b(?:\\s+et\\s+al\\.?|\\s+(?:and|&)\\s+[A-Z][a-zA-Z'-]+)?\\s*\\(\\s*${yr}\\s*\\)`,
        'gi',
      )
      out = out.replace(softParen, forms.parenthetical)
      out = out.replace(softNarr, forms.narrative)
    }
  }

  if (isNumericCitationStyle(style)) {
    const used = findUsedCiteSources(out, sources)
    for (const u of used) {
      const idx = styled.findIndex(
        (s) => s.title.toLowerCase() === u.title.toLowerCase(),
      )
      if (idx < 0) continue
      const forms = formatInTextCite(styled[idx]!, style, idx + 1)
      const apa = formatInTextCite(u, 'apa-7')
      out = out.split(apa.parenthetical).join(forms.parenthetical)
      out = out.split(apa.narrative).join(forms.narrative)
    }
  }

  return out
}

/**
 * Apply a citation style to Publication → References and all body sections.
 * Persists the style and returns how many drafts were updated.
 */
export async function applyCitationStyleToPublication(
  projectId: string,
  style: CitationStyle,
): Promise<{ style: CitationStyle; draftsUpdated: number; references: number }> {
  await setProjectCitationStyle(projectId, style)

  let bank = await getPublicationCiteBank(projectId)
  if (bank.length === 0) {
    return { style, draftsUpdated: 0, references: 0 }
  }

  bank = applyStyleToCiteSources(bank, style)
  await mergePublicationCiteBank(projectId, bank)

  await saveDraft(projectId, 'publication', 'References', {
    content: renderReferenceList(bank, style),
    humanEdited: false,
    provider: null,
    model: null,
  })

  const drafts = await listDrafts(projectId)
  let draftsUpdated = 1
  const bodySections = PUBLICATION_SECTIONS.filter((s) => s !== 'References')

  for (const section of bodySections) {
    const draft = drafts.find(
      (d) => d.outputType === 'publication' && d.section === section,
    )
    if (!draft?.content?.trim()) continue
    if (section === 'Title' || section === 'Keywords') continue

    const md = draftContentToMarkdown(draft.content)
    const next = rewriteInTextCitations(md, bank, style)
    if (next === md) continue

    await saveDraft(projectId, 'publication', section, {
      content: next,
      humanEdited: draft.humanEdited,
      provider: draft.provider,
      model: draft.model,
    })
    draftsUpdated += 1
  }

  return {
    style,
    draftsUpdated,
    references: bank.length,
  }
}

export { renderReferenceList }
