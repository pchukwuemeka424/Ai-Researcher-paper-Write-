export const RESEARCH_GENERATE_PATH = {
	lecturer: "/research/generate",
	student: "/student/research/generate",
} as const;

export function researchGeneratePagePath(
	key: string,
	variant: "lecturer" | "student" = "lecturer",
): string {
	const base = variant === "student" ? RESEARCH_GENERATE_PATH.student : RESEARCH_GENERATE_PATH.lecturer;
	return `${base}?key=${encodeURIComponent(key)}`;
}

export function researchPaperWorkspacePath(
	topic: string,
	variant: "lecturer" | "student" = "lecturer",
	key?: string,
): string {
	const trimmed = topic.trim();
	const base = variant === "student" ? "/student/research/paper" : "/research/paper";
	const params = new URLSearchParams();
	params.set("generate", "1");
	if (trimmed) params.set("topic", trimmed);
	if (key?.trim()) params.set("key", key.trim());
	return `${base}?${params.toString()}`;
}
