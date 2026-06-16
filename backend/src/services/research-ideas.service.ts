import { getOpenRouterFastModel } from "../config/env.js";
import type { TokenUsage } from "../types/token-usage.js";
import { completeOpenRouterChat } from "./llm.service.js";
import type { ResearchScope } from "./outline.service.js";

export type GenerateResearchIdeasInput = {
	disciplineLabel: string;
	topic: string;
	scope: ResearchScope;
};

export type ResearchScopeAnalysis = {
	discipline: string;
	researchArea: string;
	variables: string[];
	constructs: string[];
	phenomena: string[];
};

export type ResearchContextAndGap = {
	population: string;
	context: string;
	domain: string;
	researchGap: string;
};

export type ResearchTopicAnalysis = {
	scope: ResearchScopeAnalysis;
	contextAndGap: ResearchContextAndGap;
};

export type GenerateResearchIdeasResult = {
	ideasMarkdown: string;
	analysis: ResearchTopicAnalysis;
	usage?: TokenUsage;
};

const SCOPE_LABELS: Record<ResearchScope, string> = {
	undergraduate: "Undergraduate",
	masters: "Master's thesis",
	doctoral: "Doctoral research",
	faculty: "Faculty / grant",
};

const VAGUE_TITLE_EXAMPLES = [
	"Artificial Intelligence in Education",
	"Social Media and Business Growth",
	"Cybersecurity Challenges",
	"Machine Learning Applications in Healthcare",
	"Climate Change Effects",
];

const TITLE_QUALITY_RULES = `STRICT RULES — titles must be publishable academic studies, NOT broad themes.

DO NOT generate vague titles such as:
${VAGUE_TITLE_EXAMPLES.map((t) => `- ${t}`).join("\n")}

INSTEAD each title MUST specify:
- What is being studied (dependent/independent variables or focal phenomenon)
- Which variables, constructs, or mechanisms are involved
- Who or what is being studied (population, sample, units of analysis)
- The context or setting (geography, institution type, time window, sector)
- The analytical perspective (comparative, longitudinal, experimental, mixed-methods, etc.)

Good title pattern: "[Relationship/effect of X on Y among Z in context C using method/perspective P]"
Titles may be phrased as research questions or declarative study titles.`;

function mergeUsage(a?: TokenUsage, b?: TokenUsage): TokenUsage | undefined {
	if (!a) return b;
	if (!b) return a;
	return {
		promptTokens: a.promptTokens + b.promptTokens,
		completionTokens: a.completionTokens + b.completionTokens,
		totalTokens: a.totalTokens + b.totalTokens,
	};
}

function extractJsonObject<T>(text: string): T {
	const trimmed = text.trim();
	const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
	const candidate = fenceMatch?.[1]?.trim() ?? trimmed;
	const start = candidate.indexOf("{");
	const end = candidate.lastIndexOf("}");
	if (start === -1 || end === -1 || end <= start) {
		throw new Error("Agent did not return valid JSON.");
	}
	return JSON.parse(candidate.slice(start, end + 1)) as T;
}

function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeScopeAnalysis(raw: Partial<ResearchScopeAnalysis>, disciplineLabel: string, topic: string): ResearchScopeAnalysis {
	return {
		discipline: raw.discipline?.trim() || disciplineLabel,
		researchArea: raw.researchArea?.trim() || topic.trim(),
		variables: asStringArray(raw.variables),
		constructs: asStringArray(raw.constructs),
		phenomena: asStringArray(raw.phenomena),
	};
}

function normalizeContextAndGap(raw: Partial<ResearchContextAndGap>, topic: string): ResearchContextAndGap {
	return {
		population: raw.population?.trim() || "To be specified in study design",
		context: raw.context?.trim() || topic.trim(),
		domain: raw.domain?.trim() || topic.trim(),
		researchGap: raw.researchGap?.trim() || "Under-specified gap — refine during literature review",
	};
}

