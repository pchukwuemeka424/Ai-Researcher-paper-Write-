import type { Reference, ReferenceType } from '@/components/research-note/storage/types'

/** Fields we can parse from a source, before a project id / timestamps are attached. */
export type ParsedReference = Omit<
  Reference,
  'id' | 'projectId' | 'createdAt' | 'updatedAt'
>

/** Normalise a DOI, tolerating full URLs and the `doi:` prefix. */
export function normaliseDoi(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .trim()
}

const TYPE_MAP: Record<string, ReferenceType> = {
  'journal-article': 'article',
  'proceedings-article': 'article',
  book: 'book',
  'book-chapter': 'book',
  monograph: 'book',
}

/** Strip JATS/XML tags Crossref sometimes wraps abstracts in. */
function stripTags(s: string | undefined): string | null {
  if (!s) return null
  return s.replace(/<[^>]+>/g, '').trim() || null
}

function firstOrNull(v: unknown): string | null {
  if (Array.isArray(v)) return v[0] ? String(v[0]) : null
  return v ? String(v) : null
}

/** Map a Crossref `message` object to our Reference shape. */
export function mapCrossref(m: Record<string, unknown>): ParsedReference {
  const authors = Array.isArray(m.author)
    ? (m.author as Array<{ family?: string; given?: string; name?: string }>).map(
        (a) =>
          a.family
            ? `${a.family}${a.given ? `, ${a.given}` : ''}`
            : (a.name ?? 'Unknown'),
      )
    : []

  const issued = m.issued as { 'date-parts'?: number[][] } | undefined
  const year = issued?.['date-parts']?.[0]?.[0]

  return {
    type: TYPE_MAP[String(m.type)] ?? 'other',
    title: firstOrNull(m.title) ?? 'Untitled',
    authors,
    year: year ? String(year) : null,
    containerTitle: firstOrNull(m['container-title']),
    volume: m.volume ? String(m.volume) : null,
    issue: m.issue ? String(m.issue) : null,
    pages: m.page ? String(m.page) : null,
    publisher: m.publisher ? String(m.publisher) : null,
    doi: m.DOI ? String(m.DOI) : null,
    url: m.URL ? String(m.URL) : null,
    abstract: stripTags(m.abstract as string | undefined),
    source: 'crossref',
  }
}

/**
 * Fetch reference metadata from Crossref by DOI. Public, keyless API — safe to
 * call from the client. Results are cached locally once saved (local-first).
 */
export async function fetchByDoi(doi: string): Promise<ParsedReference> {
  const clean = normaliseDoi(doi)
  if (!clean) throw new Error('Enter a DOI.')
  const res = await fetch(
    `https://api.crossref.org/works/${encodeURIComponent(clean)}`,
    { headers: { Accept: 'application/json' } },
  )
  if (res.status === 404) throw new Error(`No record found for DOI "${clean}".`)
  if (!res.ok) throw new Error(`Crossref lookup failed (HTTP ${res.status}).`)
  const json = (await res.json()) as { message: Record<string, unknown> }
  return mapCrossref(json.message)
}
