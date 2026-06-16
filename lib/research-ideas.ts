import { getDisciplineLabel } from "@/lib/research-disciplines";
import { TOPIC_QUALITY_RULES } from "@/lib/research-topic-guidance";

export type IdeaType = "empirical" | "theoretical" | "interdisciplinary" | "applied";
export type IdeaFeasibility = "high" | "medium" | "exploratory";
export type ResearchScope = "undergraduate" | "masters" | "doctoral" | "faculty";

export type ResearchIdea = {
	id: string;
	title: string;
	rationale: string;
	approach: string;
	type: IdeaType;
	feasibility: IdeaFeasibility;
};

export type ResearchTopicAnalysis = {
	scope: {
		discipline: string;
		researchArea: string;
		variables: string[];
		constructs: string[];
		phenomena: string[];
	};
	contextAndGap: {
		population: string;
		context: string;
		domain: string;
		researchGap: string;
	};
};

export type IdeaGenerationPhase =
	| "scope"
	| "context"
	| "titles"
	| "quality"
	| "done";

export const IDEA_GENERATION_PHASES: { id: IdeaGenerationPhase; label: string }[] = [
	{ id: "scope", label: "Identifying discipline & variables" },
	{ id: "context", label: "Mapping population & research gap" },
	{ id: "titles", label: "Formulating study titles" },
	{ id: "quality", label: "Validating specificity" },
	{ id: "done", label: "Complete" },
];

export type ResearchSession = {
	id: string;
	dbId?: string;
	discipline: string;
	topic: string;
	scope: ResearchScope;
	createdAt: string;
	ideas: ResearchIdea[];
};

const TYPE_LABELS: Record<IdeaType, string> = {
	empirical: "Empirical",
	theoretical: "Theoretical",
	interdisciplinary: "Interdisciplinary",
	applied: "Applied",
};

const FEASIBILITY_LABELS: Record<IdeaFeasibility, string> = {
	high: "High feasibility",
	medium: "Moderate scope",
	exploratory: "Exploratory",
};

export const SCOPE_OPTIONS: { id: ResearchScope; label: string; hint: string }[] = [
	{ id: "undergraduate", label: "Undergraduate", hint: "Accessible, focused projects" },
	{ id: "masters", label: "Master's thesis", hint: "Original but bounded scope" },
	{ id: "doctoral", label: "Doctoral research", hint: "Novel, publishable contributions" },
	{ id: "faculty", label: "Faculty / grant", hint: "Ambitious, multi-year programmes" },
];

export const FOCUS_OPTIONS: { id: IdeaType | "all"; label: string }[] = [
	{ id: "all", label: "All types" },
	{ id: "empirical", label: "Empirical" },
	{ id: "theoretical", label: "Theoretical" },
	{ id: "interdisciplinary", label: "Interdisciplinary" },
	{ id: "applied", label: "Applied" },
];

type IdeaTemplate = Omit<ResearchIdea, "id">;

function buildTemplates(topic: string, disciplineLabel: string): IdeaTemplate[] {
	const area = topic.trim() || disciplineLabel;
	return [
		{
			title: `How does [independent variable] affect [dependent outcome] among [specific population] in [context: region/institution/sector] within ${disciplineLabel}?`,
			rationale: `Addresses a measurable relationship in ${area} with defined units of analysis rather than a broad theme.`,
			approach: "Cross-sectional survey or structured interviews with validated scales; multivariate regression controlling for confounders.",
			type: "empirical",
			feasibility: "high",
		},
		{
			title: `A longitudinal analysis of [construct/phenomenon] trajectories for [population] in [setting] (${new Date().getFullYear() - 5}–${new Date().getFullYear()})`,
			rationale: `Tracks change over time to identify trends and gaps in ${area}, supporting publishable temporal claims.`,
			approach: "Secondary panel data or repeated measures; time-series or growth-curve modelling.",
			type: "empirical",
			feasibility: "medium",
		},
		{
			title: `Comparing [intervention/policy A] versus [status quo B] on [outcome] for [population] in [context]`,
			rationale: "Specifies comparators, outcomes, and setting — suitable for quasi-experimental or comparative case design.",
			approach: "Matched comparison groups, difference-in-differences or case-comparison with explicit coding protocol.",
			type: "applied",
			feasibility: "medium",
		},
		{
			title: `Integrating [theory/construct from adjacent field] to explain [phenomenon] among [population] in ${disciplineLabel}`,
			rationale: "Cross-disciplinary framing with named constructs moves beyond theme-level statements.",
			approach: "Conceptual synthesis plus illustrative empirical test or systematic scoping review.",
			type: "interdisciplinary",
			feasibility: "exploratory",
		},
		{
			title: `Moderating role of [contextual factor] in the relationship between [X] and [Y] for [population] in [domain]`,
			rationale: "Specifies moderators and boundary conditions — a common publishable structure in empirical work.",
			approach: "Moderated regression or structural equation modelling on primary or secondary data.",
			type: "empirical",
			feasibility: "medium",
		},
		{
			title: `Critical review of methodological limitations in existing studies on [specific phenomenon] in [context]`,
			rationale: "Targets a defensible gap (methods, context, or measurement) rather than a generic literature theme.",
			approach: "Systematic review with quality appraisal and agenda for future primary research.",
			type: "theoretical",
			feasibility: "high",
		},
	];
}

