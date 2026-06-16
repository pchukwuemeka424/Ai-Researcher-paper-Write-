import { apiUrl } from "@/lib/api";
import { authHeaders } from "@/lib/auth";
import type { SavedResearchPaper } from "@/lib/chat-research-storage";
import type { TokenUsage } from "@/lib/token-usage";
import type { OutlinePaper } from "@/lib/research-outline-sources";
import type { StudentTokenQuota } from "@/lib/student-tokens";
import type { ResearchIdea, ResearchScope } from "@/lib/research-ideas";

export type SavedResearchDto = SavedResearchPaper & {
	userId?: string | null;
	sessionId?: string | null;
	workflow?: string;
	tokenUsage?: TokenUsage;
};

export type OutputListEntry = {
	id?: string;
	path: string;
	name: string;
	kind: "file" | "directory";
	size?: number;
	modified?: string;
	hasContent?: boolean;
};

function mapPaper(dto: SavedResearchDto): SavedResearchPaper {
	return {
		id: dto.id,
		topic: dto.topic,
		title: dto.title,
		content: dto.content,
		...(dto.tokenUsage ? { tokenUsage: dto.tokenUsage } : {}),
		createdAt: dto.createdAt,
		updatedAt: dto.updatedAt,
		...(dto.userId !== undefined ? { userId: dto.userId } : {}),
	};
}

type ApiDeleteResult = { ok: true } | { ok: false; status: number };

const MONGO_OBJECT_ID = /^[a-f0-9]{24}$/i;

export function isSavedResearchDbId(id: string): boolean {
	return MONGO_OBJECT_ID.test(id);
}

async function parseDeleteResponse(res: Response): Promise<ApiDeleteResult> {
	if (res.ok || res.status === 404) return { ok: true };
	return { ok: false, status: res.status };
}

export async function fetchSavedResearchFromApi(): Promise<SavedResearchPaper[] | null> {
	try {
		const res = await fetch(apiUrl("/api/research/saved"), { headers: authHeaders() });
		if (res.status === 401) return [];
		if (!res.ok) return null;
		const data = (await res.json()) as { papers?: SavedResearchDto[] };
		return (data.papers ?? []).map(mapPaper);
	} catch {
		return null;
	}
}

export async function fetchSavedResearchById(id: string): Promise<SavedResearchPaper | null> {
	if (!isSavedResearchDbId(id)) return null;
	try {
		const res = await fetch(apiUrl(`/api/research/saved/${encodeURIComponent(id)}`), {
			headers: authHeaders(),
		});
		if (res.status === 404) return null;
		if (!res.ok) return null;
		const data = (await res.json()) as { paper?: SavedResearchDto };
		return data.paper ? mapPaper(data.paper) : null;
	} catch {
		return null;
	}
}

