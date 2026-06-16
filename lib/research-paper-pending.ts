import type { CitationStyle } from "@/lib/citation-styles";

const SESSION_KEY = "aula.research.paper.pending";

export type PendingResearchPaper = {
	key: string;
	citationStyle: CitationStyle;
	projectName?: string;
};

export function stagePendingResearchPaper(input: PendingResearchPaper): void {
	if (typeof window === "undefined") return;
	try {
		sessionStorage.setItem(SESSION_KEY, JSON.stringify(input));
	} catch {
		/* storage unavailable */
	}
}

export function peekPendingResearchPaper(): PendingResearchPaper | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = sessionStorage.getItem(SESSION_KEY);
		return raw ? (JSON.parse(raw) as PendingResearchPaper) : null;
	} catch {
		return null;
	}
}

export function consumePendingResearchPaper(): PendingResearchPaper | null {
	const pending = peekPendingResearchPaper();
	if (pending && typeof window !== "undefined") {
		try {
			sessionStorage.removeItem(SESSION_KEY);
		} catch {
			/* storage unavailable */
		}
	}
	return pending;
}