export function generateLocalResearchIdeas(disciplineId: string, topic: string): ResearchIdea[] {
	const disciplineLabel = getDisciplineLabel(disciplineId);
	return buildTemplates(topic.trim(), disciplineLabel).map((idea, i) => ({
		...idea,
		id: `local-${i + 1}`,
	}));
}

export function buildResearchOutlinePrompt(
	idea: ResearchIdea,
	disciplineId: string,
	topic: string,
	scope: ResearchScope,
): string {
	const disciplineLabel = getDisciplineLabel(disciplineId);
	const scopeLabel = SCOPE_OPTIONS.find((s) => s.id === scope)?.label ?? scope;

	return `You are an academic research advisor. Create a detailed research outline for a ${scopeLabel}-level project in ${disciplineLabel}.

**Broad interest area:** ${topic.trim()}
**Selected research question:** ${idea.title}
**Type:** ${TYPE_LABELS[idea.type]}
**Feasibility:** ${FEASIBILITY_LABELS[idea.feasibility]}
**Rationale:** ${idea.rationale}
**Suggested approach:** ${idea.approach}

Return a structured Markdown outline with these sections (use headings and bullet/numbered lists only — do not use markdown tables or pipe characters):
## Research question
## Background and significance
## Objectives (numbered list)
## Literature review themes (bullet list)
## Methodology
## Expected contributions (bullet list)
## Suggested timeline (use ### Phase headings with paragraph descriptions, not tables)
## Sources for further reading (numbered list with full citations; embed each title as a markdown link to its URL, and one sentence on relevance)

Use only HTTPS links to doi.org, official publishers, or established academic databases. Do not use markdown tables.

Keep the entire outline body to at most 1500 words (excluding any sources section). Be concise.

Be specific to the question and discipline. Do not ask clarifying questions — deliver the full outline directly.`;
}

import { buildOutlineSources, buildOutlineSourcesFromPapers, type OutlinePaper } from "@/lib/research-outline-sources";

function outlineTimelinePhases(scope: ResearchScope): { title: string; period: string; activities: string }[] {
	const periods: Record<ResearchScope, string[]> = {
		undergraduate: ["Weeks 1–2", "Weeks 3–5", "Weeks 6–8", "Weeks 9–11", "Weeks 12–14"],
		masters: ["Months 1–2", "Months 3–4", "Months 5–6", "Months 7–9", "Months 10–12"],
		doctoral: ["Months 1–3", "Months 4–8", "Months 9–14", "Months 15–24", "Months 25–36"],
		faculty: ["Quarter 1", "Quarters 2–3", "Quarters 4–6", "Quarters 7–8", "Ongoing"],
	};

	const [p1, p2, p3, p4, p5] = periods[scope];
	return [
		{
			title: "Scoping and feasibility",
			period: p1!,
			activities: "Refine the research question, confirm ethics and access, and run an initial literature scan.",
		},
		{
			title: "Literature review",
			period: p2!,
			activities: "Build a structured review, map theoretical frameworks, and identify gaps your study will address.",
		},
		{
			title: "Research design",
			period: p3!,
			activities: "Finalise methods, instruments or protocols, sampling, and any pilot or feasibility work.",
		},
		{
			title: "Data and analysis",
			period: p4!,
			activities: "Collect or source data, apply analysis, and draft core results chapters or sections.",
		},
		{
			title: "Writing and dissemination",
			period: p5!,
			activities: "Complete full draft, incorporate feedback, revise, and prepare submission or presentation.",
		},
	];
}

