/**
 * Research Note citation helpers — backed by the same catalog and formatters
 * as Reference Formatter (`lib/citation-styles`, `lib/citation-format`).
 */
import {
	formatCitation as formatCitationLib,
	parseAuthors,
	type ReferenceInput,
} from '@/lib/citation-format'
import {
	CITATION_STYLE_GROUPS,
	CITATION_STYLES,
	DEFAULT_CITATION_STYLE,
	getStyleFamily,
	getStyleLabel,
	type CitationStyle,
	type StyleFamily,
} from '@/lib/citation-styles'
import type { Reference } from '@/components/research-note/storage/types'

export {
	CITATION_STYLES,
	CITATION_STYLE_GROUPS,
	DEFAULT_CITATION_STYLE,
	getStyleLabel,
	getStyleFamily,
}
export type { CitationStyle, StyleFamily }

/** Legacy short labels from the first Research Note style picker. */
const LEGACY_STYLE_MAP: Record<string, CitationStyle> = {
	APA: 'apa-7',
	MLA: 'mla-9',
	IEEE: 'ieee',
	Vancouver: 'vancouver',
	Harvard: 'harvard',
	Chicago: 'chicago-author-date',
	'APA 7': 'apa-7',
	'APA 7th': 'apa-7',
	'MLA 9': 'mla-9',
}

export function isCitationStyle(value: unknown): value is CitationStyle {
	if (typeof value !== 'string' || !value.trim()) return false
	if (LEGACY_STYLE_MAP[value]) return true
	return CITATION_STYLES.some((s) => s.id === value)
}

/** Normalize stored / legacy values to a canonical CitationStyle id. */
export function normalizeCitationStyle(value: unknown): CitationStyle {
	if (typeof value !== 'string' || !value.trim()) return DEFAULT_CITATION_STYLE
	const legacy = LEGACY_STYLE_MAP[value]
	if (legacy) return legacy
	if (CITATION_STYLES.some((s) => s.id === value)) return value as CitationStyle
	const byLabel = CITATION_STYLES.find(
		(s) => s.label.toLowerCase() === value.toLowerCase(),
	)
	return byLabel?.id ?? DEFAULT_CITATION_STYLE
}

export function isNumericCitationStyle(style: CitationStyle): boolean {
	const family = getStyleFamily(style)
	if (
		family === 'ieee' ||
		family === 'vancouver' ||
		family === 'ama' ||
		family === 'acs' ||
		family === 'nature'
	) {
		return true
	}
	return style === 'cse-citation-sequence'
}

/** Minimal metadata needed to format cites (CiteSource or Reference). */
export interface CiteMeta {
	title: string
	authors: string[]
	year: string
	url?: string
	containerTitle?: string | null
	volume?: string | null
	issue?: string | null
	pages?: string | null
	doi?: string | null
	publisher?: string | null
	type?: Reference['type']
}

export function familyName(author: string): string {
	const trimmed = author.trim()
	if (!trimmed) return 'Anon'
	const parsed = parseAuthors(trimmed)
	return parsed[0]?.last?.trim() || 'Anon'
}

function authorsToRaw(authors: string[]): string {
	return authors.map((a) => a.trim()).filter(Boolean).join('; ')
}

function sourceTypeFromRefType(
	type?: Reference['type'],
): ReferenceInput['sourceType'] {
	if (type === 'book') return 'book'
	if (type === 'webpage') return 'website'
	return 'journal'
}

export function citeMetaToReferenceInput(meta: CiteMeta): ReferenceInput {
	const doi = meta.doi?.trim() || undefined
	const url = meta.url?.trim() || undefined
	return {
		sourceType: sourceTypeFromRefType(meta.type),
		authors: authorsToRaw(meta.authors),
		title: meta.title.trim(),
		year: meta.year || 'n.d.',
		journal: meta.containerTitle ?? undefined,
		volume: meta.volume ?? undefined,
		issue: meta.issue ?? undefined,
		pages: meta.pages ?? undefined,
		publisher: meta.publisher ?? undefined,
		doi,
		url: !doi && url ? url : url,
	}
}

function authorDateLabel(authors: string[], year: string, amp = true): string {
	const y = year || 'n.d.'
	if (authors.length === 0) return `Anon, ${y}`
	if (authors.length === 1) return `${familyName(authors[0]!)}, ${y}`
	if (authors.length === 2) {
		const join = amp ? ' & ' : ' and '
		return `${familyName(authors[0]!)}${join}${familyName(authors[1]!)}, ${y}`
	}
	return `${familyName(authors[0]!)} et al., ${y}`
}

