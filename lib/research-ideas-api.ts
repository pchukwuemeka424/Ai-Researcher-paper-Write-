import { apiUrl } from "@/lib/api";
import { authHeaders } from "@/lib/auth";
import type { SavedIdea, ResearchBoardStatus } from "@/lib/research-storage";

export type SavedResearchIdeaDto = {
	id: string;
	userId?: string;
	ideaId: string;
	title: string;
	rationale: string;
	approach: string;
	outline?: string;
	researchQuestions?: string[];
	type: SavedIdea["type"];
	feasibility: SavedIdea["feasibility"];
	discipline: string;
	topic: string;
	status?: ResearchBoardStatus;
	savedAt: string;
};

function mapIdea(dto: SavedResearchIdeaDto): SavedIdea {
	return {
		id: dto.ideaId,
		title: dto.title,
		rationale: dto.rationale,
		approach: dto.approach,
		...(dto.outline?.trim() ? { outline: dto.outline } : {}),
		...(dto.researchQuestions?.length ? { researchQuestions: dto.researchQuestions } : {}),
		type: dto.type,
		feasibility: dto.feasibility,
		savedAt: dto.savedAt,
		discipline: dto.discipline,
		topic: dto.topic,
		dbId: dto.id,
		status: dto.status ?? "saved",
	};
}

async function parseDeleteResponse(res: Response): Promise<ApiDeleteResult> {
	if (res.ok || res.status === 404) return { ok: true };
	return { ok: false, status: res.status };
}

type ApiDeleteResult = { ok: true } | { ok: false; status: number };

const MONGO_OBJECT_ID = /^[a-f0-9]{24}$/i;

export function isSavedIdeaDbId(id: string): boolean {
	return MONGO_OBJECT_ID.test(id);
}

export async function fetchSavedIdeasFromApi(): Promise<SavedIdea[] | null> {
	try {
		const res = await fetch(apiUrl("/api/research/ideas/saved"), { headers: authHeaders() });
		if (res.status === 401) return [];
		if (!res.ok) return null;
		const data = (await res.json()) as { ideas?: SavedResearchIdeaDto[] };
		return (data.ideas ?? []).map(mapIdea);
	} catch {
		return null;
	}
}

export async function persistIdeaToApi(
	idea: SavedIdea,
): Promise<SavedIdea | null> {
	try {
		const res = await fetch(apiUrl("/api/research/ideas/saved"), {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeaders() },
			body: JSON.stringify({
				ideaId: idea.id,
				title: idea.title,
				rationale: idea.rationale,
				approach: idea.approach,
				outline: idea.outline,
				researchQuestions: idea.researchQuestions,
				type: idea.type,
				feasibility: idea.feasibility,
				discipline: idea.discipline,
				topic: idea.topic,
				status: idea.status ?? "saved",
			}),
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { idea?: SavedResearchIdeaDto };
		return data.idea ? mapIdea(data.idea) : null;
	} catch {
		return null;
	}
}

export async function updateIdeaStatusOnApi(
	dbId: string,
	status: "saved" | "in_progress" | "completed",
): Promise<SavedIdea | null> {
	if (!isSavedIdeaDbId(dbId)) return null;

	try {
		const res = await fetch(apiUrl(`/api/research/ideas/saved/${encodeURIComponent(dbId)}`), {
			method: "PATCH",
			headers: { "Content-Type": "application/json", ...authHeaders() },
			body: JSON.stringify({ status }),
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { idea?: SavedResearchIdeaDto };
		return data.idea ? mapIdea(data.idea) : null;
	} catch {
		return null;
	}
}

export async function deleteIdeaFromApi(dbId: string): Promise<ApiDeleteResult> {
	if (!isSavedIdeaDbId(dbId)) return { ok: true };

	try {
		const res = await fetch(apiUrl(`/api/research/ideas/saved/${encodeURIComponent(dbId)}`), {
			method: "DELETE",
			headers: authHeaders(),
		});
		return parseDeleteResponse(res);
	} catch {
		return { ok: false, status: 0 };
	}
}

export async function deleteAllIdeasFromApi(): Promise<ApiDeleteResult> {
	try {
		const res = await fetch(apiUrl("/api/research/ideas/saved"), {
			method: "DELETE",
			headers: authHeaders(),
		});
		return parseDeleteResponse(res);
	} catch {
		return { ok: false, status: 0 };
	}
}