function formatOutlineSection(title: string, body: string[]): string[] {
	return [`## ${title}`, "", ...body, ""];
}

export function generateLocalResearchOutline(
	idea: ResearchIdea,
	disciplineId: string,
	topic: string,
	scope: ResearchScope,
	papers?: OutlinePaper[],
): string {
	const disciplineLabel = getDisciplineLabel(disciplineId);
	const scopeLabel = SCOPE_OPTIONS.find((s) => s.id === scope)?.label ?? scope;
	const contextTopic = topic.trim();
	const question = idea.title.replace(/\?$/, "").trim();

	const meta: string[] = [
		"### Overview",
		"",
		`- **Discipline:** ${disciplineLabel}`,
		`- **Scope:** ${scopeLabel}`,
		`- **Research type:** ${TYPE_LABELS[idea.type]}`,
		`- **Feasibility:** ${FEASIBILITY_LABELS[idea.feasibility]}`,
	];
	if (contextTopic) {
		meta.push(`- **Interest area:** ${contextTopic}`);
	}

	const objectives = [
		"1. Establish theoretical and empirical foundations for the research question.",
		"2. Synthesise prior work and position the study within current debates.",
		`3. Design and justify a ${TYPE_LABELS[idea.type].toLowerCase()} methodology suited to this question.`,
		`4. Deliver findings appropriate for ${scopeLabel.toLowerCase()} standards and dissemination.`,
	];

	const literatureThemes = [
		`Foundational concepts and definitions in ${disciplineLabel} related to ${contextTopic || question}.`,
		`Major empirical and theoretical strands bearing on: ${question}.`,
		`Methodological precedents for ${TYPE_LABELS[idea.type].toLowerCase()} research in this field.`,
		"Identified gaps, contradictions, or under-studied contexts in the existing literature.",
		"Recent reviews and high-impact studies from the last five to ten years.",
	].map((t) => `- ${t}`);

	const contributions = [
		`Clarifies or extends understanding of ${question}.`,
		`Contributes to ${disciplineLabel} scholarship at the ${scopeLabel.toLowerCase()} level.`,
		`Offers implications for practice, policy, or theory where relevant to ${TYPE_LABELS[idea.type].toLowerCase()} work.`,
	].map((t) => `- ${t}`);

	const timelineBlocks: string[] = ["## Suggested timeline", ""];
	for (const phase of outlineTimelinePhases(scope)) {
		timelineBlocks.push(`### ${phase.title} (${phase.period})`);
		timelineBlocks.push("");
		timelineBlocks.push(phase.activities);
		timelineBlocks.push("");
	}

	const sourceBlocks: string[] = [
		"## Sources for further reading",
		"",
		...(papers && papers.length > 0
			? buildOutlineSourcesFromPapers(papers, disciplineId, topic, idea)
			: buildOutlineSources(disciplineId, topic, idea)),
	];

	const sections: string[] = [
		"# Research Outline",
		"",
		...meta,
		"",
		...formatOutlineSection("Research question", [idea.title]),
		...formatOutlineSection("Background and significance", [
			idea.rationale ||
				`This study addresses an open question linking ${contextTopic || disciplineLabel} to current debates in ${disciplineLabel}. The work is scoped for ${scopeLabel.toLowerCase()} research with ${FEASIBILITY_LABELS[idea.feasibility].toLowerCase()}.`,
		]),
		...formatOutlineSection("Objectives", objectives),
		...formatOutlineSection("Literature review themes", literatureThemes),
		...formatOutlineSection("Methodology", [
			idea.approach ||
				`Select ${TYPE_LABELS[idea.type].toLowerCase()} methods appropriate to the question. Document inclusion criteria, data sources, analysis steps, ethical considerations, and limitations.`,
		]),
		...formatOutlineSection("Expected contributions", contributions),
		...timelineBlocks,
		...sourceBlocks,
	];

	return sections.join("\n").trim();
}

