export const SAVED_RESEARCH_LIST_PATH = {
	lecturer: "/research/saved",
	student: "/student/research/saved",
} as const;

export function savedResearchListPath(variant: "lecturer" | "student" = "lecturer"): string {
	return variant === "student" ? SAVED_RESEARCH_LIST_PATH.student : SAVED_RESEARCH_LIST_PATH.lecturer;
}

export function savedResearchPagePath(id: string, variant: "lecturer" | "student" = "lecturer"): string {
	const base = savedResearchListPath(variant);
	return `${base}?id=${encodeURIComponent(id)}`;
}

export function savedResearchPageBase(variant: "lecturer" | "student" = "lecturer"): string {
	return savedResearchListPath(variant);
}