export async function updateSavedResearchOnApi(
	id: string,
	input: { topic: string; content: string },
): Promise<SavedResearchPaper | null> {
	if (!isSavedResearchDbId(id)) return null;
	try {
		const res = await fetch(apiUrl(`/api/research/saved/${encodeURIComponent(id)}`), {
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...authHeaders() },
			body: JSON.stringify(input),
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { paper?: SavedResearchDto };
		return data.paper ? mapPaper(data.paper) : null;
	} catch {
		return null;
	}
}

export async function persistResearchToApi(input: {
	topic: string;
	content: string;
	sessionId?: string | null;
	workflow?: string;
	tokenUsage?: TokenUsage;
}): Promise<SavedResearchPaper | null> {
	try {
		const res = await fetch(apiUrl("/api/research/saved"), {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeaders() },
			body: JSON.stringify(input),
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { paper?: SavedResearchDto };
		return data.paper ? mapPaper(data.paper) : null;
	} catch {
		return null;
	}
}

export async function deleteResearchFromApi(id: string): Promise<ApiDeleteResult> {
	if (!isSavedResearchDbId(id)) return { ok: true };

	try {
		const res = await fetch(apiUrl(`/api/research/saved/${encodeURIComponent(id)}`), {
			method: "DELETE",
			headers: authHeaders(),
		});
		return parseDeleteResponse(res);
	} catch {
		return { ok: false, status: 0 };
	}
}

export async function deleteAllResearchFromApi(): Promise<ApiDeleteResult> {
	try {
		const res = await fetch(apiUrl("/api/research/saved"), {
			method: "DELETE",
			headers: authHeaders(),
		});
		return parseDeleteResponse(res);
	} catch {
		return { ok: false, status: 0 };
	}
}

export async function fetchOutputsFromApi(): Promise<OutputListEntry[] | null> {
	try {
		const res = await fetch(apiUrl("/api/outputs"));
		if (!res.ok) return null;
		const data = (await res.json()) as { outputs?: OutputListEntry[] };
		return data.outputs ?? [];
	} catch {
		return null;
	}
}

type PaperSearchDto = {
	title?: string;
	abstract?: string;
	arxivId?: string | null;
	authors?: string[];
	publicationDate?: string | null;
	url?: string;
};

export async function fetchPapersForOutline(query: string, limit = 6): Promise<OutlinePaper[] | null> {
	const trimmed = query.trim();
	if (!trimmed) return null;

	try {
		const params = new URLSearchParams({ q: trimmed, limit: String(limit) });
		const res = await fetch(apiUrl(`/api/papers/search?${params.toString()}`));
		if (!res.ok) return null;

		const data = (await res.json()) as { papers?: PaperSearchDto[] };
		const papers = (data.papers ?? [])
			.map((paper) => ({
				title: paper.title?.trim() ?? "",
				abstract: paper.abstract?.trim() ?? "",
				arxivId: paper.arxivId ?? null,
				authors: Array.isArray(paper.authors) ? paper.authors.filter(Boolean) : [],
				publicationDate: paper.publicationDate ?? null,
				url: paper.url?.trim() ?? "",
			}))
			.filter((paper) => paper.title.length > 0);

		return papers.length > 0 ? papers : null;
	} catch {
		return null;
	}
}

export async function fetchResearchOutlineFromApi(input: {
	idea: ResearchIdea;
	disciplineLabel: string;
	topic: string;
	scope: ResearchScope;
}): Promise<{ outline: string; tokenQuota?: StudentTokenQuota }> {
	const res = await fetch(apiUrl("/api/research/outline"), {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify({
			idea: {
				id: input.idea.id,
				title: input.idea.title,
				rationale: input.idea.rationale,
				approach: input.idea.approach,
				type: input.idea.type,
				feasibility: input.idea.feasibility,
			},
			discipline: input.disciplineLabel,
			disciplineLabel: input.disciplineLabel,
			topic: input.topic,
			scope: input.scope,
		}),
	});

	const data = (await res.json().catch(() => ({}))) as {
		outline?: string;
		error?: string;
		tokenQuota?: StudentTokenQuota;
	};

	if (!res.ok) {
		throw new Error(data.error ?? `Outline request failed (${res.status})`);
	}

	const outline = data.outline?.trim();
	if (!outline) {
		throw new Error("Outline request returned empty content.");
	}

	return { outline, ...(data.tokenQuota ? { tokenQuota: data.tokenQuota } : {}) };
}

export type ResearchTopicAnalysisDto = {
	scope: {
		discipline: string;
		researchArea: string;
		variables: string[];
		constructs: string[];
		phenomena: string[];
	};
	contextAndGap: {
		population: string;
		context: string;
		domain: string;
		researchGap: string;
	};
};

export async function fetchResearchIdeasFromApi(
	input: {
		disciplineLabel: string;
		topic: string;
		scope: ResearchScope;
	},
	options?: { signal?: AbortSignal },
): Promise<{ ideasMarkdown: string; analysis?: ResearchTopicAnalysisDto; tokenQuota?: StudentTokenQuota }> {
	const res = await fetch(apiUrl("/api/research/ideas/generate"), {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify({
			disciplineLabel: input.disciplineLabel,
			topic: input.topic,
			scope: input.scope,
		}),
		signal: options?.signal,
	});

	const data = (await res.json().catch(() => ({}))) as {
		ideasMarkdown?: string;
		analysis?: ResearchTopicAnalysisDto;
		error?: string;
		tokenQuota?: StudentTokenQuota;
	};

	if (!res.ok) {
		throw new Error(data.error ?? `Ideas request failed (${res.status})`);
	}

	const ideasMarkdown = data.ideasMarkdown?.trim();
	if (!ideasMarkdown) {
		throw new Error("Ideas request returned empty content.");
	}

	return {
		ideasMarkdown,
		...(data.analysis ? { analysis: data.analysis } : {}),
		...(data.tokenQuota ? { tokenQuota: data.tokenQuota } : {}),
	};
}
