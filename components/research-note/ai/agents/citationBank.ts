import { listReferences } from '@/components/research-note/storage/repositories'
import type { OutlinePaper } from '@/lib/research-outline-sources'
import type { Reference } from '@/components/research-note/storage/types'
import {
  familyName as citeFamilyName,
  formatBibliographyEntry,
  formatInTextCite,
  type CitationStyle,
} from '@/components/research-note/features/references/citation'

export interface CiteSource {
  /** Stable key, e.g. S1 */
  id: string
  /** Parenthetical cite for the active style */
  parenthetical: string
  /** Narrative cite for the active style */
  narrative: string
  title: string
  authors: string[]
  year: string
  abstract: string
  url: string
}

function familyName(author: string): string {
  return citeFamilyName(author)
}

export function paperYear(publicationDate: string | null | undefined): string {
  if (!publicationDate?.trim()) return 'n.d.'
  const raw = publicationDate.trim()
  if (/^\d{4}$/.test(raw)) return raw
  const y = new Date(raw).getFullYear()
  return Number.isFinite(y) && y > 1000 ? String(y) : raw.slice(0, 4) || 'n.d.'
}

export function apaParenthetical(authors: string[], year: string): string {
  return formatInTextCite({ authors, year }, 'apa-7').parenthetical
}

export function apaNarrative(authors: string[], year: string): string {
  return formatInTextCite({ authors, year }, 'apa-7').narrative
}

/** Attach style-specific in-text strings (and optional numeric index). */
export function withCitationStyle(
  source: Omit<CiteSource, 'parenthetical' | 'narrative'> &
    Partial<Pick<CiteSource, 'parenthetical' | 'narrative'>>,
  style: CitationStyle,
  number?: number,
): CiteSource {
  const forms = formatInTextCite(source, style, number)
  return {
    id: source.id,
    title: source.title,
    authors: source.authors,
    year: source.year,
    abstract: source.abstract,
    url: source.url,
    parenthetical: forms.parenthetical,
    narrative: forms.narrative,
  }
}

export function applyStyleToCiteSources(
  sources: CiteSource[],
  style: CitationStyle,
): CiteSource[] {
  return sources.map((s, i) => withCitationStyle(s, style, i + 1))
}

export function citeSourceFromPaper(
  paper: OutlinePaper,
  index: number,
  style: CitationStyle = 'apa-7',
): CiteSource {
  const authors = (paper.authors ?? []).map((a) => a.trim()).filter(Boolean)
  const year = paperYear(paper.publicationDate)
  return withCitationStyle(
    {
      id: `S${index + 1}`,
      title: paper.title.trim(),
      authors,
      year,
      abstract: (paper.abstract ?? '').replace(/\s+/g, ' ').trim(),
      url: paper.url || (paper.arxivId ? `https://arxiv.org/abs/${paper.arxivId}` : ''),
    },
    style,
    index + 1,
  )
}

export function citeSourceFromReference(
  ref: Reference,
  index: number,
  style: CitationStyle = 'apa-7',
): CiteSource {
  const authors = (ref.authors ?? []).map((a) => a.trim()).filter(Boolean)
  const year = ref.year?.trim() || 'n.d.'
  return withCitationStyle(
    {
      id: `R${index + 1}`,
      title: ref.title.trim(),
      authors,
      year,
      abstract: (ref.abstract ?? '').replace(/\s+/g, ' ').trim(),
      url: ref.url || (ref.doi ? `https://doi.org/${ref.doi}` : ''),
    },
    style,
    index + 1,
  )
}

/** Load project library refs as cite sources (optional enrichment). */
export async function loadProjectCiteSources(
  projectId: string,
  style: CitationStyle = 'apa-7',
): Promise<CiteSource[]> {
  const refs = await listReferences(projectId)
  return refs
    .filter((r) => r.title.trim())
    .slice(0, 30)
    .map((r, i) => citeSourceFromReference(r, i, style))
}

/**
 * Format a CITATION BANK the model must copy from (chat-paper style).
 * Keys are explicit so Introduction cannot skip cites.
 */
export function formatCitationBank(
  sources: CiteSource[],
  query: string,
  options?: { section?: string; minCites?: number; style?: CitationStyle },
): string {
  if (sources.length === 0) return ''

  const style = options?.style ?? 'apa-7'
  const minCites =
    options?.minCites ??
    minCitationsForSection(options?.section ?? '', sources.length)

  const blocks = sources.map((s) => {
    const abs = s.abstract
      ? s.abstract.slice(0, 1100) + (s.abstract.length > 1100 ? '…' : '')
      : 'Abstract unavailable.'
    return [
      `### ${s.id}`,
      `USE THIS CITE (copy exactly): ${s.parenthetical}`,
      `Narrative form: ${s.narrative}`,
      `Title: ${s.title}`,
      `Authors: ${s.authors.length ? s.authors.join(', ') : 'Anon'}`,
      `Year: ${s.year}`,
      s.url ? `URL: ${s.url}` : '',
      `Evidence:\n${abs}`,
    ]
      .filter(Boolean)
      .join('\n')
  })

  const keyList = sources.map((s) => `${s.id} → ${s.parenthetical}`).join('\n')
  const section = options?.section || 'this section'

  return [
    `## CITATION BANK (REQUIRED for in-text citations — ${style} style, deep literature dive)`,
    `Fetched via research papers API (multi-query) for: "${query}"`,
    `${sources.length} source(s). Citation style: ${style}. Copy cite strings EXACTLY into the prose.`,
    '',
    '### Quick cite keys (use these in the body)',
    keyList,
    '',
    `Rules (${style}):`,
    `- Insert ${style} in-text citations by copying the "USE THIS CITE" strings exactly.`,
    '- Every major claim from literature MUST have an in-text citation from this bank.',
    `- For ${section}: include at least ${minCites} distinct cites from this bank (prefer more when the bank is large).`,
    '- Do a real deep dive: synthesise themes, methods, findings, and disagreements ACROSS many papers — do not rely on 2–3 favourite sources.',
    '- Prefer citing different bank entries for different claims; reuse a source only when it truly supports multiple points.',
    '- When comparing prior work, cite at least two bank sources in the same paragraph where debates or contrasts appear.',
    'Do not invent authors/years/papers outside this bank.',
    '- Do not paste a full References bibliography into this body section (it is stored under Manuscript → References).',
    '',
    ...blocks,
  ].join('\n\n')
}

