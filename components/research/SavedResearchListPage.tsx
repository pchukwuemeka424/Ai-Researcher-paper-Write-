"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { NavIcon } from "@/components/aula/NavIcon";
import { AulaLayout } from "@/components/AulaLayout";
import { StudentLayout } from "@/components/StudentLayout";
import { IconFileText, IconLightbulb, IconSparkles } from "@/components/ui/ButtonIcon";
import {
	loadAllSavedPapers,
	removeSavedPaper,
	SAVED_RESEARCH_CHANGED,
	type SavedResearchPaper,
} from "@/lib/chat-research-storage";
import { extractPaperTitle } from "@/lib/research-paper-title";
import { loadAllSavedIdeas } from "@/lib/research-storage";
import { savedResearchListPath, savedResearchPagePath } from "@/lib/saved-research-routes";

type Props = {
	variant?: "lecturer" | "student";
};

function formatWhen(iso: string): string {
	try {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(new Date(iso));
	} catch {
		return iso;
	}
}

function SavedResearchListContent({ variant = "lecturer" }: Props) {
	const isStudent = variant === "student";
	const researchPath = isStudent ? "/student/research" : "/research";
	const [papers, setPapers] = useState<SavedResearchPaper[]>([]);
	const [savedIdeaCount, setSavedIdeaCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [removingId, setRemovingId] = useState<string | null>(null);

	const loadResearch = useCallback(async () => {
		setLoading(true);
		const [paperRows, ideas] = await Promise.all([loadAllSavedPapers(), loadAllSavedIdeas()]);
		setPapers(paperRows);
		setSavedIdeaCount(ideas.length);
		setLoading(false);
	}, []);

	useEffect(() => {
		void loadResearch();
	}, [loadResearch]);

	useEffect(() => {
		const onChanged = () => {
			void loadResearch();
		};
		window.addEventListener(SAVED_RESEARCH_CHANGED, onChanged);
		return () => window.removeEventListener(SAVED_RESEARCH_CHANGED, onChanged);
	}, [loadResearch]);

	const sortedPapers = useMemo(
		() => [...papers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
		[papers],
	);

	const handleRemove = async (id: string) => {
		setRemovingId(id);
		const result = await removeSavedPaper(id, papers);
		setPapers(result.papers);
		setRemovingId(null);
	};

	return (
		<div className={`research-page sc-saved-page${isStudent ? " research-page-student" : ""}`}>
			<header className="research-page-header">
				<div className="research-page-header-start">
					<div className="research-page-icon" aria-hidden>
						<NavIcon id="folder" size={24} />
					</div>
					<div>
						<p className="research-page-eyebrow">Your library</p>
						<h1 className="research-page-title">Saved research</h1>
						<p className="research-page-lead">
							Open generated papers and bookmarked ideas from Research Assistant.
						</p>
					</div>
				</div>
				<div className="research-page-actions">
					<Link href={researchPath} className="research-btn research-btn-outline research-btn-sm">
						<IconSparkles size={16} />
						New research
					</Link>
				</div>
			</header>

			<div className="sc-saved-body">
				{loading && (
					<div className="lp-state lp-state-loading" role="status">
						<div className="lp-spinner" aria-hidden />
						<p className="lp-state-title">Loading saved research…</p>
					</div>
				)}

				{!loading && sortedPapers.length === 0 && savedIdeaCount === 0 && (
					<div className="sc-saved-empty">
						<div className="sc-saved-empty-icon" aria-hidden>
							<NavIcon id="folder" size={32} />
						</div>
						<h2>No saved research yet</h2>
						<p>Generated papers and bookmarked ideas from Research Assistant will appear here.</p>
						<Link href={researchPath} className="research-btn research-btn-outline">
							<IconSparkles size={16} />
							Start researching
						</Link>
					</div>
				)}

				{!loading && sortedPapers.length > 0 && (
					<section className="sc-saved-section">
						<h2 className="sc-saved-section-title">
							<IconFileText size={16} />
							Research papers
						</h2>
						<ul className="sc-saved-list">
							{sortedPapers.map((paper) => {
								const title = extractPaperTitle(paper.content, paper.topic);
								const href = savedResearchPagePath(paper.id, variant);

								return (
									<li key={paper.id} className="sc-saved-row">
										<div className="sc-saved-row-main">
											<Link href={href} className="sc-saved-row-title">
												{title}
											</Link>
											<p className="sc-saved-row-meta">{paper.topic}</p>
											<p className="sc-saved-row-date">Updated {formatWhen(paper.updatedAt)}</p>
										</div>
										<div className="sc-saved-row-actions">
											<Link href={href} className="sc-saved-action">
												Open
											</Link>
											<button
												type="button"
												className="sc-saved-remove"
												disabled={removingId === paper.id}
												aria-label={`Remove ${title}`}
												onClick={() => void handleRemove(paper.id)}
											>
												{removingId === paper.id ? "…" : "Remove"}
											</button>
										</div>
									</li>
								);
							})}
						</ul>
					</section>
				)}

				{!loading && savedIdeaCount > 0 && (
					<section className="sc-saved-section">
						<h2 className="sc-saved-section-title">
							<IconLightbulb size={16} />
							Saved ideas
						</h2>
						<div className="sc-saved-ideas-card">
							<p className="sc-saved-ideas-copy">
								You have {savedIdeaCount} bookmarked {savedIdeaCount === 1 ? "idea" : "ideas"} in Research
								Assistant.
							</p>
							<Link href={`${researchPath}?view=saved`} className="sc-saved-action">
								View saved ideas
							</Link>
						</div>
					</section>
				)}

				{!loading && isStudent && (
					<section className="sc-saved-section">
						<div className="sc-saved-ideas-card">
							<p className="sc-saved-ideas-copy">Browse your topic generation history in Research Assistant.</p>
							<Link href={`${researchPath}?view=history`} className="sc-saved-action">
								View history
							</Link>
						</div>
					</section>
				)}
			</div>
		</div>
	);
}

export function SavedResearchListPage({ variant = "lecturer" }: Props) {
	const page = <SavedResearchListContent variant={variant} />;

	if (variant === "student") {
		return <StudentLayout>{page}</StudentLayout>;
	}

	return <AulaLayout showRightPanel={false}>{page}</AulaLayout>;
}
