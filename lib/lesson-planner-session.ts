import type { TeachingLevel } from "@/lib/lesson-planner";

export type LessonPlannerSession = {
	title: string;
	department: string;
	level: TeachingLevel;
	outline: string;
	savedPlanId?: string;
};

const STORAGE_KEY = "feynman:lesson-planner:session";

export function saveLessonPlannerSession(session: LessonPlannerSession): void {
	if (typeof window === "undefined") return;
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function readLessonPlannerSession(): LessonPlannerSession | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<LessonPlannerSession>;
		if (
			typeof parsed.title !== "string" ||
			!parsed.title.trim() ||
			typeof parsed.department !== "string" ||
			typeof parsed.level !== "string" ||
			typeof parsed.outline !== "string" ||
			!parsed.outline.trim()
		) {
			return null;
		}
		return {
			title: parsed.title.trim(),
			department: parsed.department,
			level: parsed.level as TeachingLevel,
			outline: parsed.outline.trim(),
			...(typeof parsed.savedPlanId === "string" && parsed.savedPlanId.trim()
				? { savedPlanId: parsed.savedPlanId.trim() }
				: {}),
		};
	} catch {
		return null;
	}
}

export function clearLessonPlannerSession(): void {
	if (typeof window === "undefined") return;
	sessionStorage.removeItem(STORAGE_KEY);
}
