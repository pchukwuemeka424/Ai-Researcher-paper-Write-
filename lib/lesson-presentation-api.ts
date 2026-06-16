import { apiUrl } from "@/lib/api";
import { authHeaders } from "@/lib/auth";
import type { CoursePresentation } from "@/lib/lesson-presentation";
import type { CourseOutlineInput } from "@/lib/lesson-planner";
import { getDisciplineLabel } from "@/lib/research-disciplines";

export type PresentationInput = CourseOutlineInput & {
	outline: string;
};

export async function fetchCoursePresentationFromApi(
	input: PresentationInput,
): Promise<CoursePresentation> {
	const res = await fetch(apiUrl("/api/lesson-planner/presentation"), {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify({
			title: input.title,
			department: input.department,
			departmentLabel: getDisciplineLabel(input.department),
			level: input.level,
			outline: input.outline,
		}),
	});

	const data = (await res.json().catch(() => ({}))) as {
		presentation?: CoursePresentation;
		error?: string;
	};

	if (!res.ok) {
		throw new Error(data.error ?? `Presentation request failed (${res.status})`);
	}

	if (!data.presentation?.slides?.length) {
		throw new Error("Presentation request returned empty slides.");
	}

	return {
		...data.presentation,
		slides: data.presentation.slides.map((slide) => ({
			...slide,
			imageUrl: slide.imageUrl ?? null,
			bullets: slide.bullets ?? [],
		})),
	};
}
