import type { CitationStyle } from "@/lib/citation-styles";
import { fetchResearchOutlineFromApi } from "@/lib/research-api";
import { getDisciplineLabel } from "@/lib/research-disciplines";
import { buildResearchPaperPrompt } from "@/lib/research-generate";
import { peekOutlinePageContext, resolveOutlinePageContext } from "@/lib/research-outline-context";
import { loadSavedOutline, saveResearchOutline } from "@/lib/research-outline-storage";
import type { StudentTokenQuota } from "@/lib/student-tokens";

export async function prepareResearchPaperPrompt(
	key: string,
	citationStyle: CitationStyle,
	options?: { onTokenQuota?: (quota: StudentTokenQuota) => void },
): Promise<string | null> {
	const context = resolveOutlinePageContext(key) ?? peekOutlinePageContext(key);
	if (!context) return null;

	let outline = loadSavedOutline(context.idea, context.discipline, context.topic, context.scope);
	if (!outline?.trim()) {
		const disciplineLabel = getDisciplineLabel(context.discipline);
		const { outline: outlineFromApi, tokenQuota } = await fetchResearchOutlineFromApi({
			idea: context.idea,
			disciplineLabel,
			topic: context.topic,
			scope: context.scope,
		});
		if (tokenQuota) options?.onTokenQuota?.(tokenQuota);
		saveResearchOutline({
			idea: context.idea,
			discipline: context.discipline,
			topic: context.topic,
			scope: context.scope,
			outline: outlineFromApi,
		});
		outline = outlineFromApi;
	}

	const disciplineLabel = getDisciplineLabel(context.discipline);
	return buildResearchPaperPrompt({
		idea: context.idea,
		topic: context.topic,
		disciplineLabel,
		scope: context.scope,
		outline,
		citationStyle,
	});
}
