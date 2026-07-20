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
	/** Short structured outline shown on the idea card and opened in the Word editor. */
	outline?: string;
	/** 5–7 academic research questions for the proposed study. */
	researchQuestions?: string[];
};

export const IDEAS_PER_GENERATION = 3;
export const MIN_RESEARCH_QUESTIONS = 5;
export const MAX_RESEARCH_QUESTIONS = 7;

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
	{ id: "titles", label: "Formulating study titles & questions" },
	{ id: "quality", label: "Packaging research ideas" },
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

function defaultQuestions(focus: string, population: string, disciplineLabel: string): string[] {
	return [
		`To what extent does ${focus} influence measurable outcomes among ${population}?`,
		`Which mechanisms mediate the relationship between the core predictors and outcomes in ${focus}?`,
		`How do contextual or demographic differences shape findings related to ${focus} within ${disciplineLabel}?`,
		`What barriers and enablers affect implementation or adoption linked to ${focus}?`,
		`How can a rigorous ${disciplineLabel.toLowerCase()} design generate credible evidence on ${focus}?`,
		`What are the theoretical and practical implications of addressing ${focus} for ${population}?`,
	];
}

function buildTemplates(topic: string, disciplineLabel: string): IdeaTemplate[] {
	const area = topic.trim() || disciplineLabel;
	const year = new Date().getFullYear();
	return [
		{
			title: `How does [independent variable] affect [dependent outcome] among [specific population] in [context] within ${disciplineLabel}?`,
			rationale: `Addresses a measurable relationship in ${area} with defined units of analysis rather than a broad theme.`,
			approach:
				"Cross-sectional survey or structured interviews with validated scales; multivariate regression controlling for confounders.",
			type: "empirical",
			feasibility: "high",
			outline: [
				"1. Problem statement and significance in the stated context",
				"2. Key variables, constructs, and hypothesized relationships",
				"3. Literature gap and theoretical framing",
				"4. Sampling frame, instruments, and analysis plan",
				"5. Expected contributions and limitations",
			].join("\n"),
			researchQuestions: defaultQuestions(area, "the target population", disciplineLabel),
		},
		{
			title: `A longitudinal analysis of [construct/phenomenon] trajectories for [population] in [setting] (${year - 5}–${year})`,
			rationale: `Tracks change over time to identify trends and gaps in ${area}, supporting publishable temporal claims.`,
			approach: "Secondary panel data or repeated measures; time-series or growth-curve modelling.",
			type: "empirical",
			feasibility: "medium",
			outline: [
				"1. Temporal problem framing and measurement windows",
				"2. Trajectories, covariates, and competing explanations",
				"3. Data sources, attrition, and validity threats",
				"4. Growth-curve or time-series analysis strategy",
				"5. Policy/practice implications of observed change",
			].join("\n"),
			researchQuestions: defaultQuestions(`${area} over time`, "the longitudinal cohort", disciplineLabel),
		},
		{
			title: `Comparing [intervention/policy A] versus [status quo B] on [outcome] for [population] in [context]`,
			rationale: "Specifies comparators, outcomes, and setting — suitable for quasi-experimental or comparative case design.",
			approach: "Matched comparison groups, difference-in-differences or case-comparison with explicit coding protocol.",
			type: "applied",
			feasibility: "medium",
			outline: [
				"1. Intervention definition, comparator, and outcome metrics",
				"2. Design logic (matching, DiD, or comparative cases)",
				"3. Implementation context and fidelity considerations",
				"4. Evidence synthesis and effect estimation plan",
				"5. Recommendations for practice or policy",
			].join("\n"),
			researchQuestions: defaultQuestions(`comparing interventions in ${area}`, "comparison groups", disciplineLabel),
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
	const needsHypothesis =
		idea.type === "empirical" || idea.type === "applied" || idea.type === "interdisciplinary";

	return `You are an academic research advisor. Create a detailed research outline for a ${scopeLabel}-level project in ${disciplineLabel}.

**Broad interest area:** ${topic.trim()}
**Selected study title / focus:** ${idea.title}
**Type:** ${TYPE_LABELS[idea.type]}
**Feasibility:** ${FEASIBILITY_LABELS[idea.feasibility]}
**Rationale:** ${idea.rationale}
**Suggested approach:** ${idea.approach}

Return a structured Markdown outline with these sections IN THIS ORDER (use headings and bullet/numbered lists only — do not use markdown tables or pipe characters):
## 1. Introduction
Write short academic paragraphs under **Background**, **Problem statement**, and **Significance** (not one-line stubs).
## 2. Research questions
(Numbered list of 5–7 academic research questions — see rules below)
## 3. Hypotheses
(${
		needsHypothesis
			? "Testable hypotheses or research propositions aligned to the questions; use H0/H1 or directional forms where appropriate"
			: "State Not applicable, or theoretical propositions if hypotheses are not required"
	})
## 4. Objectives
(General objective + numbered specific objectives)
## 5. Literature review
Include **Themes**, **Framework**, and **Gap** subsections.
## 6. Methodology
(Design, population/sample, data collection, analysis, ethics)
## 7. Expected contributions
(Bullet list)
## 8. Scope and limitations
(Bullet list)
## 9. Suggested timeline
(Use ### Phase headings with paragraph descriptions, not tables)
## Sources for further reading
(Numbered list with full citations; embed each title as a markdown link to its URL, and one sentence on relevance)

Under ## 2. Research questions, do NOT paste only the selected title. Write a numbered list of 5 to 7 properly formulated academic research questions that operationalise the selected study into investigable inquiries. Requirements for each question:
- Clear, specific, and answerable through research at the ${scopeLabel} level
- Name key variables/constructs and, where relevant, population, setting, or context
- Prefer interrogative form ending with "?"
- Align with the study type (${TYPE_LABELS[idea.type]}) and suggested approach
Together they should form a coherent set (e.g. one overarching question plus focused sub-questions). Include at least 3 and at most 7 questions.

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
	const needsHypothesis =
		idea.type === "empirical" || idea.type === "applied" || idea.type === "interdisciplinary";

	const researchQuestions = (
		idea.researchQuestions?.length
			? idea.researchQuestions
			: [
					`To what extent does ${question} hold within ${contextTopic || disciplineLabel}, and under what conditions?`,
					`Which mechanisms or mediating factors explain the core relationships implied by: ${question}?`,
					`How do contextual, demographic, or organisational differences shape outcomes related to ${question}?`,
					`What are the theoretical and empirical implications of addressing ${question} for ${disciplineLabel} at the ${scopeLabel.toLowerCase()} level?`,
					`How can a ${TYPE_LABELS[idea.type].toLowerCase()} design generate credible evidence on ${question}?`,
				]
	).map((q, i) => `${i + 1}. ${q.replace(/^\d+[.)]\s*/, "")}`);

	const hypotheses = needsHypothesis
		? [
				`H1: There is a significant relationship between the focal predictors and outcomes implied by: ${question}.`,
				"H2: Contextual or demographic factors moderate the primary relationship under investigation.",
				"H3: Proposed mechanisms mediate the link between core predictors and outcomes.",
				"Where a research question is descriptive or exploratory, treat it as a proposition rather than a statistical hypothesis.",
			].map((h, i) => (i < 3 ? `${i + 1}. ${h}` : `- ${h}`))
		: [
				`- Not applicable for this ${TYPE_LABELS[idea.type].toLowerCase()} design; theoretical propositions may be developed in place of statistical hypotheses.`,
			];

	const objectives = [
		"1. Establish theoretical and empirical foundations for the research problem introduced above.",
		"2. Synthesise prior work and locate the study within current debates (literature review).",
		`3. Design and justify a ${TYPE_LABELS[idea.type].toLowerCase()} methodology suited to answering the research questions.`,
		`4. Generate findings and contributions appropriate for ${scopeLabel.toLowerCase()} standards.`,
	];

	const literatureThemes = [
		`- Foundational concepts and definitions in ${disciplineLabel} related to ${contextTopic || question}.`,
		`- Major empirical and theoretical strands bearing on: ${question}.`,
		`- Theoretical / conceptual framework informing the study.`,
		`- Methodological precedents for ${TYPE_LABELS[idea.type].toLowerCase()} research in this field.`,
		"- Identified gaps, contradictions, or under-studied contexts in the existing literature.",
	];

	const methodology = [
		`- **Research design:** ${idea.approach || `A ${TYPE_LABELS[idea.type].toLowerCase()} design appropriate to the research questions.`}`,
		"- **Population / sample:** Define the target population, sampling frame, and inclusion criteria.",
		"- **Data collection:** Instruments, secondary sources, or protocols; procedures for access and quality.",
		"- **Data analysis:** Analytic techniques aligned to the hypotheses/questions; validity and reliability checks.",
		"- **Ethical considerations:** Consent, confidentiality, risk mitigation, and institutional approvals as required.",
	];

	const contributions = [
		`- Clarifies or extends understanding of ${question}.`,
		`- Contributes to ${disciplineLabel} scholarship at the ${scopeLabel.toLowerCase()} level.`,
		`- Offers implications for practice, policy, or theory where relevant to ${TYPE_LABELS[idea.type].toLowerCase()} work.`,
	];

	const limitations = [
		"- Findings are bounded by the chosen population, setting, and time window.",
		`- Scope is calibrated to ${scopeLabel.toLowerCase()}-level feasibility (${FEASIBILITY_LABELS[idea.feasibility].toLowerCase()}).`,
		"- Measurement, access, or confounding constraints may limit causal claims where applicable.",
	];

	const timelineBlocks: string[] = ["## 9. Suggested timeline", ""];
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

	const introSignificance =
		idea.rationale ||
		`This study addresses an open question linking ${contextTopic || disciplineLabel} to current debates in ${disciplineLabel}.`;

	const outlineBullets = (idea.outline ?? "")
		.split("\n")
		.map((l) => l.replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
		.filter(Boolean)
		.slice(0, 5)
		.map((l) => `- ${l}`);

	const sections: string[] = [
		"# Research Outline",
		"",
		"<!-- aula-outline:local -->",
		"",
		`- **Discipline:** ${disciplineLabel}`,
		`- **Scope:** ${scopeLabel}`,
		`- **Research type:** ${TYPE_LABELS[idea.type]}`,
		`- **Feasibility:** ${FEASIBILITY_LABELS[idea.feasibility]}`,
		...(contextTopic ? [`- **Interest area:** ${contextTopic}`] : []),
		"",
		...formatOutlineSection("1. Introduction", [
			`**Background.** The study focuses on ${question} within ${contextTopic || disciplineLabel}, situating the inquiry in current ${disciplineLabel} debates and clarifying the core constructs under examination.`,
			"",
			`**Problem statement.** Existing work leaves important questions unresolved regarding ${question}, particularly around measurable relationships, contextual boundaries, and evidence suited to ${scopeLabel.toLowerCase()} research.`,
			"",
			`**Significance.** ${introSignificance}`,
			...(outlineBullets.length ? ["", "**Study focus points:**", ...outlineBullets] : []),
		]),
		...formatOutlineSection("2. Research questions", researchQuestions),
		...formatOutlineSection("3. Hypotheses", hypotheses),
		...formatOutlineSection("4. Objectives", [
			`**General objective.** To investigate ${question} within ${contextTopic || disciplineLabel} using a ${TYPE_LABELS[idea.type].toLowerCase()} approach appropriate for ${scopeLabel.toLowerCase()} standards.`,
			"",
			...objectives,
		]),
		...formatOutlineSection("5. Literature review", [
			"**Themes.**",
			...literatureThemes,
			"",
			"**Framework.** Identify and apply a theoretical or conceptual framework that organises variables, mechanisms, and expected relationships for this study.",
			"",
			"**Gap.** Prior literature insufficiently addresses the specific population, context, or methodological angle implied by the research questions above.",
		]),
		...formatOutlineSection("6. Methodology", methodology),
		...formatOutlineSection("7. Expected contributions", contributions),
		...formatOutlineSection("8. Scope and limitations", limitations),
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

STEP 2 — Formulate exactly ${IDEAS_PER_GENERATION} distinct study titles that could realistically become publishable academic studies for a ${scopeLabel}-level scholar in ${disciplineLabel}, starting from this interest: "${topic.trim()}".

${TOPIC_QUALITY_RULES}

For each idea use this exact markdown structure:

### 1. [Full publishable study title — variables, population, context, perspective]
**Type:** Empirical | Theoretical | Interdisciplinary | Applied
**Feasibility:** High | Moderate | Exploratory
**Rationale:** [1–2 sentences linking to the identified gap and ${scopeLabel}-level feasibility]
**Approach:** [Named design, data source, population, and analysis]
**Outline:**
- [5–7 short outline bullets covering problem, variables/gap, design, analysis, and contributions]
**Research questions:**
1. [Academic research question ending with ?]
2. [Academic research question ending with ?]
3. [Academic research question ending with ?]
4. [Academic research question ending with ?]
5. [Academic research question ending with ?]
(Include 5 to 7 numbered research questions total)

Requirements:
- Match scope to ${scopeLabel} level (complexity and ambition)
- Each title must name what is studied, which variables are involved, who/what is studied, and the context
- Each idea MUST include a concise outline and ${MIN_RESEARCH_QUESTIONS}–${MAX_RESEARCH_QUESTIONS} specific academic research questions
- Vary study types across the ${IDEAS_PER_GENERATION} ideas
- Do not ask clarifying questions — complete the analysis and generate all ${IDEAS_PER_GENERATION} ideas directly`;
}

export function parseResearchIdeas(content: string): ResearchIdea[] {
	const trimmed = content.trim();
	if (!trimmed) return [];

	const fromH3 = parseFromSections(trimmed, /^###\s+/m);
	if (fromH3.length) return fromH3.slice(0, IDEAS_PER_GENERATION);

	const fromH2 = parseFromSections(trimmed, /^##\s+/m);
	if (fromH2.length) return fromH2.slice(0, IDEAS_PER_GENERATION);

	const fromNumbered = parseFromNumberedList(trimmed);
	if (fromNumbered.length) return fromNumbered.slice(0, IDEAS_PER_GENERATION);

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

function extractLabelledBlock(body: string, labels: string[]): string {
	for (const label of labels) {
		const re = new RegExp(
			`(?:\\*\\*)?${label}:(?:\\*\\*)?\\s*([\\s\\S]*?)(?=\\n(?:\\*\\*)?[A-Za-z][A-Za-z \\/]*:(?:\\*\\*)?|\\n#{1,3}\\s|$)`,
			"i",
		);
		const match = body.match(re);
		if (match?.[1]?.trim()) return match[1].trim();
	}
	return "";
}

function parseOutlineField(body: string): string {
	const raw = extractLabelledBlock(body, ["Outline"]);
	if (!raw) return "";
	return raw
		.split("\n")
		.map((line) => line.replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
		.filter(Boolean)
		.join("\n");
}

function parseResearchQuestionsField(body: string): string[] {
	const raw = extractLabelledBlock(body, ["Research questions", "Research Questions", "Questions"]);
	if (!raw) return [];

	return raw
		.split("\n")
		.map((line) => line.replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
		.filter((line) => line.length > 8)
		.slice(0, MAX_RESEARCH_QUESTIONS);
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
	const outline = parseOutlineField(body);
	const researchQuestions = parseResearchQuestionsField(body);

	return {
		id: `idea-${index + 1}`,
		title,
		rationale,
		approach,
		type: normalizeType(type),
		feasibility,
		...(outline ? { outline } : {}),
		...(researchQuestions.length ? { researchQuestions } : {}),
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
		if (idea.outline?.trim()) {
			lines.push(`- **Outline:**`);
			idea.outline
				.split("\n")
				.map((l) => l.trim())
				.filter(Boolean)
				.forEach((line) => lines.push(`  - ${line.replace(/^[-*•]\s*/, "")}`));
		}
		if (idea.researchQuestions?.length) {
			lines.push(`- **Research questions:**`);
			idea.researchQuestions.forEach((q, qi) => lines.push(`  ${qi + 1}. ${q}`));
		}
		lines.push("");
	});
	return lines.join("\n");
}

/** Markdown document opened in the editable Word-style editor for a selected idea. */
export function ideaToEditableDocument(
	idea: ResearchIdea,
	contextTopic?: string,
	disciplineId?: string,
	scope: ResearchScope = "masters",
): string {
	if (disciplineId) {
		return generateLocalResearchOutline(idea, disciplineId, contextTopic ?? "", scope);
	}

	const lines: string[] = [`# Research Outline`, "", `## Study focus`, "", idea.title, ""];
	if (contextTopic?.trim()) {
		lines.push(`**Interest topic:** ${contextTopic.trim()}`, "");
	}
	lines.push(`**Type:** ${TYPE_LABELS[idea.type]}`);
	lines.push(`**Feasibility:** ${FEASIBILITY_LABELS[idea.feasibility]}`, "");

	lines.push("## 1. Introduction", "");
	if (idea.rationale?.trim()) {
		lines.push(idea.rationale.trim(), "");
	} else {
		lines.push("Background, problem statement, and significance of the study.", "");
	}

	if (idea.researchQuestions?.length) {
		lines.push("## 2. Research questions", "");
		idea.researchQuestions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
		lines.push("");
	}

	const needsHypothesis =
		idea.type === "empirical" || idea.type === "applied" || idea.type === "interdisciplinary";
	lines.push("## 3. Hypotheses", "");
	if (needsHypothesis) {
		lines.push(
			"1. State primary hypothesis aligned to the main research question.",
			"2. State secondary / moderating hypotheses as needed.",
			"",
		);
	} else {
		lines.push("Not applicable — develop theoretical propositions instead of statistical hypotheses.", "");
	}

	lines.push(
		"## 4. Objectives",
		"",
		"1. General objective",
		"2. Specific objectives",
		"",
		"## 5. Literature review",
		"",
		"- Key themes and debates",
		"- Theoretical / conceptual framework",
		"- Research gap",
		"",
		"## 6. Methodology",
		"",
	);
	if (idea.approach?.trim()) {
		lines.push(idea.approach.trim(), "");
	} else {
		lines.push("- Design, sample, data collection, analysis, ethics", "");
	}
	lines.push(
		"## 7. Expected contributions",
		"",
		"- Theoretical / empirical / practical contributions",
		"",
		"## 8. Scope and limitations",
		"",
		"- Boundaries and acknowledged limitations",
		"",
	);

	if (idea.outline?.trim()) {
		lines.push("## Study focus points", "");
		idea.outline
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean)
			.forEach((line) => {
				const cleaned = line.replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "");
				lines.push(`- ${cleaned}`);
			});
		lines.push("");
	}
	return lines.join("\n").trim();
}

/** Convert outline/idea markdown into HTML for ResearchDocEditor. */
export function markdownToDocHtml(markdown: string): string {
	const trimmed = markdown
		.replace(/<!--\s*aula-outline:local\s*-->/gi, "")
		.trim();
	if (!trimmed) return "";
	if (/<[a-z][\s\S]*>/i.test(trimmed) && !trimmed.includes("## ")) return trimmed;

	const blocks = trimmed.split(/\n{2,}/);
	const html: string[] = [];

	for (const block of blocks) {
		const lines = block.split("\n").map((l) => l.trimEnd());
		const first = lines[0]?.trim() ?? "";

		const researchBlock = block.match(
			/^```(research-chart|research-image|research-figure)\s*\n([\s\S]*?)\n```$/i,
		);
		if (researchBlock) {
			try {
				const kind = researchBlock[1]!.toLowerCase();
				const raw = researchBlock[2]!.trim();
				const parsed = JSON.parse(raw) as {
					title?: string;
					caption?: string;
					xKey?: string;
					yKeys?: string[];
					data?: Array<Record<string, string | number>>;
					nodes?: Array<{ label?: string }>;
					edges?: Array<{ from?: string; to?: string; label?: string }>;
					dataUrl?: string;
				};
				const encoded = encodeURIComponent(raw);
				if (kind === "research-chart") {
					const yKey = parsed.yKeys?.[0] ?? "";
					const points = (parsed.data ?? [])
						.map((row) => ({ label: String(row[parsed.xKey ?? ""] ?? ""), value: Number(row[yKey]) }))
						.filter((point) => Number.isFinite(point.value))
						.slice(0, 16);
					const max = Math.max(1, ...points.map((point) => Math.abs(point.value)));
					html.push(
						`<figure class="rp-doc-visual rp-doc-chart" contenteditable="false" data-research-kind="research-chart" data-research-json="${encoded}">` +
							`<figcaption>${escapeHtml(parsed.title || "Research chart")}</figcaption>` +
							`<div class="rp-doc-chart-bars">${points
								.map(
									(point) =>
										`<div class="rp-doc-chart-row"><span>${escapeHtml(point.label)}</span><i style="width:${Math.max(2, (Math.abs(point.value) / max) * 100)}%"></i><b>${point.value}</b></div>`,
								)
								.join("")}</div>` +
							`<small>${escapeHtml(parsed.caption || "Editable chart object")}</small></figure>`,
					);
				} else if (kind === "research-figure" && parsed.dataUrl?.startsWith("data:image/")) {
					html.push(
						`<figure class="rp-doc-visual rp-doc-figure" contenteditable="false" data-research-kind="research-figure" data-research-json="${encoded}">` +
							`<figcaption>${escapeHtml(parsed.title || "Research figure")}</figcaption>` +
							`<img src="${escapeHtml(parsed.dataUrl)}" alt="${escapeHtml(parsed.title || "Research figure")}" />` +
							`<small>${escapeHtml(parsed.caption || "From research note Figures.")}</small></figure>`,
					);
				} else {
					html.push(
						`<figure class="rp-doc-visual rp-doc-image" contenteditable="false" data-research-kind="research-image" data-research-json="${encoded}">` +
							`<figcaption>${escapeHtml(parsed.title || "Conceptual illustration")}</figcaption>` +
							`<div class="rp-doc-image-nodes">${(parsed.nodes ?? [])
								.slice(0, 9)
								.map((node) => `<span>${escapeHtml(node.label || "")}</span>`)
								.join("<b>→</b>")}</div>` +
							`<small>${escapeHtml(parsed.caption || "AI-generated conceptual illustration.")}</small></figure>`,
					);
				}
				continue;
			} catch {
				/* Keep malformed/incomplete blocks as editable text below. */
			}
		}
		const hasTableSeparator =
			lines.length >= 2 &&
			first.includes("|") &&
			/^\s*\|?[\s:|-]+\|[\s:|-]*\|?\s*$/.test(lines[1] ?? "");
		const isLoosePipeTable =
			lines.length >= 2 && lines.every((line) => line.split("|").length >= 3);
		if (hasTableSeparator || isLoosePipeTable) {
			const cells = (line: string) =>
				line
					.trim()
					.replace(/^\||\|$/g, "")
					.split("|")
					.map((cell) => cell.trim());
			const headers = cells(first);
			const rows = lines
				.slice(hasTableSeparator ? 2 : 1)
				.filter((line) => line.includes("|"))
				.map(cells)
				.filter((row) => row.length === headers.length);
			html.push(
				`<table><thead><tr>${headers.map((cell) => `<th>${inlineMarkdownToHtml(cell)}</th>`).join("")}</tr></thead>` +
					`<tbody>${rows
						.map((row) => `<tr>${headers.map((_, index) => `<td>${inlineMarkdownToHtml(row[index] ?? "")}</td>`).join("")}</tr>`)
						.join("")}</tbody></table>`,
			);
			continue;
		}

		if (/^#\s+/.test(first) && lines.length === 1) {
			html.push(`<h1>${escapeHtml(first.replace(/^#\s+/, ""))}</h1>`);
			continue;
		}
		if (/^##\s+/.test(first) && lines.length === 1) {
			html.push(`<h2>${escapeHtml(first.replace(/^##\s+/, ""))}</h2>`);
			continue;
		}
		if (/^###\s+/.test(first) && lines.length === 1) {
			html.push(`<h3>${escapeHtml(first.replace(/^###\s+/, ""))}</h3>`);
			continue;
		}
		// Bold-only section titles from the API (e.g. **1. Introduction**)
		if (/^\*\*[^*]+\*\*$/.test(first) && lines.length === 1) {
			html.push(`<h2>${escapeHtml(first.replace(/^\*\*|\*\*$/g, ""))}</h2>`);
			continue;
		}
		if (lines.every((l) => /^\d+[.)]\s+/.test(l.trim()))) {
			html.push(
				`<ol>${lines
					.map((l) => `<li>${inlineMarkdownToHtml(l.trim().replace(/^\d+[.)]\s+/, ""))}</li>`)
					.join("")}</ol>`,
			);
			continue;
		}
		if (lines.every((l) => /^[-*•]\s+/.test(l.trim()))) {
			html.push(
				`<ul>${lines
					.map((l) => `<li>${inlineMarkdownToHtml(l.trim().replace(/^[-*•]\s+/, ""))}</li>`)
					.join("")}</ul>`,
			);
			continue;
		}

		html.push(
			`<p>${lines.map((l) => inlineMarkdownToHtml(l.trim())).join("<br>")}</p>`,
		);
	}

	return html.join("");
}

/** Strip editor HTML back to readable Markdown for storage / paper prompts. */
export function htmlToOutlineText(html: string): string {
	const decodeEntities = (value: string) =>
		value
			.replace(/<[^>]+>/g, "")
			.replace(/&nbsp;/gi, " ")
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.trim();
	const tableToMarkdown = (table: string) => {
		const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) =>
			[...match[1]!.matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map((cell) =>
				decodeEntities(cell[1]!).replace(/\|/g, "\\|"),
			),
		);
		if (!rows.length) return "";
		const width = Math.max(...rows.map((row) => row.length));
		const normalized = rows.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ""));
		return [
			`| ${normalized[0]!.join(" | ")} |`,
			`| ${normalized[0]!.map(() => "---").join(" | ")} |`,
			...normalized.slice(1).map((row) => `| ${row.join(" | ")} |`),
		].join("\n");
	};
	const protectedHtml = html
		.replace(
			/<figure[^>]*data-research-kind="(research-chart|research-image|research-figure)"[^>]*data-research-json="([^"]*)"[^>]*>[\s\S]*?<\/figure>/gi,
			(_match, kind: string, encoded: string) => {
				try {
					return `\n\n\`\`\`${kind}\n${decodeURIComponent(encoded)}\n\`\`\`\n\n`;
				} catch {
					return "";
				}
			},
		)
		.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (table) => `\n\n${tableToMarkdown(table)}\n\n`);
	const withBreaks = protectedHtml
		.replace(/<\/(h1|h2|h3|p|li|div)>/gi, "\n")
		.replace(/<(h1)[^>]*>/gi, "# ")
		.replace(/<(h2)[^>]*>/gi, "## ")
		.replace(/<(h3)[^>]*>/gi, "### ")
		.replace(/<li[^>]*>/gi, "- ")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<(strong|b)[^>]*>/gi, "**")
		.replace(/<\/(strong|b)>/gi, "**")
		.replace(/<(em|i)[^>]*>/gi, "*")
		.replace(/<\/(em|i)>/gi, "*")
		.replace(/<\/?(ul|ol|u|span|div|p)[^>]*>/gi, "")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"');
	return withBreaks
		.replace(/<[^>]+>/g, "")
		.replace(/\*\*\s*\*\*/g, "")
		.replace(/(^|[^*\n])\*\s*\*([^*\n]|$)/g, "$1$2")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function escapeHtml(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMarkdownToHtml(text: string): string {
	return escapeHtml(text)
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/\*([^*]+)\*/g, "<em>$1</em>");
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

	if (idea.researchQuestions?.length) {
		lines.push("", "Research questions:");
		idea.researchQuestions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
	}

	if (idea.outline?.trim()) {
		lines.push("", "Outline:", idea.outline.trim());
	}

	return lines.join("\n");
}
