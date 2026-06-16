import { apiUrl } from "@/lib/api";
import { authHeaders } from "@/lib/auth";
import type { CoursePresentation } from "@/lib/lesson-presentation";
import type { CourseOutlineInput } from "@/lib/lesson-planner";
import {
	coursePresentationForStorage,
	type SavedCoursePlan,
} from "@/lib/lesson-planner-storage";
import { getDisciplineLabel } from "@/lib/research-disciplines";

export async function fetchCourseOutlineFromApi(input: CourseOutlineInput): Promise<string> {
	const res = await fetch(apiUrl("/api/lesson-planner/generate"), {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify({
			title: input.title,
			department: input.department,
			departmentLabel: getDisciplineLabel(input.department),
			level: input.level,
		}),
	});

	const data = (await res.json().catch(() => ({}))) as { outline?: string; plan?: string; error?: string };

	if (!res.ok) {
		throw new Error(data.error ?? `Course outline request failed (${res.status})`);
	}

	const outline = (data.outline ?? data.plan)?.trim();
	if (!outline) {
		throw new Error("Course outline request returned empty content.");
	}

	return outline;
}

type SavedCoursePlanDto = {
	id: string;
	userId?: string | null;
	title: string;
	department: string;
	level: string;
	outline: string;
	presentation?: {
		title: string;
		slides: Array<{
			title: string;
			explanation: string;
			bullets: string[];
			imageUrl?: string | null;
		}>;
	} | null;
	createdAt: string;
	updatedAt: string;
};

function mapSavedPlan(dto: SavedCoursePlanDto): SavedCoursePlan {
	return {
		id: dto.id,
		title: dto.title,
		department: dto.department,
		level: dto.level as SavedCoursePlan["level"],
		outline: dto.outline,
		presentation: dto.presentation
			? {
					title: dto.presentation.title,
					slides: dto.presentation.slides.map((slide) => ({
						title: slide.title,
						explanation: slide.explanation,
						bullets: slide.bullets ?? [],
						imageUrl: slide.imageUrl ?? null,
					})),
				}
			: null,
		createdAt: dto.createdAt,
		updatedAt: dto.updatedAt,
		...(dto.userId !== undefined ? { userId: dto.userId } : {}),
	};
}

export async function fetchSavedCoursePlansFromApi(): Promise<SavedCoursePlan[] | null> {
	try {
		const res = await fetch(apiUrl("/api/lesson-planner/saved"), { headers: authHeaders() });
		if (res.status === 401) return [];
		if (!res.ok) return null;
		const data = (await res.json()) as { plans?: SavedCoursePlanDto[] };
		return (data.plans ?? []).map(mapSavedPlan);
	} catch {
		return null;
	}
}

export async function fetchSavedCoursePlanFromApi(id: string): Promise<SavedCoursePlan | null> {
	try {
		const res = await fetch(apiUrl(`/api/lesson-planner/saved/${encodeURIComponent(id)}`), {
			headers: authHeaders(),
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { plan?: SavedCoursePlanDto };
		return data.plan ? mapSavedPlan(data.plan) : null;
	} catch {
		return null;
	}
}

export async function persistCoursePlanToApi(input: {
	id?: string | null;
	title: string;
	department: string;
	level: string;
	outline: string;
	presentation?: CoursePresentation | null;
}): Promise<SavedCoursePlan | null> {
	try {
		const res = await fetch(apiUrl("/api/lesson-planner/saved"), {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeaders() },
			body: JSON.stringify({
				...(input.id ? { id: input.id } : {}),
				title: input.title,
				department: input.department,
				level: input.level,
				outline: input.outline,
				...(input.presentation ? { presentation: coursePresentationForStorage(input.presentation) } : {}),
			}),
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { plan?: SavedCoursePlanDto };
		return data.plan ? mapSavedPlan(data.plan) : null;
	} catch {
		return null;
	}
}

const MONGO_OBJECT_ID = /^[a-f0-9]{24}$/i;

export function isSavedCoursePlanDbId(id: string): boolean {
	return MONGO_OBJECT_ID.test(id);
}

export async function deleteSavedCoursePlanFromApi(id: string): Promise<boolean> {
	if (!isSavedCoursePlanDbId(id)) return false;
	try {
		const res = await fetch(apiUrl(`/api/lesson-planner/saved/${encodeURIComponent(id)}`), {
			method: "DELETE",
			headers: authHeaders(),
		});
		return res.ok || res.status === 404;
	} catch {
		return false;
	}
}
