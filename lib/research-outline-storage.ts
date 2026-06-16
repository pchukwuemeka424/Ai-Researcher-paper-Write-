import { getStoredUserId } from "@/lib/auth";
import { deleteSavedOutlineFromApi, fetchSavedOutlinesFromApi } from "@/lib/research-outlines-api";
import type { ResearchIdea, ResearchScope } from "@/lib/research-ideas";

const OUTLINE_KEY_PREFIX = "aula.research.outlines";
const LEGACY_OUTLINE_KEY = "aula.research.outlines";
const GUEST_SCOPE = "__guest__";

export type SavedOutline = {
	key: string;
	dbId?: string;
	ideaId: string;
	ideaTitle: string;
	discipline: string;
	topic: string;
	scope: ResearchScope;
	outline: string;
	savedAt: string;
};

function storageScope(): string {
	return getStoredUserId() ?? GUEST_SCOPE;
}

function outlineStorageKeyName(): string {
	return `${OUTLINE_KEY_PREFIX}.${storageScope()}`;
}

function removeLegacyOutlineKey(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(LEGACY_OUTLINE_KEY);
}

export function outlineStorageKey(
	idea: Pick<ResearchIdea, "id" | "title">,
	discipline: string,
	topic: string,
	scope: ResearchScope,
): string {
	return [idea.id, idea.title, discipline, topic.trim(), scope].join("::");
}

function loadAllOutlinesLocal(): SavedOutline[] {
	if (typeof window === "undefined") return [];
	if (getStoredUserId()) removeLegacyOutlineKey();
	try {
		const raw = localStorage.getItem(outlineStorageKeyName());
		return raw ? (JSON.parse(raw) as SavedOutline[]) : [];
	} catch {
		return [];
	}
}

function writeOutlinesLocal(outlines: SavedOutline[]): SavedOutline[] {
	if (typeof window === "undefined") return outlines;
	if (getStoredUserId()) removeLegacyOutlineKey();
	localStorage.setItem(outlineStorageKeyName(), JSON.stringify(outlines.slice(0, 100)));
	return outlines.slice(0, 100);
}

export async function loadAllSavedOutlines(): Promise<SavedOutline[]> {
	const fromApi = await fetchSavedOutlinesFromApi();
	if (fromApi !== null) {
		writeOutlinesLocal(fromApi);
		return fromApi;
	}
	return loadAllOutlinesLocal();
}

export function getSavedOutlineByKey(key: string): SavedOutline | null {
	return loadAllOutlinesLocal().find((item) => item.key === key) ?? null;
}

export function loadSavedOutline(
	idea: Pick<ResearchIdea, "id" | "title">,
	discipline: string,
	topic: string,
	scope: ResearchScope,
): string | null {
	const entry = getSavedOutlineByKey(outlineStorageKey(idea, discipline, topic, scope));
	return entry?.outline?.trim() ? entry.outline : null;
}

export function saveResearchOutline(input: {
	idea: Pick<ResearchIdea, "id" | "title">;
	discipline: string;
	topic: string;
	scope: ResearchScope;
	outline: string;
}): SavedOutline {
	const key = outlineStorageKey(input.idea, input.discipline, input.topic, input.scope);
	const entry: SavedOutline = {
		key,
		ideaId: input.idea.id,
		ideaTitle: input.idea.title,
		discipline: input.discipline,
		topic: input.topic.trim(),
		scope: input.scope,
		outline: input.outline.trim(),
		savedAt: new Date().toISOString(),
	};
	const next = [entry, ...loadAllOutlinesLocal().filter((item) => item.key !== key)];
	writeOutlinesLocal(next);
	return entry;
}

export function removeSavedOutline(
	idea: Pick<ResearchIdea, "id" | "title">,
	discipline: string,
	topic: string,
	scope: ResearchScope,
): void {
	const key = outlineStorageKey(idea, discipline, topic, scope);
	const current = loadAllOutlinesLocal();
	const match = current.find((item) => item.key === key);
	writeOutlinesLocal(current.filter((item) => item.key !== key));
	if (match?.dbId) {
		void deleteSavedOutlineFromApi(match.dbId);
	}
}

export function hasSavedOutline(
	idea: Pick<ResearchIdea, "id" | "title">,
	discipline: string,
	topic: string,
	scope: ResearchScope,
): boolean {
	return loadSavedOutline(idea, discipline, topic, scope) !== null;
}

export function mergeOutlinesFromApi(outlines: SavedOutline[]): void {
	if (!outlines.length) return;
	const byKey = new Map(loadAllOutlinesLocal().map((item) => [item.key, item]));
	for (const outline of outlines) {
		byKey.set(outline.key, outline);
	}
	writeOutlinesLocal([...byKey.values()].sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
}
