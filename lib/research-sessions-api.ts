import { apiUrl } from "@/lib/api";
import { authHeaders } from "@/lib/auth";
import type { ResearchIdea, ResearchScope, ResearchSession } from "@/lib/research-ideas";

export type ResearchSessionDto = {
	id: string;
	userId?: string;
	discipline: string;
	topic: string;
	scope: ResearchScope;
	ideas: ResearchIdea[];
	createdAt: string;
	updatedAt: string;
};

function mapSession(dto: ResearchSessionDto): ResearchSession {
	return {
		id: dto.id,
		dbId: dto.id,
		discipline: dto.discipline,
		topic: dto.topic,
		scope: dto.scope,
		ideas: dto.ideas,
		createdAt: dto.createdAt,
	};
}

export async function fetchResearchSessionsFromApi(): Promise<ResearchSession[] | null> {
	try {
		const res = await fetch(apiUrl("/api/research/sessions"), { headers: authHeaders() });
		if (res.status === 401) return [];
		if (!res.ok) return null;
		const data = (await res.json()) as { sessions?: ResearchSessionDto[] };
		return (data.sessions ?? []).map(mapSession);
	} catch {
		return null;
	}
}

export async function persistResearchSessionToApi(
	session: Omit<ResearchSession, "id" | "createdAt"> & { ideas: ResearchIdea[] },
): Promise<ResearchSession | null> {
	try {
		const res = await fetch(apiUrl("/api/research/sessions"), {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeaders() },
			body: JSON.stringify({
				discipline: session.discipline,
				topic: session.topic,
				scope: session.scope,
				ideas: session.ideas,
			}),
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { session?: ResearchSessionDto };
		return data.session ? mapSession(data.session) : null;
	} catch {
		return null;
	}
}

export async function deleteResearchSessionFromApi(id: string): Promise<boolean> {
	try {
		const res = await fetch(apiUrl(`/api/research/sessions/${encodeURIComponent(id)}`), {
			method: "DELETE",
			headers: authHeaders(),
		});
		return res.ok || res.status === 404;
	} catch {
		return false;
	}
}