export function buildResearchIdeasPrompt(
	disciplineId: string,
	topic: string,
	scope: ResearchScope,
): string {
	const disciplineLabel = getDisciplineLabel(disciplineId);
	const scopeLabel = SCOPE_OPTIONS.find((s) => s.id === scope)?.label ?? scope;

	return `You are an academic research advisor running a multi-step analysis before generating ideas.

STEP 1 — Before generating any topic, identify:
1. The discipline
2. The research area (sub-field, not a vague theme)
3. Major variables, constructs, or phenomena
4. A realistic population, context, or domain
5. A potential research gap, challenge, trend, controversy, limitation, or emerging issue

STEP 2 — Formulate exactly 6 distinct study titles that could realistically become publishable academic studies for a ${scopeLabel}-level scholar in ${disciplineLabel}, starting from this interest: "${topic.trim()}".

${TOPIC_QUALITY_RULES}

For each idea use this exact markdown structure:

### 1. [Full publishable study title — variables, population, context, perspective]
**Type:** Empirical | Theoretical | Interdisciplinary | Applied
**Feasibility:** High | Moderate | Exploratory
**Rationale:** [1–2 sentences linking to the identified gap and ${scopeLabel}-level feasibility]
**Approach:** [Named design, data source, population, and analysis]

Requirements:
- Match scope to ${scopeLabel} level (complexity and ambition)
- Each title must name what is studied, which variables are involved, who/what is studied, and the context
- Vary study types across the 6 ideas
- Do not ask clarifying questions — complete the analysis and generate all 6 ideas directly`;
}

export function parseResearchIdeas(content: string): ResearchIdea[] {
	const trimmed = content.trim();
	if (!trimmed) return [];

	const fromH3 = parseFromSections(trimmed, /^###\s+/m);
	if (fromH3.length) return fromH3;

	const fromH2 = parseFromSections(trimmed, /^##\s+/m);
	if (fromH2.length) return fromH2;

	const fromNumbered = parseFromNumberedList(trimmed);
	if (fromNumbered.length) return fromNumbered;

	return [];
}

function parseFromSections(content: string, splitter: RegExp): ResearchIdea[] {
	const ideas: ResearchIdea[] = [];
	const sections = content.split(splitter).slice(1);

	for (let i = 0; i < sections.length; i++) {
		const section = sections[i]!;
		const lines = section.split("\n");
		const titleLine = lines[0]?.replace(/^\d+\.\s*/, "").trim() ?? "";
		if (!titleLine || titleLine.length < 8) continue;

		const body = lines.slice(1).join("\n");
		ideas.push(buildIdeaFromBody(i, titleLine, body));
	}

	return ideas;
}

function parseFromNumberedList(content: string): ResearchIdea[] {
	const ideas: ResearchIdea[] = [];
	const blocks = content.split(/\n(?=\d+\.\s)/);

	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i]!.trim();
		const match = block.match(/^\d+\.\s*(.+?)(?:\n|$)/s);
		if (!match?.[1]) continue;

		const firstLine = match[1].replace(/^\*\*|\*\*$/g, "").trim();
		const body = block.slice(match[0].length);
		if (firstLine.length < 8) continue;

		ideas.push(buildIdeaFromBody(i, firstLine, body));
	}

	return ideas;
}

function buildIdeaFromBody(index: number, title: string, body: string): ResearchIdea {
	const type = parseField(body, "Type") as IdeaType | null;
	const feasibility = parseFeasibility(body);
	const rationale =
		parseField(body, "Rationale") ??
		parseField(body, "Why it matters") ??
		extractParagraph(body, "Rationale") ??
		"";
	const approach =
		parseField(body, "Approach") ??
		parseField(body, "Suggested approach") ??
		parseField(body, "Methodology") ??
		extractParagraph(body, "Approach") ??
		"";

	return {
		id: `idea-${index + 1}`,
		title,
		rationale,
		approach,
		type: normalizeType(type),
		feasibility,
	};
}

function parseField(body: string, label: string): string | null {
	const re = new RegExp(
		`\\*\\*${label}:\\*\\*\\s*([\\s\\S]+?)(?=\\n\\*\\*[A-Za-z]|\\n#{1,3}\\s|\\n\\d+\\.\\s|$)`,
		"i",
	);
	const match = body.match(re);
	if (!match?.[1]) return null;
	return match[1].replace(/\*\*/g, "").trim() || null;
}

