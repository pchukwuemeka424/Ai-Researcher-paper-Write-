import {
  applyStyleToCiteSources,
  formatReferenceEntry,
  type CiteSource,
} from '@/components/research-note/ai/agents/citationBank'
import {
  isNumericCitationStyle,
  type CitationStyle,
} from '@/components/research-note/features/references/citation'

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[*_[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Render the Publication → References draft body for a citation style. */
export function renderReferenceList(sources: CiteSource[], style: CitationStyle): string {
  if (sources.length === 0) {
    return '_No references cited yet. Generate or refine body sections with research-API citations to populate this list._'
  }
  const styled = applyStyleToCiteSources(sources, style)
  const numeric = isNumericCitationStyle(style)

  if (numeric) {
    return styled
      .map((s, i) => {
        const entry = formatReferenceEntry(s, style, i + 1)
        if (style === 'vancouver') return entry
        return `- ${entry}`
      })
      .join('\n')
  }

  const sorted = [...styled].sort((a, b) =>
    normalizeTitle(a.title).localeCompare(normalizeTitle(b.title)),
  )
  return sorted.map((s) => `- ${formatReferenceEntry(s, style)}`).join('\n')
}
