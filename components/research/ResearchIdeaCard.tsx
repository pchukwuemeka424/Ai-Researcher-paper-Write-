"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { studentHasResearchTokens } from "@/components/StudentTokenQuota";
import { IconEdit } from "@/components/ui/ButtonIcon";
import { useAuth } from "@/hooks/useAuth";
import { stageOutlinePageContext } from "@/lib/research-outline-context";
import { researchOutlinePagePath } from "@/lib/research-outline-routes";
import { researchGeneratePagePath } from "@/lib/research-generate-routes";
import { loadSavedOutline, saveResearchOutline } from "@/lib/research-outline-storage";
import type { ResearchIdea, ResearchScope } from "@/lib/research-ideas";
import { formatIdeaForChat, getFeasibilityLabel, getTypeLabel, ideaToEditableDocument } from "@/lib/research-ideas";
import type { ResearchSourceSelection } from "@/lib/research-assets-api";

type Props = {
	idea: ResearchIdea;
	index: number;
	topic: string;
	discipline: string;
	scope: ResearchScope;
	saved: boolean;
	onSave: () => void;
	onUnsave: () => void;
	/** When true, show an explicit Remove control instead of a save toggle. */
	inSavedList?: boolean;
	studentUI?: boolean;
	sources?: ResearchSourceSelection;
};

