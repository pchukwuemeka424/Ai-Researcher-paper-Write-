import { apiUrl } from "@/lib/api";
import { authHeaders } from "@/lib/auth";
import type { SavedOutline } from "@/lib/research-outline-storage";
import type { ResearchScope } from "@/lib/research-ideas";

export type SavedOutlineDto = {
	id: string;
	ideaId: string;
	ideaTitle: string;
	discipline: string;
	topic: string;
	scope: ResearchScope;
	outline: string;
	createdAt: string;
	updatedAt: string;
};

function mapOutline(dto: SavedOutlineDto): SavedOutline {
	const key = [dto.ideaId, dto.ideaTitle, dto.discipline, dto.topic.trim(), dto.scope].join("::");
	return {
		key,
		dbId: dto.id,
		ideaId: dto.ideaId,
		ideaTitle: dto.ideaTitle,
		discipline: dto.discipline,
		topic: dto.topic,
		scope: dto.scope,
		outline: dto.outline,
		savedAt: dto.updatedAt,
	};
}

export async function fetchSavedOutlinesFromApi(): Promise<SavedOutline[] | null> {
	try {
		const res = await fetch(apiUrl("/api/research/outlines/saved"), { headers: authHeaders() });
		if (res.status === 401) return [];
		if (!res.ok) return null;
		const data = (await res.json()) as { outlines?: SavedOutlineDto[] };
		return (data.outlines ?? []).map(mapOutline);
	} catch {
		return null;
	}
}

export async function deleteSavedOutlineFromApi(id: string): Promise<boolean> {
	try {
		const res = await fetch(apiUrl(`/api/research/outlines/saved/${encodeURIComponent(id)}`), {
			method: "DELETE",
			headers: authHeaders(),
		});
		return res.ok || res.status === 404;
	} catch {
		return false;
	}
}
