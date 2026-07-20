import { saveChatCitationStyle } from "@/lib/chat-research-citations";
import { getStyleLabel, type CitationStyle } from "@/lib/citation-styles";
import { formatIdeaForChat, SCOPE_OPTIONS, stageChatPrefill, type ResearchIdea, type ResearchScope } from "@/lib/research-ideas";

export function buildResearchPaperPrompt(input: {
	idea: ResearchIdea;
	topic: string;
	disciplineLabel: string;
	scope: ResearchScope;
	outline: string;
	citationStyle: CitationStyle;
	sourceContext?: string;
	visualizationArtifacts?: string;
	/** User already saved Figures in a research note — do not invent new images. */
	hasSavedFigures?: boolean;
	/** Skip LLM outline — ground the paper in the selected research note. */
	skipOutline?: boolean;
}): string {
	const styleLabel = getStyleLabel(input.citationStyle);
	const scopeLabel = SCOPE_OPTIONS.find((s) => s.id === input.scope)?.label ?? input.scope;
	const hasCanonicalVisuals = Boolean(input.visualizationArtifacts?.trim());
	const hasSavedFigures = Boolean(input.hasSavedFigures);
	const fromNote = Boolean(input.skipOutline);

	return [
		formatIdeaForChat(input.idea, input.topic),
		"",
		`Discipline: ${input.disciplineLabel}`,
		`Scope: ${scopeLabel}`,
		"",
		`Reference style: ${styleLabel}`,
		"",
		fromNote
			? "Write a complete academic research paper grounded in the selected research note evidence below. Do not wait for or invent a separate research outline."
			: "Write a complete academic research paper based on the approved outline below.",
		fromNote
			? "Derive aims, methods, findings, and claims from the research note (and any study framing listed). Prefer the note over generic assumptions."
			: "Follow the outline's research question, objectives, methodology, literature themes, expected contributions, and timeline.",
		"Expand each section into substantive prose with in-text citations and a References section in the selected style.",
		"Use this exact IMRaD order with bold-only headings on their own lines: **Title**, **Abstract**, **Keywords:** …, **Study area:** …, **Introduction**, **Literature Review**, **Methodology**, **Results / Analysis**, **Discussion**, **Conclusion**, **References**.",
		"Never skip **Abstract** or **Introduction**; do not merge them with other sections.",
		"Do not use hash (#) Markdown headings or horizontal rules (---, --).",
		fromNote
			? "For Literature Review, use only what is supported by the research note references/findings and standard scholarly practice — do not fabricate a long outline-driven literature plan."
			: "Use sources from the outline's literature review and Sources for further reading where appropriate.",
		"Create concise Markdown tables for useful comparisons, literature synthesis, methods, or results.",
		"Every table must use valid GitHub-flavored Markdown: one pipe-delimited header row, an immediate separator row such as `| --- | --- |`, then pipe-delimited data rows. Never imitate a table with plain text and pipe characters.",
		"Never create a section titled “Data Source and Variables” (or similar). Dataset samples belong only in Results / Analysis, capped at 5 rows.",
		...(hasSavedFigures
			? [
					"CRITICAL: The user already saved empirical figures in their research note.",
					"Do NOT invent, generate, or emit any new images, diagrams, `research-image` blocks, or illustrative `research-chart` blocks.",
					"In Results / Analysis, discuss the listed saved figures by name (Figure 1, Figure 2, …) and insert the provided sample tables exactly (≤5 rows — do not expand to the full dataset).",
					"The actual figure images are attached automatically after generation — do not invent placeholders or fake image URLs.",
				]
			: hasCanonicalVisuals
				? [
						"In Results / Analysis, insert the provided canonical sample tables (≤5 rows) and `research-chart` blocks exactly as written.",
						"Do not invent, rewrite, rescale, expand, or replace the numeric values in those canonical artifacts.",
						"You may discuss them in prose and cite them as figures/tables (e.g. Table 1, Figure 1).",
						"Place tables and figures in Results / Analysis near the prose that interprets them.",
						"Do not create extra illustrative images when canonical artifacts are provided.",
					]
				: [
						"When no dataset or findings are supplied, you may still create useful literature-synthesis tables and clearly labelled illustrative graphs.",
						"Illustrative graph values must be plausible examples only, never presented as observed study findings or cited statistics.",
						"Label every such title and caption with “Illustrative” and explain in Results / Analysis that the values are synthetic.",
						"Emit graphs as fenced `research-chart` JSON blocks with this schema:",
						'{"type":"bar|line|area|pie|scatter","kind":"illustrative","title":"Illustrative: descriptive title","caption":"Synthetic example—not observed findings.","xKey":"category field","yKeys":["numeric field"],"data":[{"category field":"Label","numeric field":12}]}',
						"Keep charts to at most 30 data points and tables to the most relevant rows.",
						"Create a conceptual figure only when it materially clarifies a framework (fenced `research-image` JSON).",
					]),
		...(input.sourceContext?.trim()
			? [
					"Use the selected research note / document evidence below throughout the paper—not only in Results.",
					"Derive **Title** from the research note's suggested interest topic / study title (refine for academic style if needed; do not invent an unrelated title).",
					"Write **Abstract** from the note's aims, methods, data/evidence, and findings; keep claims supported by the note.",
					"Ground Introduction, Methodology, and Discussion in the note's notebook content, data, figures, and findings.",
					"Use only values present in the selected evidence for numeric tables.",
					"",
					"**Selected user evidence**",
					"",
					input.sourceContext.trim(),
				]
			: []),
		...(hasCanonicalVisuals
			? [
					"",
					"**Canonical research note tables / saved figure list**",
					"",
					input.visualizationArtifacts!.trim(),
				]
			: []),
		"",
		fromNote ? "**Study framing (from idea / research note — not an LLM outline)**" : "**Approved research outline**",
		"",
		input.outline.trim(),
	].join("\n");
}

/** Stage the full research prompt and citation style before navigating to chat. */
export function stageResearchGeneration(prompt: string, citationStyle: CitationStyle): void {
	saveChatCitationStyle(citationStyle);
	stageChatPrefill(prompt);
}