export function ResearchIdeaCard({
	idea,
	index,
	topic,
	discipline,
	scope,
	saved,
	onSave,
	onUnsave,
	inSavedList = false,
	studentUI = false,
	sources,
}: Props) {
	const router = useRouter();
	const { user } = useAuth();
	const hasTokens = studentHasResearchTokens(user?.tokenQuota, user?.role);
	const [copied, setCopied] = useState(false);
	const [outline] = useState<string | null>(() => loadSavedOutline(idea, discipline, topic, scope));

	const ideaText = formatIdeaForChat(idea, topic);
	const outlineLines = (idea.outline ?? "")
		.split("\n")
		.map((l) => l.replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
		.filter(Boolean)
		.slice(0, 6);
	const questions = (idea.researchQuestions ?? []).slice(0, 7);
	const hasIdeaDocument = Boolean(outlineLines.length || questions.length);

	const copyIdea = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(ideaText);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			/* clipboard unavailable */
		}
	}, [ideaText]);

	const canEditOutline = Boolean(outline || hasIdeaDocument || hasTokens);

	const editOutline = useCallback(() => {
		if (!canEditOutline) return;

		const existingOutline = loadSavedOutline(idea, discipline, topic, scope);
		if (!existingOutline && (hasIdeaDocument || hasTokens)) {
			saveResearchOutline({
				idea,
				discipline,
				topic,
				scope,
				outline: ideaToEditableDocument(idea, topic, discipline, scope),
			});
		}

		const returnTo =
			typeof window !== "undefined"
				? `${window.location.pathname}${window.location.search}`
				: undefined;
		const key = stageOutlinePageContext({
			idea,
			discipline,
			topic,
			scope,
			sources,
			returnTo,
		});
		router.push(researchOutlinePagePath(key, studentUI ? "student" : "lecturer"));
	}, [idea, discipline, topic, scope, sources, canEditOutline, hasIdeaDocument, hasTokens, router, studentUI]);

	const handleEditOutlineClick = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			event.preventDefault();
			event.stopPropagation();
			editOutline();
		},
		[editOutline],
	);

	const openGeneratePage = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			event.preventDefault();
			event.stopPropagation();
			if (!hasTokens) return;
			const returnTo =
				typeof window !== "undefined"
					? `${window.location.pathname}${window.location.search}`
					: undefined;
			const key = stageOutlinePageContext({
				idea,
				discipline,
				topic,
				scope,
				sources,
				returnTo,
			});
			router.push(researchGeneratePagePath(key, studentUI ? "student" : "lecturer"));
		},
		[idea, discipline, topic, scope, sources, hasTokens, router, studentUI],
	);

	const stop = (event: React.MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
	};

	return (
		<article
			className="research-idea-card research-idea-card-clickable"
			role="button"
			tabIndex={0}
			onClick={editOutline}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					editOutline();
				}
			}}
			aria-label={`Edit outline for idea: ${idea.title}`}
		>
			<div className="research-idea-card-rail" aria-hidden />
			<div className="research-idea-card-inner">
				<div className="research-idea-card-top">
					<span className="research-idea-num">{index + 1}</span>
					<div className="research-idea-badges">
						<span className={`research-badge research-badge-type-${idea.type}`}>{getTypeLabel(idea.type)}</span>
						<span className={`research-badge research-badge-feas-${idea.feasibility}`}>
							{getFeasibilityLabel(idea.feasibility)}
						</span>
					</div>
				</div>

				<h3 className="research-idea-title">{idea.title}</h3>

				<div className="research-idea-body">
					{questions.length > 0 ? (
						<div className="research-idea-block">
							<p className="research-idea-label">Research questions</p>
							<ol className="research-idea-questions">
								{questions.map((q) => (
									<li key={q}>{q}</li>
								))}
							</ol>
						</div>
					) : null}

					{outlineLines.length > 0 ? (
						<div className="research-idea-block">
							<p className="research-idea-label">Outline</p>
							<ul className="research-idea-outline">
								{outlineLines.map((line) => (
									<li key={line}>{line}</li>
								))}
							</ul>
						</div>
					) : null}

					{!questions.length && !outlineLines.length && idea.rationale ? (
						<div className="research-idea-block">
							<p className="research-idea-label">Why it matters</p>
							<p className="research-idea-text">{idea.rationale}</p>
						</div>
					) : null}
				</div>

				<div className="research-idea-footer">
					<p className="research-idea-open-hint">Click to edit outline</p>
					<div className="research-idea-actions" onClick={stop}>
						<div className="research-idea-actions-secondary">
							<button type="button" className="research-action-btn research-action-btn-copy" onClick={copyIdea}>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
									<rect x="9" y="9" width="13" height="13" rx="2" />
									<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
								</svg>
								{copied ? "Copied" : "Copy"}
							</button>
							{inSavedList ? (
								<button
									type="button"
									className="research-action-btn research-action-btn-danger"
									onClick={onUnsave}
									aria-label={`Remove saved idea: ${idea.title}`}
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
										<path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
									</svg>
									Remove
								</button>
							) : (
								<button
									type="button"
									className={`research-action-btn research-action-btn-save ${saved ? "research-action-btn-active" : ""}`}
									onClick={saved ? onUnsave : onSave}
									aria-pressed={saved}
									aria-label={saved ? `Remove saved idea: ${idea.title}` : `Save idea: ${idea.title}`}
								>
									<svg
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill={saved ? "currentColor" : "none"}
										stroke="currentColor"
										strokeWidth="2"
										aria-hidden
									>
										<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
									</svg>
									{saved ? "Saved" : "Save"}
								</button>
							)}
							<button
								type="button"
								className="research-action-btn research-action-btn-generate"
								onClick={openGeneratePage}
								disabled={!hasTokens}
								title={!hasTokens ? "Research token limit reached" : undefined}
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
									<path d="M12 3v12M8 11l4 4 4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								Generate Research
							</button>
						</div>
						<div className="research-idea-actions-primary">
							<button
								type="button"
								className="research-action-btn research-action-btn-primary"
								onClick={handleEditOutlineClick}
								disabled={!canEditOutline}
								title={!canEditOutline ? "Research token limit reached" : "Edit this research outline"}
								aria-label={`Edit outline: ${idea.title}`}
							>
								<IconEdit size={14} />
								Edit outline
							</button>
						</div>
					</div>
				</div>
			</div>
		</article>
	);
}
