"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import { AulaLayout } from "@/components/AulaLayout";
import { StudentLayout } from "@/components/StudentLayout";
import { studentHasResearchTokens } from "@/components/StudentTokenQuota";
import { IconFileText, IconRefresh, IconTrash } from "@/components/ui/ButtonIcon";
import { useAuth } from "@/hooks/useAuth";
import { fetchResearchOutlineFromApi } from "@/lib/research-api";
import { getDisciplineLabel } from "@/lib/research-disciplines";
import { researchGeneratePagePath } from "@/lib/research-generate-routes";
import { peekOutlinePageContext, resolveOutlinePageContext, stageOutlinePageContext } from "@/lib/research-outline-context";
import { loadSavedOutline, removeSavedOutline, saveResearchOutline } from "@/lib/research-outline-storage";

type Props = {
	variant?: "lecturer" | "student";
};

function ResearchOutlineContent({ variant = "lecturer" }: Props) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { user, setTokenQuota } = useAuth();
	const key = searchParams.get("key")?.trim() ?? "";
	const isStudent = variant === "student";
	const hasTokens = studentHasResearchTokens(user?.tokenQuota, user?.role);

	const [context, setContext] = useState(() => (key ? resolveOutlinePageContext(key) : null));
	const [outline, setOutline] = useState<string | null>(() =>
		key && context ? loadSavedOutline(context.idea, context.discipline, context.topic, context.scope) : null,
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const researchPath = isStudent ? "/student/research" : "/research";
	const backHref = context?.returnTo?.trim() || researchPath;

	useEffect(() => {
		if (!key) return;
		const resolved = resolveOutlinePageContext(key) ?? peekOutlinePageContext(key);
		setContext(resolved);
		if (resolved) {
			setOutline(loadSavedOutline(resolved.idea, resolved.discipline, resolved.topic, resolved.scope));
		}
	}, [key]);

	const generateOutline = useCallback(async () => {
		if (!context) return null;
		if (!hasTokens) {
			const message = "You have used all your research tokens. Contact your instructor for more.";
			setError(message);
			return null;
		}
		setLoading(true);
		setError(null);
		try {
			const disciplineLabel = getDisciplineLabel(context.discipline);
			const { outline: outlineFromApi, tokenQuota } = await fetchResearchOutlineFromApi({
				idea: context.idea,
				disciplineLabel,
				topic: context.topic,
				scope: context.scope,
			});
			if (tokenQuota) setTokenQuota(tokenQuota);
			saveResearchOutline({
				idea: context.idea,
				discipline: context.discipline,
				topic: context.topic,
				scope: context.scope,
				outline: outlineFromApi,
			});
			setOutline(outlineFromApi);
			return outlineFromApi;
		} catch (err) {
			const message = err instanceof Error ? err.message : "Could not generate outline.";
			const cached = loadSavedOutline(context.idea, context.discipline, context.topic, context.scope);
			setOutline(cached);
			setError(message);
			return cached;
		} finally {
			setLoading(false);
		}
	}, [context, hasTokens, setTokenQuota]);

	useEffect(() => {
		if (!context || outline || loading) return;
		void generateOutline();
	}, [context, outline, loading, generateOutline]);

	const handleRemove = useCallback(() => {
		if (!context) return;
		removeSavedOutline(context.idea, context.discipline, context.topic, context.scope);
		router.push(backHref);
	}, [context, router, backHref]);

	const openGeneratePage = useCallback(() => {
		if (!context || !outline || !hasTokens) return;
		const outlineReturnTo =
			typeof window !== "undefined"
				? `${window.location.pathname}${window.location.search}`
				: undefined;
		stageOutlinePageContext({
			idea: context.idea,
			discipline: context.discipline,
			topic: context.topic,
			scope: context.scope,
			returnTo: outlineReturnTo,
		});
		router.push(researchGeneratePagePath(key, isStudent ? "student" : "lecturer"));
	}, [context, outline, hasTokens, key, router, isStudent]);

	const btnPrimaryClass = isStudent
		? "stu-paper-btn stu-paper-btn-primary research-outline-generate-btn"
		: "saved-research-btn saved-research-btn-primary research-outline-generate-btn";

	const btnClass = isStudent ? "stu-paper-btn" : "saved-research-btn";
	const canGenerate = Boolean(outline?.trim()) && hasTokens;

	if (!key || !context) {
		return (
			<div className={`research-outline-page${isStudent ? " research-outline-page-student" : ""}`}>
				<Link href={researchPath} className={isStudent ? "stu-research-paper-back" : "saved-research-back"}>
					← Back to research
				</Link>
				<div className="saved-research-empty">
					<h2>Research outline not found</h2>
					<p>Open an outline from a research idea card to view it here.</p>
				</div>
			</div>
		);
	}

	return (
		<div className={`research-outline-page${isStudent ? " research-outline-page-student" : ""}`}>
			<div className="saved-research-top">
				<Link href={backHref} className={isStudent ? "stu-research-paper-back" : "saved-research-back"}>
					← Back
				</Link>
			</div>

			<header className="research-outline-page-head">
				<div>
					<p className="research-outline-page-eyebrow">Research outline</p>
					<h1 className="research-outline-page-title">{context.idea.title}</h1>
					<p className="research-outline-page-meta">
						{getDisciplineLabel(context.discipline)} · {context.topic}
					</p>
				</div>
			</header>

			<div className="research-outline-page-toolbar">
				<button
					type="button"
					className={btnPrimaryClass}
					onClick={openGeneratePage}
					disabled={!canGenerate}
					title={
						!outline?.trim()
							? "Outline is still generating"
							: !hasTokens
								? "Research token limit reached"
								: undefined
					}
				>
					<IconFileText size={14} />
					Generate Research
				</button>
				{outline && !loading ? (
					<div className="research-outline-page-actions">
						<button type="button" className={`${btnClass} research-outline-regen`} onClick={() => void generateOutline()}>
							<IconRefresh size={14} />
							Regenerate
						</button>
						<button type="button" className={`${btnClass} research-outline-remove`} onClick={handleRemove}>
							<IconTrash size={14} />
							Remove
						</button>
					</div>
				) : null}
			</div>

			<div className="research-outline-page-body">
				{loading && !outline ? (
					<div className="research-outline-loading" role="status">
						<span className="research-outline-spinner" aria-hidden />
						Searching literature and generating outline…
					</div>
				) : null}

				{error && !outline ? (
					<div className="research-outline-error" role="alert">
						<p>{error}</p>
						<p className="research-outline-error-hint">
							Make sure the backend is running with the latest code (`npm run dev:backend` or restart `npm start`).
						</p>
					</div>
				) : null}

				{error && outline ? (
					<div className="research-outline-error" role="alert">
						<p>{error}</p>
					</div>
				) : null}

				{outline ? (
					<div className="research-outline-markdown research-outline-page-markdown">
						<ReactMarkdown
							components={{
								a: ({ href, children }) => (
									<a href={href} target="_blank" rel="noopener noreferrer">
										{children}
									</a>
								),
							}}
						>
							{outline}
						</ReactMarkdown>
					</div>
				) : null}
			</div>
		</div>
	);
}

export function ResearchOutlinePage({ variant = "lecturer" }: Props) {
	const page = <ResearchOutlineContent variant={variant} />;

	if (variant === "student") {
		return <StudentLayout>{page}</StudentLayout>;
	}

	return <AulaLayout showRightPanel={false}>{page}</AulaLayout>;
}
