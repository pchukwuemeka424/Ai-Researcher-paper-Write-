import { getOpenRouterFastModel } from "../config/env.js";
import type { TokenUsage } from "../types/token-usage.js";
import { fetchPapersForQuery, type AlphaXivPaper } from "./alphaxiv.service.js";
import { completeOpenRouterChat } from "./llm.service.js";

export type OutlineIdeaInput = {
	title: string;
	rationale: string;
	approach: string;
	type: string;
	feasibility: string;
};

export type ResearchScope = "undergraduate" | "masters" | "doctoral" | "faculty";

export type GenerateOutlineInput = {
	idea: OutlineIdeaInput;
	disciplineLabel: string;
	topic: string;
	scope: ResearchScope;
};

const SCOPE_LABELS: Record<ResearchScope, string> = {
	undergraduate: "Undergraduate",
	masters: "Master's thesis",
	doctoral: "Doctoral research",
	faculty: "Faculty / grant",
};

const TYPE_LABELS: Record<string, string> = {
	empirical: "Empirical",
	theoretical: "Theoretical",
	interdisciplinary: "Interdisciplinary",
	applied: "Applied",
};

const FEASIBILITY_LABELS: Record<string, string> = {
	high: "High feasibility",
	medium: "Moderate scope",
	exploratory: "Exploratory",
};

/** Max words for the outline body; "Sources for further reading" is added separately. */
export const OUTLINE_BODY_MAX_WORDS = 1500;

function formatPapersForOutlineContext(papers: AlphaXivPaper[]): string {
	if (papers.length === 0) {
		return "No matching papers were found for this topic.";
	}

	return papers
		.map((paper, index) => {
			const authorLine = formatPaperAuthors(paper.authors);
			const year = paperYear(paper.publicationDate);
			const abstract = paper.abstract
				? paper.abstract.replace(/\s+/g, " ").trim().slice(0, 400)
				: "Abstract unavailable.";

			return `${index + 1}. ${authorLine} (${year}). "${paper.title.replace(/"/g, "")}". ${abstract}`;
		})
		.join("\n\n");
}

function buildOutlinePrompt(input: GenerateOutlineInput, paperContext: string): string {
	const { idea, disciplineLabel, topic, scope } = input;
	const scopeLabel = SCOPE_LABELS[scope] ?? scope;
	const typeLabel = TYPE_LABELS[idea.type] ?? idea.type;
	const feasibilityLabel = FEASIBILITY_LABELS[idea.feasibility] ?? idea.feasibility;

	return `You are an academic research advisor. Create a detailed research outline for a ${scopeLabel}-level project in ${disciplineLabel}.

**Broad interest area:** ${topic.trim()}
**Selected research question:** ${idea.title}
**Type:** ${typeLabel}
**Feasibility:** ${feasibilityLabel}
**Rationale:** ${idea.rationale}
**Suggested approach:** ${idea.approach}

Use the following retrieved papers as primary sources for the literature review section. Do not invent papers outside this list.

${paperContext}

Return a structured Markdown outline with these sections (use bold section titles on their own lines and bullet/numbered lists only — do not use markdown tables or pipe characters):
**Research Outline**
**Overview** (discipline, scope, research type, feasibility, interest area)
**Research question**
**Background and significance**
**Objectives** (numbered list)
**Literature review themes** (bullet list — cite papers by author and year only, e.g. Smith (2021))
**Methodology**
**Expected contributions** (bullet list)
**Suggested timeline** (use **Phase** subheadings with paragraph descriptions, not tables)

Do NOT include a "Sources for further reading" section — it will be added separately.
Do NOT mention preprint servers, repository names, or ID numbers anywhere in the outline.
Do not use markdown tables.
Use bold-only section titles (e.g. **Research question**) — never hash (#) headings or horizontal rules (---, --).

Keep the entire outline body to at most ${OUTLINE_BODY_MAX_WORDS} words (excluding any sources section). Be concise: short paragraphs, focused bullet points, no filler.

Be specific to the question and discipline. Do not ask clarifying questions — deliver the full outline directly.`;
}

