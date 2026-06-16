import { getDisciplineLabel } from "@/lib/research-disciplines";

export type TeachingLevel =
	| "foundation"
	| "undergraduate-l1"
	| "undergraduate-l2"
	| "undergraduate-l3"
	| "postgraduate"
	| "professional";

export type CourseOutlineInput = {
	title: string;
	department: string;
	level: TeachingLevel;
};

export const TEACHING_LEVEL_OPTIONS: { id: TeachingLevel; label: string; hint: string }[] = [
	{ id: "foundation", label: "Foundation / access", hint: "Introductory university prep" },
	{ id: "undergraduate-l1", label: "Undergraduate (Year 1)", hint: "First-year modules" },
	{ id: "undergraduate-l2", label: "Undergraduate (Year 2–3)", hint: "Intermediate modules" },
	{ id: "undergraduate-l3", label: "Undergraduate (Final year)", hint: "Advanced honours modules" },
	{ id: "postgraduate", label: "Postgraduate (Taught)", hint: "Masters-level seminars" },
	{ id: "professional", label: "Professional / CPD", hint: "Continuing professional development" },
];

const LEVEL_LABELS: Record<TeachingLevel, string> = {
	foundation: "Foundation / access level",
	"undergraduate-l1": "Undergraduate Year 1",
	"undergraduate-l2": "Undergraduate Year 2–3",
	"undergraduate-l3": "Undergraduate Final year",
	postgraduate: "Postgraduate (taught)",
	professional: "Professional / CPD",
};

const LEVEL_GUIDANCE: Record<TeachingLevel, string> = {
	foundation:
		"Scaffold concepts heavily, use plain language, short weekly topics, and frequent formative checks. Assume limited prior knowledge.",
	"undergraduate-l1":
		"Introduce core discipline concepts progressively. Balance lectures and guided practice. Assume first-year study skills.",
	"undergraduate-l2":
		"Build on prior modules with applied examples and moderate independence. Include case studies and problem sets.",
	"undergraduate-l3":
		"Emphasise synthesis, critique, and honours-level depth. Include research-informed topics and capstone-style assessment.",
	postgraduate:
		"Prioritise advanced theory, literature engagement, seminar discussion, and independent inquiry at masters level.",
	professional:
		"Focus on workplace application, competency outcomes, reflective practice, and portfolio or scenario-based assessment.",
};

/** Typical session count for a semester module outline at each level. */
const SESSIONS_BY_LEVEL: Record<TeachingLevel, number> = {
	foundation: 10,
	"undergraduate-l1": 12,
	"undergraduate-l2": 12,
	"undergraduate-l3": 10,
	postgraduate: 10,
	professional: 8,
};

export function getTeachingLevelLabel(level: TeachingLevel): string {
	return LEVEL_LABELS[level] ?? level;
}

export function getLevelGuidance(level: TeachingLevel): string {
	return LEVEL_GUIDANCE[level] ?? "";
}

export function getSessionsForLevel(level: TeachingLevel): number {
	return SESSIONS_BY_LEVEL[level] ?? 12;
}

export function buildCourseOutlinePrompt(input: CourseOutlineInput): string {
	const levelLabel = getTeachingLevelLabel(input.level);
	const departmentLabel = getDisciplineLabel(input.department);
	const sessions = getSessionsForLevel(input.level);
	const guidance = getLevelGuidance(input.level);

	return `You are an expert university curriculum designer. Create a full **course outline** for higher education, calibrated to the teaching level below.

**Course title:** ${input.title.trim()}
**Department:** ${departmentLabel}
**Teaching level:** ${levelLabel}

Level guidance: ${guidance}

Plan a ${sessions}-session semester module outline appropriate for this level. Return structured Markdown using bold-only section titles on their own lines — never hash (#) headings or horizontal rules.

Include these sections in order:

**Course overview** (2–4 sentences on purpose, audience, and prerequisites for this level)

**Course learning outcomes** (5–7 numbered, measurable outcomes aligned to ${levelLabel})

**Weekly session map** (numbered list of ${sessions} sessions: Session N — topic title — one-line focus)

**Topic breakdown** (for each session: key concepts, suggested activities, and formative check — grouped by session number)

**Assessment strategy** (summative + formative aligned to level; include weighting suggestions)

**Core reading & resources** (essential and further reading lists — no invented URLs)

**Differentiation & support** (how to stretch high achievers and scaffold students at this level)

Be specific to the course title and department. Use UK/university terminology. Do not ask clarifying questions — deliver the complete outline directly.`;
}

export function outlineFilename(title: string): string {
	const slug = title.trim().slice(0, 48).replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
	return `${slug || "course-outline"}.md`;
}
