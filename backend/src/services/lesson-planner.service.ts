import { getOpenRouterFastModel } from "../config/env.js";
import { completeOpenRouterChat } from "./llm.service.js";

export type TeachingLevel =
	| "foundation"
	| "undergraduate-l1"
	| "undergraduate-l2"
	| "undergraduate-l3"
	| "postgraduate"
	| "professional";

export type GenerateCourseOutlineInput = {
	title: string;
	departmentLabel: string;
	level: TeachingLevel;
};

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

const SESSIONS_BY_LEVEL: Record<TeachingLevel, number> = {
	foundation: 10,
	"undergraduate-l1": 12,
	"undergraduate-l2": 12,
	"undergraduate-l3": 10,
	postgraduate: 10,
	professional: 8,
};

function buildPrompt(input: GenerateCourseOutlineInput): string {
	const levelLabel = LEVEL_LABELS[input.level] ?? input.level;
	const sessions = SESSIONS_BY_LEVEL[input.level] ?? 12;
	const guidance = LEVEL_GUIDANCE[input.level] ?? "";

	return `You are an expert university curriculum designer. Create a full **course outline** for higher education, calibrated to the teaching level below.

**Course title:** ${input.title.trim()}
**Department:** ${input.departmentLabel.trim()}
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

export async function generateCourseOutline(
	input: GenerateCourseOutlineInput,
	options?: { signal?: AbortSignal },
): Promise<{ outline: string }> {
	const sessions = SESSIONS_BY_LEVEL[input.level] ?? 12;
	const maxTokens = Math.min(8000, 2000 + sessions * 350);

	const { text: rawOutline } = await completeOpenRouterChat(
		[
			{
				role: "system",
				content:
					"You write detailed university course outlines in Markdown for lecturers. Use bold-only section titles — never hash headings. Outlines must be level-appropriate, sequenced, and ready to teach from.",
			},
			{
				role: "user",
				content: buildPrompt(input),
			},
		],
		{ signal: options?.signal, maxTokens, model: getOpenRouterFastModel() },
	);

	const outline = rawOutline.trim();
	if (!outline) {
		throw new Error("Course outline generation returned empty content.");
	}

	return { outline };
}

/** @deprecated Use generateCourseOutline */
export const generateLessonPlan = generateCourseOutline;
