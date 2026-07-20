import {
	CITATION_STYLES,
	DEFAULT_CITATION_STYLE,
	isCitationStyle,
	normalizeCitationStyle,
	type CitationStyle,
} from '@/components/research-note/features/references/citation'
import type { CiteSource } from '@/components/research-note/ai/agents/citationBank'
import { getSetting, setSetting } from '@/components/research-note/storage/repositories'

export {
	CITATION_STYLES,
	DEFAULT_CITATION_STYLE,
	isCitationStyle,
	normalizeCitationStyle,
	type CitationStyle,
}

const styleKey = (projectId: string) => `citationStyle:${projectId}`
const bankKey = (projectId: string) => `publicationCiteBank:${projectId}`

export async function getProjectCitationStyle(
	projectId: string,
): Promise<CitationStyle> {
	const raw = await getSetting<unknown>(styleKey(projectId))
	return normalizeCitationStyle(raw)
}

export async function setProjectCitationStyle(
	projectId: string,
	style: CitationStyle,
): Promise<void> {
	await setSetting(styleKey(projectId), normalizeCitationStyle(style))
}

/** Persist merged citation bank used for Publication → References + style rewrites. */
export async function getPublicationCiteBank(
	projectId: string,
): Promise<CiteSource[]> {
	const raw = await getSetting<CiteSource[]>(bankKey(projectId))
	return Array.isArray(raw) ? raw.filter((s) => s?.title?.trim()) : []
}

export async function mergePublicationCiteBank(
	projectId: string,
	sources: CiteSource[],
): Promise<CiteSource[]> {
	const existing = await getPublicationCiteBank(projectId)
	const byTitle = new Map<string, CiteSource>()
	for (const s of existing) {
		const key = s.title.trim().toLowerCase()
		if (key) byTitle.set(key, s)
	}
	for (const s of sources) {
		const key = s.title.trim().toLowerCase()
		if (!key) continue
		const prev = byTitle.get(key)
		byTitle.set(key, prev ? { ...prev, ...s, id: prev.id || s.id } : s)
	}
	const merged = [...byTitle.values()]
	await setSetting(bankKey(projectId), merged)
	return merged
}
