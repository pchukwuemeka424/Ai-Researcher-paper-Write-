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
}): string {
	const styleLabel = getStyleLabel(input.citationStyle);
	const scopeLabel = SCOPE_OPTIONS.find((s) => s.id === input.scope)?.label ?? input.scope;

	return [
		formatIdeaForChat(input.idea, input.topic),
		"",
		`Discipline: ${input.disciplineLabel}`,
		`Scope: ${scopeLabel}`,
		"",
		`Reference style: ${styleLabel}`,
		"",
		"Write a complete academic research paper based on the approved outline below.",
		"Follow the outline's research question, objectives, methodology, literature themes, expected contributions, and timeline.",
		"Expand each section into substantive prose with in-text citations and a References section in the selected style.",
		"Use this exact IMRaD order with bold-only headings on their own lines: **Title**, **Abstract**, **Keywords:** …, **Study area:** …, **Introduction**, **Literature Review**, **Methodology**, **Results / Analysis**, **Discussion**, **Conclusion**, **References**.",
		"Never skip **Abstract** or **Introduction**; do not merge them with other sections.",
		"Do not use hash (#) Markdown headings or horizontal rules (---, --).",
		"Use sources from the outline's literature review and Sources for further reading where appropriate.",
		"",
		"**Approved research outline**",
		"",
		input.outline.trim(),
	].join("\n");
}

/** Stage the full research prompt and citation style before navigating to chat. */
export function stageResearchGeneration(prompt: string, citationStyle: CitationStyle): void {
	saveChatCitationStyle(citationStyle);
	stageChatPrefill(prompt);
}
