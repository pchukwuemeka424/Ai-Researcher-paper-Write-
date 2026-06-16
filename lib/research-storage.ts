import type { ResearchIdea, ResearchSession } from "@/lib/research-ideas";
import {
	deleteResearchSessionFromApi,
	fetchResearchSessionsFromApi,
	persistResearchSessionToApi,
} from "@/lib/research-sessions-api";
import {
	deleteAllIdeasFromApi,
	deleteIdeaFromApi,
	fetchSavedIdeasFromApi,
	persistIdeaToApi,
	updateIdeaStatusOnApi,
} from "@/lib/research-ideas-api";
import { getStoredToken, getStoredUserId } from "@/lib/auth";

const SAVED_KEY_PREFIX = "aula.research.saved";
const RECENT_KEY_PREFIX = "aula.research.recent";
const LEGACY_SAVED_KEY = "aula.research.saved";
const LEGACY_RECENT_KEY = "aula.research.recent";
const GUEST_SCOPE = "__guest__";
const MAX_RECENT = 8;

function storageScope(): string {
	return getStoredUserId() ?? GUEST_SCOPE;
}

function savedStorageKey(): string {
	return `${SAVED_KEY_PREFIX}.${storageScope()}`;
}

function recentStorageKey(): string {
	return `${RECENT_KEY_PREFIX}.${storageScope()}`;
}

function removeLegacyResearchKeys(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(LEGACY_SAVED_KEY);
	localStorage.removeItem(LEGACY_RECENT_KEY);
}

export type ResearchBoardStatus = "saved" | "in_progress" | "completed";

export type SavedIdea = ResearchIdea & {
	savedAt: string;
	discipline: string;
	topic: string;
	dbId?: string;
	status?: ResearchBoardStatus;
};

function writeLocalIdeas(ideas: SavedIdea[]): SavedIdea[] {
	if (getStoredUserId()) removeLegacyResearchKeys();
	localStorage.setItem(savedStorageKey(), JSON.stringify(ideas));
	return ideas;
}

export function loadSavedIdeas(): SavedIdea[] {
	if (typeof window === "undefined") return [];
	if (getStoredUserId()) removeLegacyResearchKeys();
	try {
		const raw = localStorage.getItem(savedStorageKey());
		return raw ? (JSON.parse(raw) as SavedIdea[]) : [];
	} catch {
		return [];
	}
}

export async function loadAllSavedIdeas(): Promise<SavedIdea[]> {
	const fromApi = await fetchSavedIdeasFromApi();
	if (fromApi !== null) {
		writeLocalIdeas(fromApi);
		return fromApi;
	}

	if (getStoredToken()) {
		writeLocalIdeas([]);
		return [];
	}

	return loadSavedIdeas();
}

export function saveIdeaLocal(idea: ResearchIdea, discipline: string, topic: string): SavedIdea[] {
	const entry: SavedIdea = {
		...idea,
		savedAt: new Date().toISOString(),
		discipline,
		topic,
		status: "saved",
	};
	const existing = loadSavedIdeas().filter((s) => s.id !== idea.id || s.title !== idea.title);
	const next = [entry, ...existing].slice(0, 50);
	return writeLocalIdeas(next);
}

export async function saveIdea(
	idea: ResearchIdea,
	discipline: string,
	topic: string,
): Promise<SavedIdea[]> {
	const entry: SavedIdea = {
		...idea,
		savedAt: new Date().toISOString(),
		discipline,
		topic,
		status: "saved",
	};

	const fromApi = await persistIdeaToApi(entry);
	if (fromApi) {
		const existing = loadSavedIdeas().filter(
			(s) => !(s.id === fromApi.id && s.title === fromApi.title),
		);
		return writeLocalIdeas([fromApi, ...existing].slice(0, 50));
	}

	return saveIdeaLocal(idea, discipline, topic);
}

export function removeSavedIdeaLocal(id: string, title: string): SavedIdea[] {
	const next = loadSavedIdeas().filter((s) => !(s.id === id && s.title === title));
	return writeLocalIdeas(next);
}