async function runScopeAnalyst(
	input: GenerateResearchIdeasInput,
	options?: { signal?: AbortSignal },
): Promise<{ analysis: ResearchScopeAnalysis; usage?: TokenUsage }> {
	const scopeLabel = SCOPE_LABELS[input.scope];
	const { text, usage } = await completeOpenRouterChat(
		[
			{
				role: "system",
				content:
					"You are Agent 1: Research Scope Analyst. You identify discipline, research area, and measurable variables/constructs/phenomena from a scholar's interest statement. Return ONLY valid JSON — no markdown.",
			},
			{
				role: "user",
				content: `Analyse this ${scopeLabel}-level interest in ${input.disciplineLabel}.

Interest statement: "${input.topic.trim()}"

Return JSON:
{
  "discipline": "confirmed or refined discipline",
  "researchArea": "specific sub-field or problem space (not a vague theme)",
  "variables": ["independent, dependent, moderating, or control variables"],
  "constructs": ["theoretical constructs or latent factors"],
  "phenomena": ["observable phenomena or outcomes of interest"]
}

Be specific. If the user gave a vague theme, infer realistic variables and phenomena that would make it researchable.`,
			},
		],
		{ signal: options?.signal, maxTokens: 900, model: getOpenRouterFastModel() },
	);

	const parsed = extractJsonObject<Partial<ResearchScopeAnalysis>>(text);
	return { analysis: normalizeScopeAnalysis(parsed, input.disciplineLabel, input.topic), usage };
}

async function runContextAndGapAnalyst(
	input: GenerateResearchIdeasInput,
	scopeAnalysis: ResearchScopeAnalysis,
	options?: { signal?: AbortSignal },
): Promise<{ analysis: ResearchContextAndGap; usage?: TokenUsage }> {
	const scopeLabel = SCOPE_LABELS[input.scope];
	const { text, usage } = await completeOpenRouterChat(
		[
			{
				role: "system",
				content:
					"You are Agent 2: Context & Gap Analyst. You identify population, setting, domain, and a defensible research gap. Return ONLY valid JSON — no markdown.",
			},
			{
				role: "user",
				content: `For a ${scopeLabel} study in ${scopeAnalysis.discipline}:

Interest: "${input.topic.trim()}"
Research area: ${scopeAnalysis.researchArea}
Variables: ${scopeAnalysis.variables.join("; ") || "not yet specified"}
Constructs: ${scopeAnalysis.constructs.join("; ") || "not yet specified"}
Phenomena: ${scopeAnalysis.phenomena.join("; ") || "not yet specified"}

Return JSON:
{
  "population": "who or what is studied (sample frame, units of analysis)",
  "context": "setting — geography, institution, sector, time period",
  "domain": "applied domain or field of practice",
  "researchGap": "specific gap, limitation, controversy, trend, or emerging issue this study could address"
}

Prefer realistic, researchable populations and contexts. For Nigerian/African higher education contexts when relevant, be concrete.`,
			},
		],
		{ signal: options?.signal, maxTokens: 900, model: getOpenRouterFastModel() },
	);

	const parsed = extractJsonObject<Partial<ResearchContextAndGap>>(text);
	return { analysis: normalizeContextAndGap(parsed, input.topic), usage };
}

