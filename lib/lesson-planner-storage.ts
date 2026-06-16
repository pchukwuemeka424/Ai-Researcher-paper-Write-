import type { CoursePresentation } from "@/lib/lesson-presentation";
import type { TeachingLevel } from "@/lib/lesson-planner";

export type SavedCoursePlan = {
	id: string;
	title: string;
	department: string;
	level: TeachingLevel;
	outline: string;
	presentation: CoursePresentation | null;
	createdAt: string;
	updatedAt: string;
	userId?: string | null;
};

export const SAVED_LESSONS_CHANGED = "feynman:saved-lessons-changed";

export function notifySavedLessonsChanged(): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new Event(SAVED_LESSONS_CHANGED));
}

export function coursePresentationForStorage(presentation: CoursePresentation): CoursePresentation {
	return {
		title: presentation.title,
		slides: presentation.slides.map(({ title, explanation, bullets, imageUrl }) => ({
			title,
			explanation,
			bullets,
			imageUrl: imageUrl ?? null,
		})),
	};
}
