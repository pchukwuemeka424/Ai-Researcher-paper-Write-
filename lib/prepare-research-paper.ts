import type { CitationStyle } from "@/lib/citation-styles";
import {
	fetchResearchOutlineFromApi,
	fetchResearchSourceContextFromApi,
	fetchResearchVisualizationsFromApi,
} from "@/lib/research-api";
import { getDisciplineLabel } from "@/lib/research-disciplines";
import { stageResearchFigureAppendix } from "@/lib/research-figure-appendix";
import { buildResearchPaperPrompt } from "@/lib/research-generate";
import type { ResearchIdea } from "@/lib/research-ideas";
import { peekOutlinePageContext, resolveOutlinePageContext } from "@/lib/research-outline-context";
import { loadSavedOutline, saveResearchOutline } from "@/lib/research-outline-storage";
import type { StudentTokenQuota } from "@/lib/student-tokens";

/** Lightweight framing from the idea card — not an LLM outline. */
function framingFromIdea(idea: ResearchIdea, topic: string): string {
	const questions = (idea.researchQuestions ?? []).filter((q) => q.trim().length > 8);
	return [
		`**Study title / focus:** ${idea.title || topic}`,
		idea.rationale?.trim() ? `**Rationale:** ${idea.rationale.trim()}` : "",
		idea.approach?.trim() ? `**Suggested approach:** ${idea.approach.trim()}` : "",
		questions.length
			? `**Research questions:**\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
			: "",
		idea.outline?.trim() ? `**Focus points:**\n${idea.outline.trim()}` : "",
	]
		.filter(Boolean)
		.join("\n\n");
}

export async function prepareResearchPaperPrompt(
	key: string,
	citationStyle: CitationStyle,
	options?: { onTokenQuota?: (quota: StudentTokenQuota) => void },
): Promise<string | null> {
	const context = resolveOutlinePageContext(key) ?? peekOutlinePageContext(key);
	if (!context) return null;

	const datasetIds = context.sources?.datasetIds ?? [];
	const projectIds = context.sources?.projectIds ?? [];
	const fromResearchNote = projectIds.length > 0;
	const hasSelectedSources = Boolean(
		context.sources &&
			(context.sources.documentIds.length ||
				datasetIds.length ||
				context.sources.noteIds.length ||
				fromResearchNote),
	);

	const disciplineLabel = getDisciplineLabel(context.discipline);
	const topic = context.idea.title || context.topic;

	const vizTask =
		datasetIds.length || projectIds.length
			? fetchResearchVisualizationsFromApi({
					datasetIds,
					projectIds,
					topic,
				}).catch(() => ({
					artifacts: "",
					figureAppendix: "",
					hasSavedFigures: false,
				}))
			: Promise.resolve({
					artifacts: "",
					figureAppendix: "",
					hasSavedFigures: false,
				});

	// Research note selected → never call outline generation.
	if (fromResearchNote) {
		const [sourceContext, vizResult] = await Promise.all([
			context.sources
				? fetchResearchSourceContextFromApi(context.sources).catch(() => "")
				: Promise.resolve(""),
			vizTask,
		]);
		stageResearchFigureAppendix(vizResult.figureAppendix);
		return buildResearchPaperPrompt({
			idea: context.idea,
			topic: context.topic,
			disciplineLabel,
			scope: context.scope,
			outline: framingFromIdea(context.idea, context.topic),
			citationStyle,
			sourceContext: sourceContext || undefined,
			visualizationArtifacts: vizResult.artifacts || undefined,
			hasSavedFigures: vizResult.hasSavedFigures,
			skipOutline: true,
		});
	}

	// No research note: reuse cached outline, or generate one when missing.
	let outline = loadSavedOutline(context.idea, context.discipline, context.topic, context.scope);
	let sourceContext: string | undefined;

	const outlineTask = !outline?.trim()
		? fetchResearchOutlineFromApi({
				idea: context.idea,
				disciplineLabel,
				topic: context.topic,
				scope: context.scope,
				sources: context.sources,
			}).then((result) => {
				if (result.tokenQuota) options?.onTokenQuota?.(result.tokenQuota);
				saveResearchOutline({
					idea: context.idea,
					discipline: context.discipline,
					topic: context.topic,
					scope: context.scope,
					outline: result.outline,
				});
				return result;
			})
		: hasSelectedSources
			? fetchResearchSourceContextFromApi(context.sources!).then((ctx) => ({
					outline: outline!,
					sourceContext: ctx,
				}))
			: Promise.resolve({ outline: outline!, sourceContext: undefined as string | undefined });

	const [outlineResult, vizResult] = await Promise.all([outlineTask, vizTask]);

	outline = outlineResult.outline;
	sourceContext = outlineResult.sourceContext;

	stageResearchFigureAppendix(vizResult.figureAppendix);

	return buildResearchPaperPrompt({
		idea: context.idea,
		topic: context.topic,
		disciplineLabel,
		scope: context.scope,
		outline,
		citationStyle,
		sourceContext,
		visualizationArtifacts: vizResult.artifacts || undefined,
		hasSavedFigures: vizResult.hasSavedFigures,
		skipOutline: false,
	});
}