function parseFeasibility(body: string): IdeaFeasibility {
	const raw = parseField(body, "Feasibility")?.toLowerCase() ?? "";
	if (raw.includes("high")) return "high";
	if (raw.includes("moderate") || raw.includes("medium")) return "medium";
	return "exploratory";
}

function normalizeType(type: string | null): IdeaType {
	const t = (type ?? "").toLowerCase();
	if (t.includes("empirical")) return "empirical";
	if (t.includes("theoretical")) return "theoretical";
	if (t.includes("interdisciplinary")) return "interdisciplinary";
	if (t.includes("applied")) return "applied";
	return "empirical";
}

function extractParagraph(body: string, afterLabel: string): string {
	const idx = body.indexOf(`**${afterLabel}:**`);
	if (idx === -1) return "";
	const rest = body.slice(idx + afterLabel.length + 4).trim();
	const nextBold = rest.search(/\n\*\*/);
	return (nextBold === -1 ? rest : rest.slice(0, nextBold)).trim();
}

export function ideasToMarkdown(ideas: ResearchIdea[], disciplineLabel: string, topic: string): string {
	const lines = [`# Research Ideas — ${disciplineLabel}`, "", `**Topic:** ${topic}`, ""];
	ideas.forEach((idea, i) => {
		lines.push(`## ${i + 1}. ${idea.title}`);
		lines.push("");
		lines.push(`- **Type:** ${TYPE_LABELS[idea.type]}`);
		lines.push(`- **Feasibility:** ${FEASIBILITY_LABELS[idea.feasibility]}`);
		lines.push(`- **Rationale:** ${idea.rationale}`);
		lines.push(`- **Approach:** ${idea.approach}`);
		lines.push("");
	});
	return lines.join("\n");
}

export function getTypeLabel(type: IdeaType): string {
	return TYPE_LABELS[type];
}

export function getFeasibilityLabel(f: IdeaFeasibility): string {
	return FEASIBILITY_LABELS[f];
}

/** Session storage key used when navigating from Research → chat workspace. */
export const CHAT_PREFILL_KEY = "aula.chat.prefill";

/** Survives React Strict Mode remounts within the same page load. */
let chatPrefillCache: string | null | undefined;

function readChatPrefillFromWindow(): string | null {
	if (typeof window === "undefined") return null;

	const fromUrl = new URLSearchParams(window.location.search).get("topic")?.trim();
	if (fromUrl) return fromUrl;

	try {
		const fromStorage = sessionStorage.getItem(CHAT_PREFILL_KEY)?.trim();
		if (fromStorage) return fromStorage;
	} catch {
		/* storage unavailable */
	}

	return null;
}

/** Call before navigating to chat from Research idea cards. */
export function stageChatPrefill(text: string): void {
	const trimmed = text.trim();
	if (!trimmed) return;

	chatPrefillCache = trimmed;

	try {
		sessionStorage.setItem(CHAT_PREFILL_KEY, trimmed);
	} catch {
		/* storage unavailable */
	}
}

/** Initial composer text when opening chat from Research (or `?topic=`). */
export function consumeChatPrefill(): string {
	if (chatPrefillCache !== undefined) {
		const cached = chatPrefillCache ?? "";
		chatPrefillCache = undefined;
		return cached;
	}

	const value = readChatPrefillFromWindow();
	chatPrefillCache = value;

	try {
		sessionStorage.removeItem(CHAT_PREFILL_KEY);
	} catch {
		/* storage unavailable */
	}

	return value ?? "";
}

/** Plain text for chat prefill (no markdown bullets or title/topic separators). */
export function formatIdeaForChat(idea: ResearchIdea, contextTopic?: string): string {
	const lines: string[] = [idea.title, "", `Type: ${getTypeLabel(idea.type)}`, `Feasibility: ${getFeasibilityLabel(idea.feasibility)}`];

	const topic = contextTopic?.trim();
	if (topic) {
		lines.push(`Context: ${topic}`);
	}

	if (idea.rationale) {
		lines.push("", "Why it matters:", idea.rationale);
	}

	if (idea.approach) {
		lines.push("", "Suggested approach:", idea.approach);
	}

	return lines.join("\n");
}
