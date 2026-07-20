"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ComponentType } from "react";
import ReactMarkdown from "react-markdown";

import { AulaLayout } from "@/components/AulaLayout";
import { DepartmentSelect } from "@/components/lesson-planner/DepartmentSelect";
import { TeachingLevelSelect } from "@/components/lesson-planner/TeachingLevelSelect";
import {
	IconAlert,
	IconBook,
	IconCalendar,
	IconCheck,
	IconChevronDown,
	IconClipboard,
	IconClock,
	IconCopy,
	IconDownload,
	IconFileText,
	IconLayers,
	IconListChecks,
	IconPlus,
	IconPresentation,
	IconRefresh,
	IconSave,
	IconSparkles,
	IconTarget,
	IconUpload,
} from "@/components/lesson-planner/LessonPlannerIcons";
import { htmlHasText, ResearchDocEditor } from "@/components/research/ResearchDocEditor";
import {
	fetchCourseOutlineFromApi,
	fetchSavedCoursePlanFromApi,
	persistCoursePlanToApi,
} from "@/lib/lesson-planner-api";
import { saveLessonPlannerSession } from "@/lib/lesson-planner-session";
import { notifySavedLessonsChanged } from "@/lib/lesson-planner-storage";
import {
	getLessonOutputModeLabel,
	getSessionsForLevel,
	getTeachingLevelLabel,
	LESSON_OUTPUT_MODES,
	type LessonOutputMode,
} from "@/lib/lesson-planner";
import { htmlToOutlineText, markdownToDocHtml } from "@/lib/research-ideas";
import { downloadMarkdownAsPdf, researchPaperFilename } from "@/lib/research-paper-pdf";
import { getDisciplineLabel } from "@/lib/research-disciplines";
import type { TeachingLevelValue } from "@/components/lesson-planner/TeachingLevelSelect";

type EntryMode = "generate" | "own";

const MODE_ICONS: Record<LessonOutputMode, ComponentType<{ size?: number }>> = {
	outline: IconLayers,
	session: IconClock,
	activities: IconClipboard,
	rubric: IconListChecks,
};

const MAX_OUTLINE_FILE_BYTES = 750_000;
const OUTLINE_FILE_TYPES = ".md,.txt,.markdown,.text";