function buildTitleFormulatorPrompt(
	input: GenerateResearchIdeasInput,
	scopeAnalysis: ResearchScopeAnalysis,
	contextAnalysis: ResearchContextAndGap,
): string {
	const scopeLabel = SCOPE_LABELS[input.scope];

	return `You are Agent 3: Title Formulator. Generate exactly 6 distinct, publishable research study titles.

${TITLE_QUALITY_RULES}

Scholar profile:
- Level: ${scopeLabel}
- Discipline: ${scopeAnalysis.discipline}
- Research area: ${scopeAnalysis.researchArea}
- Variables: ${scopeAnalysis.variables.join("; ") || "derive from analysis"}
- Constructs: ${scopeAnalysis.constructs.join("; ") || "derive from analysis"}
- Phenomena: ${scopeAnalysis.phenomena.join("; ") || "derive from analysis"}
- Population: ${contextAnalysis.population}
- Context: ${contextAnalysis.context}
- Domain: ${contextAnalysis.domain}
- Research gap: ${contextAnalysis.researchGap}
- Original interest: "${input.topic.trim()}"

For each idea use this exact markdown structure:

### 1. [Full study title — specific, publishable]
**Type:** Empirical | Theoretical | Interdisciplinary | Applied
**Feasibility:** High | Moderate | Exploratory
**Rationale:** [1–2 sentences linking to the research gap and why this is feasible at ${scopeLabel} level]
**Approach:** [Brief methodology naming design, data source, and analysis]

Requirements:
- Match ambition to ${scopeLabel} level
- Each title must name variables/population/context — never a theme label alone
- Vary study types across the 6 ideas
- Do not ask clarifying questions — output all 6 ideas directly`;
}

async function runTitleFormulator(
	input: GenerateResearchIdeasInput,
	scopeAnalysis: ResearchScopeAnalysis,
	contextAnalysis: ResearchContextAndGap,
	options?: { signal?: AbortSignal },
): Promise<{ markdown: string; usage?: TokenUsage }> {
	const { text, usage } = await completeOpenRouterChat(
		[
			{
				role: "system",
				content:
					"You formulate rigorous, specific academic research titles. Never output vague theme titles. Follow the user's markdown format exactly.",
			},
			{ role: "user", content: buildTitleFormulatorPrompt(input, scopeAnalysis, contextAnalysis) },
		],
		{ signal: options?.signal, maxTokens: 2200, model: getOpenRouterFastModel() },
	);

	return { markdown: text.trim(), usage };
}

async function runQualityGate(
	input: GenerateResearchIdeasInput,
	draftMarkdown: string,
	scopeAnalysis: ResearchScopeAnalysis,
	contextAnalysis: ResearchContextAndGap,
	options?: { signal?: AbortSignal },
): Promise<{ markdown: string; usage?: TokenUsage }> {
	const scopeLabel = SCOPE_LABELS[input.scope];
	const { text, usage } = await completeOpenRouterChat(
		[
			{
				role: "system",
				content:
					"You are Agent 4: Quality Gate. Reject vague theme titles and rewrite any that lack variables, population, or context. Return the final markdown only — same ### structure.",
			},
			{
				role: "user",
				content: `Review these ${scopeLabel}-level research ideas for ${scopeAnalysis.discipline}.

${TITLE_QUALITY_RULES}

Required anchors (titles must reflect these):
- Population: ${contextAnalysis.population}
- Context: ${contextAnalysis.context}
- Gap: ${contextAnalysis.researchGap}

Draft ideas:
${draftMarkdown}

If any title is too vague, rewrite it to be specific and publishable. Keep exactly 6 ideas in the same markdown format. Output only the corrected ideas — no commentary.`,
			},
		],
		{ signal: options?.signal, maxTokens: 2400, model: getOpenRouterFastModel() },
	);

	return { markdown: text.trim(), usage };
}

export async function generateResearchIdeas(
	input: GenerateResearchIdeasInput,
	options?: { signal?: AbortSignal },
): Promise<GenerateResearchIdeasResult> {
	const { analysis: scope, usage: u1 } = await runScopeAnalyst(input, options);
	const { analysis: contextAndGap, usage: u2 } = await runContextAndGapAnalyst(input, scope, options);
	const { markdown: draft, usage: u3 } = await runTitleFormulator(input, scope, contextAndGap, options);
	const { markdown: finalMarkdown, usage: u4 } = await runQualityGate(
		input,
		draft,
		scope,
		contextAndGap,
		options,
	);

	return {
		ideasMarkdown: finalMarkdown,
		analysis: { scope, contextAndGap },
		usage: mergeUsage(mergeUsage(mergeUsage(u1, u2), u3), u4),
	};
}
