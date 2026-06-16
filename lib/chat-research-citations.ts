import { CITATION_STYLES, DEFAULT_CITATION_STYLE, getStyleLabel, type CitationStyle } from "@/lib/citation-styles";

export const CHAT_CITATION_STYLE_KEY = "aula.chat.citationStyle";

const REFERENCE_STYLE_LINE = /^Reference style:\s*(.+)$/im;

export function parseCitationStyleFromText(text: string): CitationStyle | null {
	const match = text.match(REFERENCE_STYLE_LINE);
	if (!match?.[1]) return null;

	const value = match[1].trim();
	const byId = CITATION_STYLES.find((s) => s.id === value);
	if (byId) return byId.id;

	const byLabel = CITATION_STYLES.find((s) => s.label.toLowerCase() === value.toLowerCase());
	return byLabel?.id ?? null;
}

export function loadChatCitationStyle(): CitationStyle | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = sessionStorage.getItem(CHAT_CITATION_STYLE_KEY)?.trim();
		if (!raw) return null;
		return CITATION_STYLES.some((s) => s.id === raw) ? (raw as CitationStyle) : null;
	} catch {
		return null;
	}
}

export function saveChatCitationStyle(style: CitationStyle): void {
	if (typeof window === "undefined") return;
	try {
		sessionStorage.setItem(CHAT_CITATION_STYLE_KEY, style);
	} catch {
		/* storage unavailable */
	}
}

export function clearChatCitationStyle(): void {
	if (typeof window === "undefined") return;
	try {
		sessionStorage.removeItem(CHAT_CITATION_STYLE_KEY);
	} catch {
		/* storage unavailable */
	}
}

export function resolveChatCitationStyle(initialPrompt?: string | null): CitationStyle {
	const fromPrompt = initialPrompt ? parseCitationStyleFromText(initialPrompt) : null;
	if (fromPrompt) {
		saveChatCitationStyle(fromPrompt);
		return fromPrompt;
	}

	return loadChatCitationStyle() ?? DEFAULT_CITATION_STYLE;
}

export function buildChangeCitationStylePrompt(style: CitationStyle): string {
	const label = getStyleLabel(style);
	return [
		`Reformat the entire research paper in this conversation to use ${label} for all in-text citations and the References section.`,
		"Preserve all section headings, arguments, data, and approximate length.",
		"Use bold-only section titles (e.g. **Introduction**, **References**) — never hash (#) headings or horizontal rules (---, --).",
		"Update every in-text citation and reference entry to match the target style conventions.",
		"In the References section, embed each source title as [*Title*](url). Do not mention preprint servers, repository names, or paper ID numbers.",
		"Do not add meta-commentary — return the full revised paper in Markdown.",
	].join(" ");
}

export function buildUpdateReferencesPrompt(style: CitationStyle): string {
	const label = getStyleLabel(style);
	return [
		`Update and complete the References section of the research paper above using ${label}.`,
		"Ensure every in-text citation has a matching full reference entry.",
		"Add missing references for sources cited in the body; remove uncited entries.",
		"Embed each title as [*Title*](url). Do not mention preprint servers, repository names, or paper ID numbers.",
		"Align in-text citations with the reference list where needed.",
		"Keep all other sections unchanged unless minor citation edits are required for consistency.",
		"Return the full paper in Markdown.",
	].join(" ");
}

export function isIntegratedResearchPrompt(text: string): boolean {
	return (
		REFERENCE_STYLE_LINE.test(text) ||
		text.includes("**Approved research outline**") ||
		text.includes("## Approved research outline") ||
		text.includes("Write a complete academic research paper based on the approved outline")
	);
}