function titleFromFileName(name: string): string {
	return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

async function readOutlineFile(file: File): Promise<string> {
	if (file.size > MAX_OUTLINE_FILE_BYTES) {
		throw new Error("File is too large. Use a text or Markdown file under 750 KB.");
	}
	const lower = file.name.toLowerCase();
	const okExt = [".md", ".txt", ".markdown", ".text"].some((ext) => lower.endsWith(ext));
	const okMime =
		!file.type ||
		file.type.startsWith("text/") ||
		file.type === "application/markdown" ||
		file.type === "application/octet-stream";
	if (!okExt && !okMime) {
		throw new Error("Upload a Markdown (.md) or plain text (.txt) outline.");
	}
	const text = await file.text();
	const trimmed = text.trim();
	if (!trimmed) {
		throw new Error("That file is empty.");
	}
	return trimmed;
}

function GeneratingPanel({ mode, sessions }: { mode: LessonOutputMode; sessions: number | null }) {
	const label = getLessonOutputModeLabel(mode).toLowerCase();
	return (
		<div className="lp-state lp-state-loading" role="status" aria-live="polite">
			<div className="lp-spinner" aria-hidden />
			<p className="lp-state-title">Generating {label}…</p>
			<p className="lp-state-detail">
				{mode === "outline" && sessions
					? `Preparing a ${sessions}-session outline with outcomes, weekly topics, and assessment.`
					: mode === "session"
						? "Preparing a timed session structure with activities and formative checks."
						: mode === "activities"
							? "Preparing student tasks, extensions, and tutor notes."
							: "Preparing criteria, performance levels, and marking descriptors."}
			</p>
		</div>
	);
}

export function LessonPlanner() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const savedId = searchParams.get("saved");
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [title, setTitle] = useState("");
	const [department, setDepartment] = useState("");
	const [level, setLevel] = useState<TeachingLevelValue>("");
	const [mode, setMode] = useState<LessonOutputMode>("outline");
	const [entryMode, setEntryMode] = useState<EntryMode>("generate");
	const [ownOutlineHtml, setOwnOutlineHtml] = useState("");
	const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
	const [standards, setStandards] = useState("");
	const [sourceMaterial, setSourceMaterial] = useState("");
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [outline, setOutline] = useState<string | null>(null);
	const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [loadingSaved, setLoadingSaved] = useState(Boolean(savedId));
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [titleTouched, setTitleTouched] = useState(false);
	const [saveNotice, setSaveNotice] = useState<string | null>(null);

	const titleError = titleTouched && !title.trim();
	const sessions = level ? getSessionsForLevel(level) : null;
	const hasOutline = outline !== null;
	const modeMeta = LESSON_OUTPUT_MODES.find((m) => m.id === mode)!;
	const ModeIcon = MODE_ICONS[mode];

	const persistPlan = useCallback(
		async (outlineText: string, planId?: string | null) => {
			const saved = await persistCoursePlanToApi({
				id: planId ?? savedPlanId,
				title: title.trim(),
				department,
				level,
				outline: outlineText,
			});
			setSavedPlanId(saved.id);
			setSaveNotice("Saved to your library");
			notifySavedLessonsChanged();
			setTimeout(() => setSaveNotice(null), 2500);
			return saved;
		},
		[title, department, level, savedPlanId],
	);

	const saveSession = useCallback(
		(outlineText: string, planId?: string | null) => {
			if (!level) return;
			saveLessonPlannerSession({
				title: title.trim(),
				department,
				level,
				outline: outlineText,
				...(planId ?? savedPlanId ? { savedPlanId: planId ?? savedPlanId ?? undefined } : {}),
			});
		},
		[title, department, level, savedPlanId],
	);

	const openPresentation = useCallback(() => {
		if (!outline) return;
		saveSession(outline);
		const query = savedPlanId ? `?saved=${encodeURIComponent(savedPlanId)}` : "";
		router.push(`/lesson-planner/presentation${query}`);
	}, [outline, saveSession, savedPlanId, router]);

	const saveOutlineToLibrary = useCallback(
		async (outlineText: string) => {
			setTitleTouched(true);
			if (!outlineText.trim()) {
				setError("Add outline content before saving.");
				return false;
			}
			if (!title.trim()) {
				setError("Enter a course title before saving.");
				return false;
			}
			if (!department || !level) {
				setError("Select a department and teaching level before saving.");
				return false;
			}

			setLoading(true);
			setError(null);
			try {
				setOutline(outlineText);
				setMode("outline");
				saveSession(outlineText);
				const saved = await persistPlan(outlineText);
				saveSession(outlineText, saved.id);
				setOwnOutlineHtml(markdownToDocHtml(outlineText));
				return true;
			} catch (err) {
				setError(err instanceof Error ? err.message : "Could not save outline to your library.");
				return false;
			} finally {
				setLoading(false);
			}
		},
		[title, department, level, saveSession, persistPlan],
	);

	const generate = useCallback(async () => {
		setTitleTouched(true);
		if (!title.trim()) return;
		if (!department || !level) {
			setError("Select a department and teaching level before generating.");
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const result = await fetchCourseOutlineFromApi({
				title: title.trim(),
				department,
				level,
				mode,
				standards: standards.trim() || undefined,
				sourceMaterial: sourceMaterial.trim() || undefined,
			});
			setOutline(result);
			setOwnOutlineHtml(markdownToDocHtml(result));
			saveSession(result);
			try {
				const saved = await persistPlan(result);
				saveSession(result, saved.id);
			} catch (saveErr) {
				setError(
					saveErr instanceof Error
						? `${saveErr.message} Your outline is ready below — use Save to library to try again.`
						: "Outline generated, but saving to your library failed.",
				);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to generate teaching materials.");
			setOutline(null);
		} finally {
			setLoading(false);
		}
	}, [title, department, level, mode, standards, sourceMaterial, saveSession, persistPlan]);

	const saveOwnOutline = useCallback(async () => {
		const draft = htmlToOutlineText(ownOutlineHtml);
		if (!htmlHasText(ownOutlineHtml) || !draft) {
			setTitleTouched(true);
			setError("Paste or upload an outline before saving.");
			return;
		}
		await saveOutlineToLibrary(draft);
	}, [ownOutlineHtml, saveOutlineToLibrary]);

	const saveCurrentOutline = useCallback(async () => {
		if (entryMode === "own" && htmlHasText(ownOutlineHtml)) {
			await saveOwnOutline();
			return;
		}
		if (outline?.trim()) {
			await saveOutlineToLibrary(outline);
			return;
		}
		setError("Nothing to save yet.");
	}, [entryMode, ownOutlineHtml, outline, saveOwnOutline, saveOutlineToLibrary]);

	const handleOutlineFile = useCallback(
		async (file: File | null) => {
			if (!file) return;
			setError(null);
			try {
				const text = await readOutlineFile(file);
				setOwnOutlineHtml(markdownToDocHtml(text));
				setUploadedFileName(file.name);
				setEntryMode("own");
				if (!title.trim()) {
					setTitle(titleFromFileName(file.name));
					setTitleTouched(false);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Could not read that file.");
				if (fileInputRef.current) fileInputRef.current.value = "";
			}
		},
		[title],
	);

	const onOutlineFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] ?? null;
		void handleOutlineFile(file);
	};

	useEffect(() => {
		if (!savedId) {
			setLoadingSaved(false);
			return;
		}

		let cancelled = false;
		void (async () => {
			setLoadingSaved(true);
			const plan = await fetchSavedCoursePlanFromApi(savedId);
			if (cancelled) return;
			if (!plan) {
				setError("Could not load saved course plan.");
				setLoadingSaved(false);
				return;
			}

			setTitle(plan.title);
			setDepartment(plan.department);
			setLevel(plan.level);
			setOutline(plan.outline);
			setOwnOutlineHtml(markdownToDocHtml(plan.outline));
			setSavedPlanId(plan.id);
			setMode("outline");
			setEntryMode("own");
			saveLessonPlannerSession({
				title: plan.title,
				department: plan.department,
				level: plan.level,
				outline: plan.outline,
				savedPlanId: plan.id,
			});
			setLoadingSaved(false);
		})();

		return () => {
			cancelled = true;
		};
	}, [savedId]);

	const handleCopy = async () => {
		if (!outline) return;
		try {
			await navigator.clipboard.writeText(outline);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			/* clipboard unavailable */
		}
	};

	const handleDownload = () => {
		if (!outline) return;
		const slug = mode === "outline" ? "course-outline" : mode;
		void downloadMarkdownAsPdf(outline, researchPaperFilename(title, slug));
	};

	const startOver = () => {
		setOutline(null);
		setSavedPlanId(null);
		setError(null);
		setTitle("");
		setDepartment("");
		setLevel("");
		setStandards("");
		setSourceMaterial("");
		setOwnOutlineHtml("");
		setUploadedFileName(null);
		setEntryMode("generate");
		setTitleTouched(false);
		setShowAdvanced(false);
		if (fileInputRef.current) fileInputRef.current.value = "";
		router.replace("/lesson-planner");
	};

	return (
		<AulaLayout showRightPanel={false}>
			<div className="lp-page">
				<section className="lp-create-hero" aria-labelledby="lp-create-title">
					<div className="lp-create-hero-bg" aria-hidden />
					<div className="lp-create-hero-inner">
						<div className="lp-create-hero-copy">
							<p className="lp-create-eyebrow">Curriculum design</p>
							<h1 id="lp-create-title" className="lp-create-title">
								Lesson Planner
							</h1>
							<p className="lp-create-lead">
								Build a course outline, session plan, activity sheet, or marking rubric for your module
								and teaching level — or use an outline you already have.
							</p>
						</div>

						<div className="lp-entry-tabs" role="tablist" aria-label="How to start">
							<button
								type="button"
								role="tab"
								aria-selected={entryMode === "generate"}
								className={`lp-entry-tab${entryMode === "generate" ? " lp-entry-tab-active" : ""}`}
								onClick={() => {
									setEntryMode("generate");
									setError(null);
								}}
							>
								<IconSparkles size={16} />
								Generate
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={entryMode === "own"}
								className={`lp-entry-tab${entryMode === "own" ? " lp-entry-tab-active" : ""}`}
								onClick={() => {
									setEntryMode("own");
									setMode("outline");
									setError(null);
									if (!htmlHasText(ownOutlineHtml) && outline?.trim()) {
										setOwnOutlineHtml(markdownToDocHtml(outline));
									}
								}}
							>
								<IconUpload size={16} />
								Paste or upload outline
							</button>
						</div>

						<div className="lp-create-bar">
							<label className="sr-only" htmlFor="lesson-title">
								Course or topic title
							</label>
							<input
								id="lesson-title"
								className={`lp-create-input${titleError ? " lp-input-error" : ""}`}
								placeholder="Course or topic title — e.g. Introduction to Machine Learning"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								onKeyDown={(e) => {
									if (e.key !== "Enter" || loading) return;
									if (entryMode === "generate" && title.trim()) void generate();
									if (entryMode === "own" && htmlHasText(ownOutlineHtml)) void saveOwnOutline();
								}}
								autoFocus
							/>
							{entryMode === "generate" ? (
								<button
									type="button"
									className="lp-btn lp-btn-primary lp-create-go"
									onClick={() => void generate()}
									disabled={loading || loadingSaved || !title.trim()}
								>
									{loading ? (
										<>
											<span className="lp-btn-spinner" aria-hidden />
											Generating…
										</>
									) : (
										<>
											<IconSparkles size={18} />
											{hasOutline ? "Regenerate" : "Generate"}
										</>
									)}
								</button>
							) : (
								<button
									type="button"
									className="lp-btn lp-btn-primary lp-create-go"
									onClick={() => void saveOwnOutline()}
									disabled={loading || loadingSaved || !htmlHasText(ownOutlineHtml)}
								>
									{loading ? (
										<>
											<span className="lp-btn-spinner" aria-hidden />
											Saving…
										</>
									) : (
										<>
											<IconSave size={18} />
											{savedPlanId ? "Update saved outline" : "Save outline"}
										</>
									)}
								</button>
							)}
						</div>
						{titleError && <p className="lp-create-error">Enter a topic to continue.</p>}

						<div className="lp-create-meta">
							<div className="lp-create-meta-fields">
								<div className="lp-field lp-field-compact">
									<DepartmentSelect id="lesson-department" value={department} onChange={setDepartment} />
								</div>
								<div className="lp-field lp-field-compact">
									<TeachingLevelSelect id="lesson-level" value={level} onChange={setLevel} />
								</div>
							</div>
							<div className="lp-create-meta-actions">
								{sessions !== null && mode === "outline" && entryMode === "generate" && (
									<span className="lp-meta-pill">
										<IconCalendar size={14} />
										{sessions} sessions
									</span>
								)}
								<Link href="/lesson-planner/saved" className="lp-btn lp-btn-ghost lp-btn-sm">
									<IconBook size={16} />
									Saved courses
								</Link>
							</div>
						</div>
					</div>
				</section>

				{entryMode === "own" && (
					<section className="lp-own-outline" aria-labelledby="lp-own-outline-title">
						<div className="lp-own-outline-head">
							<div>
								<h2 id="lp-own-outline-title" className="lp-modes-title">
									Your outline
								</h2>
								<p className="lp-modes-lead">
									Edit like a Word document — paste from Word or Google Docs, or upload a .md / .txt file.
									Then save it to your library and optionally build a presentation.
								</p>
							</div>
							<div className="lp-own-outline-actions">
								<input
									ref={fileInputRef}
									type="file"
									accept={OUTLINE_FILE_TYPES}
									className="sr-only"
									id="lesson-outline-file"
									onChange={onOutlineFileChange}
								/>
								<label htmlFor="lesson-outline-file" className="lp-btn lp-btn-outline lp-btn-sm">
									<IconUpload size={16} />
									Upload file
								</label>
								<button
									type="button"
									className="lp-btn lp-btn-primary lp-btn-sm"
									onClick={() => void saveOwnOutline()}
									disabled={loading || loadingSaved || !htmlHasText(ownOutlineHtml)}
								>
									<IconSave size={16} />
									{savedPlanId ? "Update saved" : "Save outline"}
								</button>
								{htmlHasText(ownOutlineHtml) && (
									<button
										type="button"
										className="lp-btn lp-btn-ghost lp-btn-sm"
										onClick={() => {
											setOwnOutlineHtml("");
											setUploadedFileName(null);
											if (fileInputRef.current) fileInputRef.current.value = "";
										}}
									>
										Clear
									</button>
								)}
							</div>
						</div>

						{uploadedFileName && (
							<p className="lp-own-file-meta">
								<IconFileText size={14} />
								Loaded from <strong>{uploadedFileName}</strong>
							</p>
						)}

						<div
							className="lp-own-doc"
							onDragOver={(e) => {
								e.preventDefault();
								e.dataTransfer.dropEffect = "copy";
							}}
							onDrop={(e) => {
								e.preventDefault();
								const file = e.dataTransfer.files?.[0] ?? null;
								void handleOutlineFile(file);
							}}
						>
							<ResearchDocEditor
								value={ownOutlineHtml}
								placeholder="Paste or type your course outline here. Use the toolbar for headings, lists, and formatting…"
								ariaLabel="Editable course outline"
								minHeight="22rem"
								onChange={(html) => {
									setOwnOutlineHtml(html);
									setUploadedFileName(null);
								}}
							/>
						</div>
						<p className="lp-select-hint">
							Paste keeps formatting from Word and Docs. Drag a .md or .txt file onto the page to load it.
							Set department and teaching level, then click Save outline.
						</p>
					</section>
				)}

				{entryMode === "generate" && (
					<>
						<section className="lp-modes" aria-labelledby="lp-modes-title">
							<div className="lp-modes-head">
								<h2 id="lp-modes-title" className="lp-modes-title">
									What do you want to produce?
								</h2>
								<p className="lp-modes-lead">
									Select an output type. Add curriculum standards or your own notes under advanced options
									if needed.
								</p>
							</div>
							<div className="lp-mode-grid" role="radiogroup" aria-label="Output type">
								{LESSON_OUTPUT_MODES.map((item) => {
									const Icon = MODE_ICONS[item.id];
									const selected = mode === item.id;
									return (
										<button
											key={item.id}
											type="button"
											role="radio"
											aria-checked={selected}
											className={`lp-mode-card${selected ? " lp-mode-card-active" : ""}`}
											onClick={() => setMode(item.id)}
										>
											<span className="lp-mode-card-icon" aria-hidden>
												<Icon size={22} />
											</span>
											<span className="lp-mode-card-body">
												<span className="lp-mode-card-label">{item.label}</span>
												<span className="lp-mode-card-desc">{item.description}</span>
											</span>
											{selected && (
												<span className="lp-mode-card-check" aria-hidden>
													<IconCheck size={14} />
												</span>
											)}
										</button>
									);
								})}
							</div>
						</section>

						<section className="lp-advanced">
							<button
								type="button"
								className="lp-advanced-toggle"
								aria-expanded={showAdvanced}
								onClick={() => setShowAdvanced((v) => !v)}
							>
								<span className="lp-advanced-toggle-main">
									<IconTarget size={18} />
									Standards and source materials
								</span>
								<IconChevronDown size={16} className={showAdvanced ? "lp-chevron-open" : undefined} />
							</button>
							{showAdvanced && (
								<div className="lp-advanced-body">
									<div className="lp-field">
										<label className="lp-label" htmlFor="lesson-standards">
											Curriculum / standards
										</label>
										<textarea
											id="lesson-standards"
											className="lp-textarea"
											rows={3}
											placeholder="e.g. QAA Subject Benchmark statements, module ILOs, PSRB competencies…"
											value={standards}
											onChange={(e) => setStandards(e.target.value)}
										/>
										<p className="lp-select-hint">
											Optional. Outcomes and activities will reference these where relevant.
										</p>
									</div>
									<div className="lp-field" style={{ marginBottom: 0 }}>
										<label className="lp-label" htmlFor="lesson-source">
											Existing notes or syllabus
										</label>
										<textarea
											id="lesson-source"
											className="lp-textarea"
											rows={4}
											placeholder="Paste a syllabus extract, lecture notes, or an existing lesson plan…"
											value={sourceMaterial}
											onChange={(e) => setSourceMaterial(e.target.value)}
										/>
										<p className="lp-select-hint">
											<IconUpload size={12} /> Optional. Used as grounding so the draft matches your
											module.
										</p>
									</div>
								</div>
							)}
						</section>
					</>
				)}

				<section className="lp-panel lp-panel-result" aria-labelledby="outline-result-title">
					<div className="lp-panel-head lp-panel-head-row">
						<div className="lp-panel-head-main">
							<div className="lp-panel-head-icon lp-panel-head-icon-accent" aria-hidden>
								<ModeIcon size={20} />
							</div>
							<div>
								<h2 id="outline-result-title" className="lp-panel-title">
									{entryMode === "own" ? "Course outline" : modeMeta.label}
								</h2>
								{hasOutline && level ? (
									<p className="lp-panel-subtitle">
										{title} · {getDisciplineLabel(department)} · {getTeachingLevelLabel(level)}
										{saveNotice && <span className="lp-save-notice">{saveNotice}</span>}
									</p>
								) : (
									<p className="lp-panel-subtitle">
										{entryMode === "own"
											? "Your outline will appear here after you use it"
											: "Generated content will appear here"}
									</p>
								)}
							</div>
						</div>

						{hasOutline && !loading && !loadingSaved && (
							<div className="lp-toolbar">
								<button
									type="button"
									className="lp-btn lp-btn-primary lp-btn-sm"
									onClick={() => void saveCurrentOutline()}
								>
									<IconSave size={16} />
									{savedPlanId ? "Update library" : "Save to library"}
								</button>
								{(mode === "outline" || entryMode === "own") && (
									<button type="button" className="lp-btn lp-btn-outline lp-btn-sm" onClick={openPresentation}>
										<IconPresentation size={16} />
										Open presentation
									</button>
								)}
								<button type="button" className="lp-btn lp-btn-outline lp-btn-sm" onClick={() => void handleCopy()}>
									{copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
									{copied ? "Copied" : "Copy"}
								</button>
								<button type="button" className="lp-btn lp-btn-outline lp-btn-sm" onClick={handleDownload}>
									<IconDownload size={16} />
									PDF
								</button>
								<button type="button" className="lp-btn lp-btn-ghost lp-btn-sm" onClick={startOver}>
									<IconPlus size={16} />
									New
								</button>
							</div>
						)}
					</div>

					<div className="lp-panel-body">
						{(loading || loadingSaved) && entryMode === "generate" && (
							<GeneratingPanel mode={mode} sessions={sessions} />
						)}
						{(loading || loadingSaved) && entryMode === "own" && (
							<div className="lp-state lp-state-loading" role="status" aria-live="polite">
								<div className="lp-spinner" aria-hidden />
								<p className="lp-state-title">{loadingSaved ? "Loading outline…" : "Saving outline…"}</p>
							</div>
						)}

						{error && !loading && !loadingSaved && (
							<div className="lp-state lp-state-error">
								<div className="lp-state-icon" aria-hidden>
									<IconAlert size={24} />
								</div>
								<h3 className="lp-state-title">
									{entryMode === "own" ? "Could not save outline" : "Could not generate"}
								</h3>
								<p className="lp-state-detail">{error}</p>
								{!savedId && entryMode === "generate" && (
									<button type="button" className="lp-btn lp-btn-primary" onClick={() => void generate()}>
										<IconRefresh size={18} />
										Try again
									</button>
								)}
								{entryMode === "own" && htmlHasText(ownOutlineHtml) && (
									<button type="button" className="lp-btn lp-btn-primary" onClick={() => void saveOwnOutline()}>
										<IconSave size={18} />
										Save outline
									</button>
								)}
								{entryMode === "generate" && hasOutline && (
									<button type="button" className="lp-btn lp-btn-outline" onClick={() => void saveCurrentOutline()}>
										<IconSave size={18} />
										Save to library
									</button>
								)}
							</div>
						)}

						{!loading && !loadingSaved && !error && !hasOutline && (
							<div className="lp-state lp-state-empty">
								<div className="lp-empty-visual" aria-hidden>
									<div className="lp-empty-ring">
										{entryMode === "own" ? <IconUpload size={36} /> : <ModeIcon size={36} />}
									</div>
								</div>
								<h3 className="lp-state-title">No output yet</h3>
								<p className="lp-state-detail">
										{entryMode === "own"
										? "Paste or type in the document editor, set department and teaching level, then click Save outline."
										: `Enter a title, select department and teaching level, choose ${modeMeta.label.toLowerCase()}, then generate.`}
								</p>
								<ul className="lp-feature-list">
									<li className="lp-feature-item">
										<span className="lp-feature-icon" aria-hidden>
											<IconFileText size={16} />
										</span>
										{entryMode === "own" ? "Word-style editing and paste" : "Structured Markdown ready to edit"}
									</li>
									<li className="lp-feature-item">
										<span className="lp-feature-icon" aria-hidden>
											<IconSave size={16} />
										</span>
										{entryMode === "own" ? "Save pasted or uploaded outlines" : "Calibrated to teaching level"}
									</li>
									<li className="lp-feature-item">
										<span className="lp-feature-icon" aria-hidden>
											<IconPresentation size={16} />
										</span>
										Outlines can become slide decks
									</li>
								</ul>
							</div>
						)}

						{hasOutline && !loading && !loadingSaved && (
							<article className="lp-document">
								<ReactMarkdown>{outline}</ReactMarkdown>
							</article>
						)}
					</div>
				</section>
			</div>
		</AulaLayout>
	);
}
