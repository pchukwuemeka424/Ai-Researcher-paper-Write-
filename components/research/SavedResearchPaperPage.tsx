"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

import { AulaLayout } from "@/components/AulaLayout";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StudentLayout } from "@/components/StudentLayout";
import {
	IconDownload,
	IconEdit,
	IconFileText,
	IconTrash,
} from "@/components/ui/ButtonIcon";
import { useAuth } from "@/hooks/useAuth";
import {
	downloadResearchPaper,
	extractPaperTitle,
	getSavedResearchPaperById,
	removeSavedPaper,
	updateSavedResearchPaper,
	type SavedResearchPaper,
} from "@/lib/chat-research-storage";
import { savedResearchListPath } from "@/lib/saved-research-routes";
import { formatResearchPaperReferences } from "@/lib/research-paper-references";

type ViewMode = "preview" | "edit";

type Props = {
	variant?: "lecturer" | "student";
};

function formatWhen(iso: string): string {
	try {
		return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
			new Date(iso),
		);
	} catch {
		return iso;
	}
}

function SavedResearchPaperContent({ variant = "lecturer" }: Props) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { user } = useAuth();
	const id = searchParams.get("id")?.trim() ?? "";
	const isStudent = variant === "student";

	const [paper, setPaper] = useState<SavedResearchPaper | null>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [mode, setMode] = useState<ViewMode>("preview");
	const [topic, setTopic] = useState("");
	const [content, setContent] = useState("");
	const [dirty, setDirty] = useState(false);
	const [saving, setSaving] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pendingDelete, setPendingDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const researchPath = isStudent ? "/student/research" : "/research";
	const savedListPath = savedResearchListPath(variant);
	const workspacePath = isStudent ? "/student/research/paper" : "/dashboard/chat";

	useEffect(() => {
		if (!id) {
			setLoading(false);
			setNotFound(true);
			setPaper(null);
			return;
		}
		setLoading(true);
		setNotFound(false);
		void getSavedResearchPaperById(id).then((loaded) => {
			if (!loaded) {
				setNotFound(true);
				setPaper(null);
			} else {
				setPaper(loaded);
				setTopic(loaded.topic);
				setContent(loaded.content);
				setDirty(false);
			}
			setLoading(false);
		});
	}, [id]);

	const formattedContent = useMemo(
		() => (content.trim() ? formatResearchPaperReferences(content) : ""),
		[content],
	);
	const displayTitle = extractPaperTitle(formattedContent || content, topic || "Research paper");

	const paperMeta = useMemo(
		() => ({
			author: user?.name ?? null,
			department: user?.department ?? null,
			affiliation: user?.institution ?? null,
			fallbackTopic: topic || null,
		}),
		[user?.name, user?.department, user?.institution, topic],
	);

	const handleSave = useCallback(async () => {
		if (!id || !dirty) return;
		setSaving(true);
		setError(null);
		const result = await updateSavedResearchPaper(id, { topic, content });
		setSaving(false);
		if (!result.paper) {
			setError(result.error ?? "Could not save changes.");
			return;
		}
		setPaper(result.paper);
		setTopic(result.paper.topic);
		setContent(result.paper.content);
		setDirty(false);
		setNotice("Changes saved.");
		window.setTimeout(() => setNotice(null), 4000);
	}, [id, dirty, topic, content]);

	const handleDownload = useCallback(() => {
		if (!content.trim()) return;
		void downloadResearchPaper(
			{
				id: id ?? "",
				topic,
				title: displayTitle,
				content,
				createdAt: paper?.createdAt ?? new Date().toISOString(),
				updatedAt: paper?.updatedAt ?? new Date().toISOString(),
			},
			paperMeta,
		);
	}, [content, displayTitle, id, paper?.createdAt, paper?.updatedAt, paperMeta, topic]);

	const handleDelete = useCallback(async () => {
		if (!id) return;
		setDeleting(true);
		const result = await removeSavedPaper(id, paper ? [paper] : []);
		setDeleting(false);
		setPendingDelete(false);
		if (!result.ok) {
			setError(result.error ?? "Could not delete saved research.");
			return;
		}
		router.push(researchPath);
	}, [id, paper, researchPath, router]);

	const btnClass = isStudent ? "stu-paper-btn" : "saved-research-btn";
	const btnPrimaryClass = isStudent
		? "stu-paper-btn stu-paper-btn-primary"
		: "saved-research-btn saved-research-btn-primary";

	if (loading) {
		return (
			<div className={`saved-research-page${isStudent ? " saved-research-page-student" : ""}`}>
				<p className="saved-research-muted">Loading saved research…</p>
			</div>
		);
	}

	if (notFound || !paper) {
		return (
			<div className={`saved-research-page${isStudent ? " saved-research-page-student" : ""}`}>
				<Link href={savedListPath} className={isStudent ? "stu-research-paper-back" : "saved-research-back"}>
					← Back to saved research
				</Link>
				<div className="saved-research-empty">
					<h2>Saved research not found</h2>
					<p>It may have been removed or you may not have access.</p>
				</div>
			</div>
		);
	}

	return (
		<div className={`saved-research-page${isStudent ? " saved-research-page-student" : ""}`}>
			<div className="saved-research-top">
				<Link href={savedListPath} className={isStudent ? "stu-research-paper-back" : "saved-research-back"}>
					← Back to saved research
				</Link>
			</div>

			<header className="saved-research-head">
				<div className="saved-research-head-main">
					<h1 className="saved-research-title">{displayTitle}</h1>
					<p className="saved-research-meta">
						Last updated {formatWhen(paper.updatedAt)}
						{dirty ? " · Unsaved changes" : ""}
					</p>
				</div>
				<div className="saved-research-head-actions">
					<div className="saved-research-mode-toggle" role="tablist" aria-label="View mode">
						<button
							type="button"
							role="tab"
							className={`saved-research-mode-btn${mode === "preview" ? " active" : ""}`}
							aria-selected={mode === "preview"}
							onClick={() => setMode("preview")}
						>
							<IconFileText size={14} />
							Preview
						</button>
						<button
							type="button"
							role="tab"
							className={`saved-research-mode-btn${mode === "edit" ? " active" : ""}`}
							aria-selected={mode === "edit"}
							onClick={() => setMode("edit")}
						>
							<IconEdit size={14} />
							Edit
						</button>
					</div>
					<button
						type="button"
						className={btnPrimaryClass}
						onClick={() => void handleSave()}
						disabled={!dirty || saving}
					>
						{saving ? "Saving…" : "Save changes"}
					</button>
					<button type="button" className={btnClass} onClick={handleDownload}>
						<IconDownload size={16} />
						Download PDF
					</button>
					<Link href={`${workspacePath}?topic=${encodeURIComponent(topic)}`} className={btnClass}>
						AI workspace
					</Link>
					<button
						type="button"
						className={`${btnClass} saved-research-btn-danger`}
						onClick={() => setPendingDelete(true)}
					>
						<IconTrash size={16} />
						Delete
					</button>
				</div>
			</header>

			{notice && <div className="saved-research-notice saved-research-notice-success">{notice}</div>}
			{error && (
				<div className="saved-research-notice saved-research-notice-error" role="alert">
					{error}
				</div>
			)}

			<div className="saved-research-card">
				{mode === "edit" ? (
					<div className="saved-research-edit">
						<label className="saved-research-field-label" htmlFor="saved-research-topic">
							Research topic
						</label>
						<input
							id="saved-research-topic"
							className="saved-research-topic-input"
							value={topic}
							onChange={(event) => {
								setTopic(event.target.value);
								setDirty(true);
							}}
						/>
						<label className="saved-research-field-label" htmlFor="saved-research-content">
							Paper content (Markdown)
						</label>
						<textarea
							id="saved-research-content"
							className="saved-research-editor"
							value={content}
							onChange={(event) => {
								setContent(event.target.value);
								setDirty(true);
							}}
							spellCheck
						/>
					</div>
				) : (
					<div className="saved-research-preview research-markdown-panel">
						<ReactMarkdown
							components={{
								a: ({ href, children }) => (
									<a href={href} target="_blank" rel="noopener noreferrer">
										{children}
									</a>
								),
							}}
						>
							{formattedContent || content}
						</ReactMarkdown>
					</div>
				)}
			</div>

			<ConfirmDialog
				open={pendingDelete}
				title="Delete saved research?"
				description={`“${displayTitle.slice(0, 120)}” will be permanently removed.`}
				confirmLabel="Delete"
				loading={deleting}
				onConfirm={() => void handleDelete()}
				onCancel={() => {
					if (deleting) return;
					setPendingDelete(false);
				}}
			/>
		</div>
	);
}

export function SavedResearchPaperPage({ variant = "lecturer" }: Props) {
	const page = <SavedResearchPaperContent variant={variant} />;

	if (variant === "student") {
		return <StudentLayout>{page}</StudentLayout>;
	}

	return <AulaLayout showRightPanel={false}>{page}</AulaLayout>;
}