function authorDateNarrative(authors: string[], year: string): string {
	const y = year || 'n.d.'
	if (authors.length === 0) return `Anon (${y})`
	if (authors.length === 1) return `${familyName(authors[0]!)} (${y})`
	if (authors.length === 2) {
		return `${familyName(authors[0]!)} and ${familyName(authors[1]!)} (${y})`
	}
	return `${familyName(authors[0]!)} et al. (${y})`
}

/** In-text citation forms for a given style. `number` required for numeric styles. */
export function formatInTextCite(
	meta: Pick<CiteMeta, 'authors' | 'year'>,
	style: CitationStyle,
	number?: number,
): { parenthetical: string; narrative: string } {
	const authors = meta.authors ?? []
	const year = meta.year || 'n.d.'
	const family = getStyleFamily(style)
	const n = number ?? 1
	const fam = authors[0] ? familyName(authors[0]) : 'Anon'

	if (isNumericCitationStyle(style)) {
		if (family === 'ieee' || family === 'acs' || family === 'nature') {
			return { parenthetical: `[${n}]`, narrative: `${fam} [${n}]` }
		}
		// Vancouver / AMA / CSE sequence — parenthetical numbers
		return { parenthetical: `(${n})`, narrative: `${fam} (${n})` }
	}

	if (family === 'chicago') {
		if (authors.length === 0) {
			return { parenthetical: `(Anon ${year})`, narrative: `Anon (${year})` }
		}
		if (authors.length === 1) {
			return { parenthetical: `(${fam} ${year})`, narrative: `${fam} (${year})` }
		}
		if (authors.length === 2) {
			const b = familyName(authors[1]!)
			return {
				parenthetical: `(${fam} and ${b} ${year})`,
				narrative: `${fam} and ${b} (${year})`,
			}
		}
		return {
			parenthetical: `(${fam} et al. ${year})`,
			narrative: `${fam} et al. (${year})`,
		}
	}

	if (family === 'mla') {
		return { parenthetical: `(${fam})`, narrative: fam }
	}

	if (family === 'harvard' || family === 'elsevier' || family === 'asa') {
		return {
			parenthetical: `(${authorDateLabel(authors, year, false)})`,
			narrative: authorDateNarrative(authors, year),
		}
	}

	// APA and remaining author–date families
	return {
		parenthetical: `(${authorDateLabel(authors, year, true)})`,
		narrative: authorDateNarrative(authors, year),
	}
}

/** Bibliography entry via Reference Formatter engine. */
export function formatBibliographyEntry(
	meta: CiteMeta,
	style: CitationStyle,
	options?: { number?: number; markdownLink?: boolean },
): string {
	const input = citeMetaToReferenceInput(meta)
	let line = formatCitationLib(style, input).trim()
	if (!line) {
		const title = meta.title.trim()
		const year = meta.year || 'n.d.'
		line = `${authorDateNarrative(meta.authors, year)}. ${title}.`
	}

	const num = options?.number
	if (num != null && isNumericCitationStyle(style)) {
		const fam = getStyleFamily(style)
		if (fam === 'ieee' || fam === 'acs' || fam === 'nature') {
			if (!/^\s*\[\d+\]/.test(line)) line = `[${num}] ${line}`
		} else if (getStyleFamily(style) === 'vancouver' || style === 'cse-citation-sequence') {
			if (!/^\s*\d+\./.test(line)) line = `${num}. ${line}`
		}
	}

	const doiOrUrl =
		meta.doi?.trim()
			? `https://doi.org/${meta.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')}`
			: meta.url?.trim() || ''
	if (
		options?.markdownLink !== false &&
		doiOrUrl &&
		!line.includes('](') &&
		meta.title.trim()
	) {
		const title = meta.title.replace(/\*/g, '').trim()
		const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		line = line.replace(
			new RegExp(`("${escaped}"|'${escaped}'|\\*?${escaped}\\*?)`),
			`[*${title}*](${doiOrUrl})`,
		)
	}

	return line
}

export function formatCitation(ref: Reference, style: CitationStyle): string {
	return formatBibliographyEntry(
		{
			title: ref.title,
			authors: ref.authors,
			year: ref.year ?? 'n.d.',
			url: ref.url ?? undefined,
			containerTitle: ref.containerTitle,
			volume: ref.volume,
			issue: ref.issue,
			pages: ref.pages,
			doi: ref.doi,
			publisher: ref.publisher,
			type: ref.type,
		},
		normalizeCitationStyle(style),
	)
}
