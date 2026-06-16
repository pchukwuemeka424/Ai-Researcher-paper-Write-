import {
	deleteResearchFromApi,
	deleteAllResearchFromApi,
	fetchSavedResearchById,
	fetchSavedResearchFromApi,
	persistResearchToApi,
	updateSavedResearchOnApi,
} from "@/lib/research-api";
import { getStoredToken } from "@/lib/auth";
import {
	downloadMarkdownAsPdf,
	researchPaperFilename,
	type ResearchPaperMeta,
} from "@/lib/research-paper-pdf";
import { extractPaperTitle, titleQuality } from "@/lib/research-paper-title";
import type { TokenUsage } from "@/lib/token-usage";

export { extractPaperTitle } from "@/lib/research-paper-title";

const SAVED_PAPERS_KEY = "aula.chat.research.saved";
const MAX_SAVED = 30;

export const SAVED_RESEARCH_CHANGED = "feynman:saved-research-changed";

export function notifySavedResearchChanged(): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new Event(SAVED_RESEARCH_CHANGED));
}

export type SavedResearchPaper = {
	id: string;
	topic: string;
	title: string;
	content: string;
	tokenUsage?: TokenUsage;
	createdAt: string;
	updatedAt: string;
	userId?: string | null;
};

export type RemoveSavedPaperResult = {
	papers: SavedResearchPaper[];
	ok: boolean;
	error?: string;
};

function normalizeSavedPaper(paper: SavedResearchPaper): SavedResearchPaper {
	const title = extractPaperTitle(paper.content, paper.topic);
	return { ...paper, title };
}

function dedupeSavedPapers(papers: SavedResearchPaper[]): SavedResearchPaper[] {
	const byTopic = new Map<string, SavedResearchPaper>();

	for (const raw of papers.map(normalizeSavedPaper)) {
		const key = raw.topic.trim().toLowerCase();
		if (!key) continue;

		const existing = byTopic.get(key);
		if (!existing) {
			byTopic.set(key, raw);
			continue;
		}

		const keepNew =
			titleQuality(raw.title) > titleQuality(existing.title) ||
			raw.updatedAt > existing.updatedAt;

		byTopic.set(key, keepNew ? raw : existing);
	}

	return [...byTopic.values()].sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);
}

export function loadSavedPapers(): SavedResearchPaper[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(SAVED_PAPERS_KEY);
		return raw ? (JSON.parse(raw) as SavedResearchPaper[]) : [];
	} catch {
		return [];
	}
}

function writeLocalPapers(papers: SavedResearchPaper[]): SavedResearchPaper[] {
	const next = papers.slice(0, MAX_SAVED);
	localStorage.setItem(SAVED_PAPERS_KEY, JSON.stringify(next));
	return next;
}

export async function loadAllSavedPapers(): Promise<SavedResearchPaper[]> {
	const fromApi = await fetchSavedResearchFromApi();
	if (fromApi !== null) {
		const next = dedupeSavedPapers(fromApi);
		writeLocalPapers(next);
		return next;
	}

	// Signed-in users should not see stale offline cache when the API is unreachable.
	if (getStoredToken()) {
		writeLocalPapers([]);
		return [];
	}

	return dedupeSavedPapers(loadSavedPapers());
}

export function saveResearchPaperLocal(topic: string, content: string): SavedResearchPaper[] {
	const trimmedTopic = topic.trim();
	const trimmedContent = content.trim();
	if (!trimmedTopic || !trimmedContent) return loadSavedPapers();

	const now = new Date().toISOString();
	const title = extractPaperTitle(trimmedContent, trimmedTopic);
	const existing = loadSavedPapers();
	const topicKey = trimmedTopic.toLowerCase();
	const match = existing.find((p) => p.topic.trim().toLowerCase() === topicKey);

	if (match) {
		const updated: SavedResearchPaper = {
			...match,
			title,
			content: trimmedContent,
			updatedAt: now,
		};
		const next = dedupeSavedPapers([updated, ...existing.filter((p) => p.id !== match.id)]);
		return writeLocalPapers(next);
	}

	const entry: SavedResearchPaper = {
		id: crypto.randomUUID(),
		topic: trimmedTopic,
		title,
		content: trimmedContent,
		createdAt: now,
		updatedAt: now,
	};
	return writeLocalPapers(dedupeSavedPapers([entry, ...existing]));
}

export async function saveResearchPaper(
	topic: string,
	content: string,
	options?: { sessionId?: string | null; tokenUsage?: TokenUsage },
): Promise<SavedResearchPaper[]> {
	const trimmedTopic = topic.trim();
	const trimmedContent = content.trim();
	if (!trimmedTopic || !trimmedContent) return loadSavedPapers();

	const fromApi = await persistResearchToApi({
		topic: trimmedTopic,
		content: trimmedContent,
		sessionId: options?.sessionId,
		workflow: "chat-paper",
		tokenUsage: options?.tokenUsage,
	});

	if (fromApi) {
		const next = writeLocalPapers(dedupeSavedPapers([normalizeSavedPaper(fromApi), ...loadSavedPapers()]));
		notifySavedResearchChanged();
		return next;
	}

	const next = saveResearchPaperLocal(trimmedTopic, trimmedContent);
	notifySavedResearchChanged();
	return next;
}

