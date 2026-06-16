"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CitationStyleSelect } from "@/components/aula/CitationStyleSelect";
import { AulaLayout } from "@/components/AulaLayout";
import { StudentLayout } from "@/components/StudentLayout";
import { studentHasResearchTokens } from "@/components/StudentTokenQuota";
import { IconFileText } from "@/components/ui/ButtonIcon";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_CITATION_STYLE, type CitationStyle } from "@/lib/citation-styles";
import { getDisciplineLabel } from "@/lib/research-disciplines";
import { researchPaperWorkspacePath } from "@/lib/research-generate-routes";
import { peekOutlinePageContext, resolveOutlinePageContext } from "@/lib/research-outline-context";
import { loadSavedOutline } from "@/lib/research-outline-storage";
import { stagePendingResearchPaper } from "@/lib/research-paper-pending";

type Props = {
	variant?: "lecturer" | "student";
};

function ResearchGenerateContent({ variant = "lecturer" }: Props) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { user } = useAuth();
	const key = searchParams.get("key")?.trim() ?? "";
	const isStudent = variant === "student";
	const hasTokens = studentHasResearchTokens(user?.tokenQuota, user?.role);

	const [context, setContext] = useState(() => (key ? resolveOutlinePageContext(key) : null));
	const [outline, setOutline] = useState<string | null>(() =>
		key && context ? loadSavedOutline(context.idea, context.discipline, context.topic, context.scope) : null,
	);
	const [citationStyle, setCitationStyle] = useState<CitationStyle>(DEFAULT_CITATION_STYLE);

	const researchPath = isStudent ? "/student/research" : "/research";
	const backHref = context?.returnTo?.trim() || researchPath;
	const btnPrimaryClass = isStudent
		? "stu-paper-btn stu-paper-btn-primary research-generate-submit-btn"
		: "saved-research-btn saved-research-btn-primary research-generate-submit-btn";

	useEffect(() => {
		if (!key) return;
		const resolved = resolveOutlinePageContext(key) ?? peekOutlinePageContext(key);
		setContext(resolved);
		if (resolved) {
			setOutline(loadSavedOutline(resolved.idea, resolved.discipline, resolved.topic, resolved.scope));
		}
	}, [key]);

	const handleGenerate = () => {
		if (!context || !hasTokens) return;
		stagePendingResearchPaper({
			key,
			citationStyle,
			projectName: context.idea.title,
		});
		router.push(
			researchPaperWorkspacePath(context.idea.title, isStudent ? "student" : "lecturer", key),
		);
	};

	if (!key || !context) {
		return (
			<div className={`research-generate-page${isStudent ? " research-generate-page-student" : ""}`}>
				<Link href={researchPath} className={isStudent ? "stu-research-paper-back" : "saved-research-back"}>
					← Back to research
				</Link>
				<div className="saved-research-empty">
					<h2>Research idea not found</h2>
					<p>Open paper generation from a research idea card to continue.</p>
				</div>
			</div>
		);
	}

	return (
		<div className={`research-generate-page${isStudent ? " research-generate-page-student" : ""}`}>
			<div className="saved-research-top">
				<Link href={backHref} className={isStudent ? "stu-research-paper-back" : "saved-research-back"}>
					← Back
				</Link>
			</div>

			<header className="research-generate-page-head">
				<div>
					<p className="research-outline-page-eyebrow">Generate research paper</p>
					<h1 className="research-outline-page-title">{context.idea.title}</h1>
					<p className="research-outline-page-meta">
						{getDisciplineLabel(context.discipline)} · {context.topic}
					</p>
				</div>
			</header>

			<div className="research-generate-page-card">
				<p className="research-generate-modal-lead">
					Draft a full paper for <strong>{context.idea.title}</strong>. Choose how citations and references
					should be formatted.
				</p>

				<CitationStyleSelect id="research-generate-style" value={citationStyle} onChange={setCitationStyle} />

				<div className="research-generate-modal-outline-note">
					{outline?.trim() ? (
						<p>Your saved research outline will guide section structure, methodology, and literature themes.</p>
					) : (
						<p>
							No outline yet — one will be generated from arXiv literature on the next page, then used to draft
							the paper.
						</p>
					)}
				</div>

				<div className="research-generate-page-actions">
					<button
						type="button"
						className={btnPrimaryClass}
						onClick={handleGenerate}
						disabled={!hasTokens}
						title={!hasTokens ? "Research token limit reached" : undefined}
					>
						<IconFileText size={14} />
						Generate paper
					</button>
				</div>
			</div>
		</div>
	);
}

export function ResearchGeneratePage({ variant = "lecturer" }: Props) {
	const page = <ResearchGenerateContent variant={variant} />;

	if (variant === "student") {
		return <StudentLayout>{page}</StudentLayout>;
	}

	return <AulaLayout showRightPanel={false}>{page}</AulaLayout>;
}
