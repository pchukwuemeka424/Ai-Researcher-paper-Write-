"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { studentHasResearchTokens } from "@/components/StudentTokenQuota";
import { useAuth } from "@/hooks/useAuth";
import { stageOutlinePageContext } from "@/lib/research-outline-context";
import { researchOutlinePagePath } from "@/lib/research-outline-routes";
import { researchGeneratePagePath } from "@/lib/research-generate-routes";
import { loadSavedOutline } from "@/lib/research-outline-storage";
import type { ResearchIdea, ResearchScope } from "@/lib/research-ideas";
import { formatIdeaForChat, getFeasibilityLabel, getTypeLabel } from "@/lib/research-ideas";

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
}: Props) {
	const router = useRouter();
	const { user } = useAuth();
	const hasTokens = studentHasResearchTokens(user?.tokenQuota, user?.role);
	const [copied, setCopied] = useState(false);
	const [outline] = useState<string | null>(() => loadSavedOutline(idea, discipline, topic, scope));

	const ideaText = formatIdeaForChat(idea, topic);

	const copyIdea = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(ideaText);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			/* clipboard unavailable */
		}
	}, [ideaText]);

	const openOutlinePage = useCallback(() => {
		if (!hasTokens && !outline) return;
		const returnTo =
			typeof window !== "undefined"
				? `${window.location.pathname}${window.location.search}`
				: undefined;
		const key = stageOutlinePageContext({
			idea,
			discipline,
			topic,
			scope,
			returnTo,
		});
		router.push(researchOutlinePagePath(key, studentUI ? "student" : "lecturer"));
	}, [idea, discipline, topic, scope, hasTokens, outline, router, studentUI]);

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
				returnTo,
			});
			router.push(researchGeneratePagePath(key, studentUI ? "student" : "lecturer"));
		},
		[idea, discipline, topic, scope, hasTokens, router, studentUI],
	);

	return (
		<article className="research-idea-card">
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

			{idea.rationale && (
				<div className="research-idea-block">
					<p className="research-idea-label">Why it matters</p>
					<p className="research-idea-text">{idea.rationale}</p>
				</div>
			)}

			{idea.approach && (
				<div className="research-idea-block">
					<p className="research-idea-label">Suggested approach</p>
					<p className="research-idea-text">{idea.approach}</p>
				</div>
			)}

			<div className="research-idea-actions">
				<button type="button" className="research-action-btn" onClick={copyIdea}>
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
						className={`research-action-btn ${saved ? "research-action-btn-active" : ""}`}
						onClick={saved ? onUnsave : onSave}
						aria-pressed={saved}
						aria-label={saved ? `Remove saved idea: ${idea.title}` : `Save idea: ${idea.title}`}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
							<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
						</svg>
						{saved ? "Saved" : "Save"}
					</button>
				)}
				<button
					type="button"
					className={`research-action-btn ${outline ? "research-action-btn-saved" : ""}`}
					onClick={openOutlinePage}
					disabled={!hasTokens && !outline}
					title={!hasTokens && !outline ? "Research token limit reached" : undefined}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
						<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
					</svg>
					Research Outline
				</button>
				<button
					type="button"
					className="research-action-btn research-action-btn-primary"
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
		</article>
	);
}