export async function removeSavedIdea(id: string, title: string, dbId?: string): Promise<SavedIdea[]> {
	const current = loadSavedIdeas();
	const match = current.find((s) => s.id === id && s.title === title);
	const remoteId = dbId ?? match?.dbId;
	const optimistic = current.filter((s) => !(s.id === id && s.title === title));
	writeLocalIdeas(optimistic);

	if (remoteId) {
		const remote = await deleteIdeaFromApi(remoteId);
		if (remote.status === 401 || remote.status === 403) {
			writeLocalIdeas(current);
			return current;
		}
	}

	return optimistic;
}

export async function clearSavedIdeas(): Promise<SavedIdea[]> {
	writeLocalIdeas([]);
	const remote = await deleteAllIdeasFromApi();
	if (remote.status === 401 || remote.status === 403) {
		const restored = await loadAllSavedIdeas();
		return restored;
	}
	return [];
}

export async function updateSavedIdeaStatus(
	dbId: string,
	status: ResearchBoardStatus,
): Promise<SavedIdea[]> {
	const fromApi = await updateIdeaStatusOnApi(dbId, status);
	if (!fromApi) return loadSavedIdeas();

	const current = loadSavedIdeas();
	const next = current.map((idea) =>
		idea.dbId === dbId || (idea.id === fromApi.id && idea.title === fromApi.title) ? fromApi : idea,
	);
	return writeLocalIdeas(next);
}

export function isIdeaSaved(id: string, title: string, ideas: SavedIdea[] = loadSavedIdeas()): boolean {
	return ideas.some((s) => s.id === id && s.title === title);
}

export function loadRecentSessions(): ResearchSession[] {
	if (typeof window === "undefined") return [];
	if (getStoredUserId()) removeLegacyResearchKeys();
	try {
		const raw = localStorage.getItem(recentStorageKey());
		return raw ? (JSON.parse(raw) as ResearchSession[]) : [];
	} catch {
		return [];
	}
}

function writeRecentSessions(sessions: ResearchSession[]): ResearchSession[] {
	if (getStoredUserId()) removeLegacyResearchKeys();
	localStorage.setItem(recentStorageKey(), JSON.stringify(sessions.slice(0, MAX_RECENT)));
	return sessions.slice(0, MAX_RECENT);
}

export async function loadAllRecentSessions(): Promise<ResearchSession[]> {
	const fromApi = await fetchResearchSessionsFromApi();
	if (fromApi !== null) {
		writeRecentSessions(fromApi);
		return fromApi;
	}

	if (getStoredToken()) {
		writeRecentSessions([]);
		return [];
	}

	return loadRecentSessions();
}

export function pushRecentSession(session: Omit<ResearchSession, "id" | "createdAt">): ResearchSession[] {
	const entry: ResearchSession = {
		...session,
		id: crypto.randomUUID(),
		createdAt: new Date().toISOString(),
	};
	const existing = loadRecentSessions().filter(
		(s) => !(s.discipline === session.discipline && s.topic === session.topic),
	);
	const next = writeRecentSessions([entry, ...existing]);

	void persistResearchSessionToApi(session).then((fromApi) => {
		if (!fromApi) return;
		const current = loadRecentSessions();
		const merged = current.map((item) =>
			item.discipline === session.discipline && item.topic === session.topic
				? { ...fromApi, createdAt: item.createdAt }
				: item,
		);
		writeRecentSessions(merged);
	});

	return next;
}

export function removeRecentSession(id: string): ResearchSession[] {
	const current = loadRecentSessions();
	const target = current.find((s) => s.id === id || s.dbId === id);
	const next = current.filter((s) => s.id !== id && s.dbId !== id);
	writeRecentSessions(next);
	const remoteId = target?.dbId ?? target?.id;
	if (remoteId && /^[a-f0-9]{24}$/i.test(remoteId)) {
		void deleteResearchSessionFromApi(remoteId);
	}
	return next;
}