function formatPaperAuthors(authors: string[]): string {
	if (authors.length === 0) return "Unknown authors";
	if (authors.length === 1) return authors[0]!;
	if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
	return `${authors[0]} et al.`;
}

function paperYear(publicationDate: string | null): string {
	if (!publicationDate) return "n.d.";
	const year = new Date(publicationDate).getFullYear();
	return Number.isFinite(year) ? String(year) : "n.d.";
}

function formatEmbeddedSourceEntry(paper: AlphaXivPaper, index: number): string {
	const authorLine = formatPaperAuthors(paper.authors);
	const year = paperYear(paper.publicationDate);
	const title = paper.title.replace(/\*/g, "");
	const titleLink = paper.url ? `[*${title}*](${paper.url})` : `*${title}*`;
	const relevance = paper.abstract
		? paper.abstract.replace(/\s+/g, " ").trim().slice(0, 220) +
			(paper.abstract.replace(/\s+/g, " ").trim().length > 220 ? "…" : "")
		: "Relevant primary literature for this research question.";

	return `${index + 1}. ${authorLine} (${year}). ${titleLink}.\n   ${relevance}`;
}

function stripArxivMetaFromOutline(outline: string): string {
	return outline
		.replace(/\n(?:## Sources for further reading|\*\*Sources for further reading\*\*)[\s\S]*$/i, "")
		.replace(/\barXiv preprint\b[^.\n]*\.?/gi, "")
		.replace(/\barXiv:\s*[\d.]+[a-z]?\b/gi, "")
		.replace(/^.*\b(retrieved from|papers were found via)\b.*\n?/gim, "")
		.trim();
}

function countWords(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

function trimOutlineBodyToWordLimit(text: string, maxWords: number): string {
	const trimmed = text.trim();
	if (countWords(trimmed) <= maxWords) return trimmed;

	const paragraphs = trimmed.split(/\n\n+/);
	let result = "";

	for (const paragraph of paragraphs) {
		const candidate = result ? `${result}\n\n${paragraph}` : paragraph;
		if (countWords(candidate) > maxWords) break;
		result = candidate;
	}

	if (result && countWords(result) > 0) return result.trim();

	const words = trimmed.split(/\s+/).filter(Boolean);
	return `${words.slice(0, maxWords).join(" ")}…`;
}

function injectEmbeddedSourcesSection(outline: string, papers: AlphaXivPaper[]): string {
	const cleaned = trimOutlineBodyToWordLimit(stripArxivMetaFromOutline(outline), OUTLINE_BODY_MAX_WORDS);
	if (papers.length === 0) return cleaned;

	const sectionHeader = "**Sources for further reading**";
	const sourcesBlock = [sectionHeader, "", ...papers.map((paper, index) => formatEmbeddedSourceEntry(paper, index))].join(
		"\n\n",
	);

	return `${cleaned}\n\n${sourcesBlock}`;
}

export async function generateResearchOutline(
	input: GenerateOutlineInput,
	options?: { signal?: AbortSignal },
): Promise<{ outline: string; papers: AlphaXivPaper[]; usage?: TokenUsage }> {
	const searchQuery = [input.topic.trim(), input.idea.title.replace(/\?$/, ""), input.disciplineLabel]
		.filter(Boolean)
		.join(" ");

	const papers = await fetchPapersForQuery(searchQuery, { limit: 8, signal: options?.signal });
	const paperContext = formatPapersForOutlineContext(papers);

	const { text: rawOutline, usage } = await completeOpenRouterChat(
		[
			{
				role: "system",
				content:
					"You write rigorous academic research outlines in Markdown. Use bold-only section titles on their own lines — never hash (#) headings. Use the provided papers for literature themes only. Never mention preprint servers, repository names, or paper ID numbers in the outline text. Keep the outline body under 1500 words before any sources section.",
			},
			{
				role: "user",
				content: buildOutlinePrompt(input, paperContext),
			},
		],
		{ signal: options?.signal, maxTokens: 2400, model: getOpenRouterFastModel() },
	);

	const outline = injectEmbeddedSourcesSection(rawOutline.trim(), papers);

	return { outline, papers, usage };
}