async function syncSavedPapersFromApi(fallback: SavedResearchPaper[]): Promise<SavedResearchPaper[]> {
	const fromApi = await fetchSavedResearchFromApi();
	if (fromApi === null) return fallback;
	const synced = dedupeSavedPapers(fromApi);
	writeLocalPapers(synced);
	return synced;
}

export async function removeSavedPaper(
	id: string,
	currentPapers: SavedResearchPaper[] = [],
): Promise<RemoveSavedPaperResult> {
	const trimmedId = id.trim();
	if (!trimmedId) {
		return { papers: currentPapers, ok: false, error: "Missing research id." };
	}

	const optimistic = currentPapers.filter((p) => p.id !== trimmedId);
	writeLocalPapers(optimistic);

	const remote = await deleteResearchFromApi(trimmedId);

	if (remote.status === 401 || remote.status === 403) {
		writeLocalPapers(currentPapers);
		return {
			papers: currentPapers,
			ok: false,
			error: "Sign in to remove research saved to your account.",
		};
	}

	if (remote.ok) {
		const synced = await syncSavedPapersFromApi(optimistic);
		notifySavedResearchChanged();
		return {
			papers: synced,
			ok: !synced.some((p) => p.id === trimmedId),
		};
	}

	// Offline / local-only entry — keep optimistic removal.
	notifySavedResearchChanged();
	return { papers: optimistic, ok: true };
}

export async function removeAllSavedPapers(
	currentPapers: SavedResearchPaper[] = [],
): Promise<RemoveSavedPaperResult> {
	writeLocalPapers([]);

	const remote = await deleteAllResearchFromApi();
	if (remote.status === 401 || remote.status === 403) {
		writeLocalPapers(currentPapers);
		return {
			papers: currentPapers,
			ok: false,
			error: "Sign in to clear research saved to your account.",
		};
	}

	if (remote.ok) {
		const synced = await syncSavedPapersFromApi([]);
		notifySavedResearchChanged();
		return {
			papers: synced,
			ok: synced.length === 0,
			error: synced.length > 0 ? "Some items could not be removed." : undefined,
		};
	}

	notifySavedResearchChanged();
	return { papers: [], ok: true };
}

function mergePaperIntoLocalCache(paper: SavedResearchPaper): SavedResearchPaper[] {
	const next = dedupeSavedPapers([normalizeSavedPaper(paper), ...loadSavedPapers().filter((p) => p.id !== paper.id)]);
	return writeLocalPapers(next);
}

export async function getSavedResearchPaperById(id: string): Promise<SavedResearchPaper | null> {
	const trimmedId = id.trim();
	if (!trimmedId) return null;

	const fromApi = await fetchSavedResearchById(trimmedId);
	if (fromApi) {
		mergePaperIntoLocalCache(fromApi);
		return fromApi;
	}

	const local = loadSavedPapers().find((paper) => paper.id === trimmedId);
	if (local) return normalizeSavedPaper(local);

	if (getStoredToken()) {
		const all = await loadAllSavedPapers();
		return all.find((paper) => paper.id === trimmedId) ?? null;
	}

	return null;
}

export async function updateSavedResearchPaper(
	id: string,
	input: { topic: string; content: string },
): Promise<{ paper: SavedResearchPaper | null; error?: string }> {
	const trimmedTopic = input.topic.trim();
	const trimmedContent = input.content.trim();
	if (!trimmedTopic || !trimmedContent) {
		return { paper: null, error: "Topic and content are required." };
	}

	const fromApi = await updateSavedResearchOnApi(id, { topic: trimmedTopic, content: trimmedContent });
	if (fromApi) {
		const papers = mergePaperIntoLocalCache(fromApi);
		notifySavedResearchChanged();
		return { paper: papers.find((p) => p.id === fromApi.id) ?? fromApi };
	}

	const existing = loadSavedPapers().find((paper) => paper.id === id);
	if (!existing) {
		return { paper: null, error: "Saved research not found." };
	}

	const now = new Date().toISOString();
	const updated: SavedResearchPaper = {
		...existing,
		topic: trimmedTopic,
		title: extractPaperTitle(trimmedContent, trimmedTopic),
		content: trimmedContent,
		updatedAt: now,
	};
	const papers = writeLocalPapers(
		dedupeSavedPapers(loadSavedPapers().map((paper) => (paper.id === id ? updated : paper))),
	);
	notifySavedResearchChanged();
	return { paper: papers.find((p) => p.id === id) ?? updated };
}

export async function downloadResearchPaper(
	paper: SavedResearchPaper,
	meta?: ResearchPaperMeta,
): Promise<void> {
	await downloadMarkdownAsPdf(
		paper.content,
		researchPaperFilename(paper.title, "research-paper"),
		meta,
	);
}
