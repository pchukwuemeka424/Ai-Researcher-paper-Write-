/** Session staging for user-saved research-note figures (not sent through the LLM). */

const FIGURE_APPENDIX_KEY = "aula-research-figure-appendix";

export function stageResearchFigureAppendix(markdown: string): void {
	if (typeof window === "undefined") return;
	const trimmed = markdown.trim();
	if (!trimmed) {
		sessionStorage.removeItem(FIGURE_APPENDIX_KEY);
		return;
	}
	sessionStorage.setItem(FIGURE_APPENDIX_KEY, trimmed);
}

export function peekResearchFigureAppendix(): string {
	if (typeof window === "undefined") return "";
	return sessionStorage.getItem(FIGURE_APPENDIX_KEY)?.trim() ?? "";
}

export function consumeResearchFigureAppendix(): string {
	const value = peekResearchFigureAppendix();
	if (typeof window !== "undefined") sessionStorage.removeItem(FIGURE_APPENDIX_KEY);
	return value;
}

/**
 * Insert saved research-figure blocks into Results when the model did not
 * already include them (figures are kept out of the LLM prompt for speed).
 */
export function injectSavedFiguresIntoPaper(content: string, figureAppendix: string): string {
	const appendix = figureAppendix.trim();
	if (!appendix) return content;
	if (/```research-figure/i.test(content)) return content;

	const block = [
		"",
		"**Saved research-note figures**",
		"",
		appendix,
		"",
	].join("\n");

	const discussion = content.search(/\n\*\*Discussion\*\*/i);
	const conclusion = content.search(/\n\*\*Conclusion\*\*/i);
	const references = content.search(/\n\*\*References\*\*/i);
	const insertAt = [discussion, conclusion, references].find((i) => i >= 0) ?? -1;
	if (insertAt >= 0) {
		return `${content.slice(0, insertAt)}\n${block}${content.slice(insertAt)}`;
	}

	const results = content.search(/\n\*\*Results\s*\/\s*Analysis\*\*/i);
	if (results >= 0) {
		return `${content}\n${block}`;
	}
	return `${content.trimEnd()}\n\n${block}`;
}