/** Strip HTML / markdown noise so citation matching works on editor content. */
export function plainTextForCitationMatch(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\*\*?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Count distinct parenthetical/narrative cites from the bank that appear in text. */
export function countBankCitations(text: string, sources: CiteSource[]): number {
  return findUsedCiteSources(text, sources).length
}

/** Return bank sources that appear as in-text citations in the draft. */
export function findUsedCiteSources(
  text: string,
  sources: CiteSource[],
): CiteSource[] {
  if (!text.trim() || sources.length === 0) return []
  const hay = plainTextForCitationMatch(text)
  const found: CiteSource[] = []
  const seen = new Set<string>()

  for (const s of sources) {
    if (seen.has(s.id)) continue
    if (hay.includes(s.parenthetical) || hay.includes(s.narrative)) {
      found.push(s)
      seen.add(s.id)
      continue
    }

    const family = s.authors[0] ? familyName(s.authors[0]) : ''
    const year = s.year
    if (!family || !year || year === 'n.d.') continue

    const fam = escapeRegExp(family)
    const yr = escapeRegExp(year)
    // (Smith, 2021) | (Smith et al., 2021) | (Smith & Jones, 2021) | (Smith and Jones, 2021)
    const softParen = new RegExp(
      `\\(\\s*${fam}\\b(?:\\s*,\\s*[^)]+|\\s+et\\s+al\\.?|\\s*(?:&|and)\\s+[^,)]+)?,\\s*${yr}\\s*\\)`,
      'i',
    )
    // Smith (2021) | Smith et al. (2021) | Smith and Jones (2021)
    const softNarr = new RegExp(
      `\\b${fam}\\b(?:\\s+et\\s+al\\.?|\\s+(?:and|&)\\s+[A-Z][a-zA-Z'-]+)?\\s*\\(\\s*${yr}\\s*\\)`,
      'i',
    )
    if (softParen.test(hay) || softNarr.test(hay)) {
      found.push(s)
      seen.add(s.id)
    }
  }

  // If years from the bank appear in any (…, YEAR) cite, include those sources
  // even when the model shortened author names.
  if (found.length === 0) {
    for (const s of sources) {
      if (seen.has(s.id) || !s.year || s.year === 'n.d.') continue
      const yr = escapeRegExp(s.year)
      if (new RegExp(`\\([^)]*\\b${yr}\\b[^)]*\\)`).test(hay)) {
        const family = s.authors[0] ? familyName(s.authors[0]) : ''
        if (family && new RegExp(escapeRegExp(family), 'i').test(hay)) {
          found.push(s)
          seen.add(s.id)
        }
      }
    }
  }

  return found
}

/**
 * Sources to persist in Publication → References after a generate/refine.
 * Prefers cites detected in the draft; falls back to the full research-API bank
 * so References still populates when the model paraphrases cite strings.
 */
export function sourcesForReferenceSync(
  text: string,
  bank: CiteSource[],
): CiteSource[] {
  if (bank.length === 0) return []
  const used = findUsedCiteSources(text, bank)
  if (used.length > 0) return used
  // Draft has citation-like (Author, Year) patterns → keep the bank for this pass.
  const hay = plainTextForCitationMatch(text)
  if (/\([A-Z][^)]{0,80}\b(?:19|20)\d{2}\b[^)]*\)/.test(hay)) {
    return bank
  }
  // Still sync the bank when we fetched literature for a citing section:
  // those papers were the sources for this generation.
  return bank
}

/** Bibliography line for the Publication References section. */
export function formatReferenceEntry(
  source: CiteSource,
  style: CitationStyle = 'apa-7',
  number?: number,
): string {
  return formatBibliographyEntry(
    {
      title: source.title,
      authors: source.authors,
      year: source.year,
      url: source.url || undefined,
    },
    style,
    { number, markdownLink: true },
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Minimum distinct bank cites expected per section (deep-dive oriented). */
export function minCitationsForSection(
  section: string,
  available: number,
): number {
  if (available <= 0) return 0
  const targets: Record<string, number> = {
    Introduction: 10,
    'Literature Review': 14,
    'Materials & Methods': 6,
    Results: 5,
    Discussion: 10,
    Conclusion: 5,
    Supplementary: 4,
  }
  const floor = targets[section] ?? 6
  // All citing sections should draw on a substantial share of the bank.
  const share =
    section === 'Literature Review'
      ? 0.65
      : section === 'Introduction' || section === 'Discussion'
        ? 0.5
        : 0.35
  const fromShare = Math.ceil(available * share)
  return Math.min(available, Math.max(floor, fromShare))
}
