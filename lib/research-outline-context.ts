import type { ResearchIdea, ResearchScope } from "@/lib/research-ideas";
import { loadSavedIdeas } from "@/lib/research-storage";
import { getSavedOutlineByKey, outlineStorageKey } from "@/lib/research-outline-storage";

const SESSION_KEY_PREFIX = "aula.research.outline.context";

export type OutlinePageContext = {
	key: string;
	idea: ResearchIdea;
	discipline: string;
	topic: string;
	scope: ResearchScope;
	returnTo?: string;
};

export function stageOutlinePageContext(input: {
	idea: ResearchIdea;
	discipline: string;
	topic: string;
	scope: ResearchScope;
	returnTo?: string;
}): string {
	const key = outlineStorageKey(input.idea, input.discipline, input.topic, input.scope);
	if (typeof window !== "undefined") {
		const ctx: OutlinePageContext = { ...input, key };
		sessionStorage.setItem(`${SESSION_KEY_PREFIX}.${key}`, JSON.stringify(ctx));
	}
	return key;
}

export function peekOutlinePageContext(key: string): OutlinePageContext | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = sessionStorage.getItem(`${SESSION_KEY_PREFIX}.${key}`);
		return raw ? (JSON.parse(raw) as OutlinePageContext) : null;
	} catch {
		return null;
	}
}

export function resolveOutlinePageContext(key: string): OutlinePageContext | null {
	const fromSession = peekOutlinePageContext(key);
	if (fromSession) return fromSession;

	const outlineEntry = getSavedOutlineByKey(key);
	if (!outlineEntry) return null;

	const savedIdea = loadSavedIdeas().find(
		(item) => item.id === outlineEntry.ideaId && item.title === outlineEntry.ideaTitle,
	);
	if (!savedIdea) return null;

	return {
		key,
		idea: savedIdea,
		discipline: outlineEntry.discipline,
		topic: outlineEntry.topic,
		scope: outlineEntry.scope,
	};
}
