export const RESEARCH_OUTLINE_PATH = {
	lecturer: "/research/outline",
	student: "/student/research/outline",
} as const;

export function researchOutlinePagePath(
	key: string,
	variant: "lecturer" | "student" = "lecturer",
): string {
	const base = variant === "student" ? RESEARCH_OUTLINE_PATH.student : RESEARCH_OUTLINE_PATH.lecturer;
	return `${base}?key=${encodeURIComponent(key)}`;
}
