"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import { NavIcon } from "@/components/aula/NavIcon";
import { AulaLayout } from "@/components/AulaLayout";
import { DepartmentSelect } from "@/components/lesson-planner/DepartmentSelect";
import { TeachingLevelSelect } from "@/components/lesson-planner/TeachingLevelSelect";
import {
	IconAlert,
	IconBook,
	IconCalendar,
	IconCheck,
	IconCopy,
	IconDownload,
	IconLayers,
	IconPlus,
	IconPresentation,
	IconRefresh,
	IconSparkles,
	IconTarget,
} from "@/components/lesson-planner/LessonPlannerIcons";
import {
	fetchCourseOutlineFromApi,
	fetchSavedCoursePlanFromApi,
	persistCoursePlanToApi,
} from "@/lib/lesson-planner-api";
import { saveLessonPlannerSession } from "@/lib/lesson-planner-session";
import { notifySavedLessonsChanged } from "@/lib/lesson-planner-storage";
import {
	getSessionsForLevel,
	getTeachingLevelLabel,
} from "@/lib/lesson-planner";
import { downloadMarkdownAsPdf, researchPaperFilename } from "@/lib/research-paper-pdf";
import { getDisciplineLabel } from "@/lib/research-disciplines";
import type { TeachingLevelValue } from "@/components/lesson-planner/TeachingLevelSelect";

function GeneratingPanel({ sessions }: { sessions: number }) {
	return (
		<div className="lp-state lp-state-loading" role="status" aria-live="polite">
			<div className="lp-spinner" aria-hidden />
			<p className="lp-state-title">Generating course outline…</p>
			<p className="lp-state-detail">
				Building a {sessions}-session outline with outcomes, weekly topics, and assessment for your level.
			</p>
		</div>
	);
}

const OUTLINE_FEATURES = [
	{ icon: IconCalendar, label: "Weekly session map" },
	{ icon: IconTarget, label: "Learning outcomes" },
	{ icon: IconLayers, label: "Assessment strategy" },
] as const;

export function LessonPlanner() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const savedId = searchParams.get("saved");

	const [title, setTitle] = useState("");
	const [department, setDepartment] = useState("");
	const [level, setLevel] = useState<TeachingLevelValue>("");
	const [outline, setOutline] = useState<string | null>(null);
	const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [loadingSaved, setLoadingSaved] = useState(Boolean(savedId));
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [titleTouched, setTitleTouched] = useState(false);
	const [saveNotice, setSaveNotice] = useState<string | null>(null);

	const titleError = titleTouched && !title.trim();
	const formReady = Boolean(title.trim() && department && level);
	const sessions = level ? getSessionsForLevel(level) : null;
	const hasOutline = outline !== null;
	const step = hasOutline ? 3 : loading || loadingSaved ? 2 : 1;

	const persistPlan = useCallback(
		async (outlineText: string, planId?: string | null) => {
			const saved = await persistCoursePlanToApi({
				id: planId ?? savedPlanId,
				title: title.trim(),
				department,
				level,
				outline: outlineText,
			});
			if (saved) {
				setSavedPlanId(saved.id);
				setSaveNotice("Saved to your library");
				notifySavedLessonsChanged();
				setTimeout(() => setSaveNotice(null), 2500);
			}
			return saved;
		},
		[title, department, level, savedPlanId],
	);

	const saveSession = useCallback(
		(outlineText: string, planId?: string | null) => {
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

	const generate = useCallback(async () => {
		setTitleTouched(true);
		if (!title.trim() || !department || !level) return;

		setLoading(true);
		setError(null);
		try {
			const result = await fetchCourseOutlineFromApi({
				title: title.trim(),
				department,
				level,
			});
			setOutline(result);
			saveSession(result);
			const saved = await persistPlan(result);
			if (saved) saveSession(result, saved.id);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to generate course outline.");
			setOutline(null);
		} finally {
			setLoading(false);
		}
	}, [title, department, level, saveSession, persistPlan]);

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
			setSavedPlanId(plan.id);
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
		void downloadMarkdownAsPdf(outline, researchPaperFilename(title, "course-outline"));
	};

	const startOver = () => {
		setOutline(null);
		setSavedPlanId(null);
		setError(null);
		setTitle("");
		setDepartment("");
		setLevel("");
		setTitleTouched(false);
		router.replace("/lesson-planner");
	};

	return (
		<AulaLayout showRightPanel={false}>
			<div className="lp-page">
				<header className="lp-page-header">
					<div className="lp-page-header-start">
						<div className="lp-page-icon" aria-hidden>
							<NavIcon id="lesson-planner" size={24} />
						</div>
						<div>
							<p className="lp-page-eyebrow">Curriculum design</p>
							<h1 className="lp-page-title">Lesson Planner</h1>
							<p className="lp-page-lead">
								Enter a course title and teaching level to generate a full semester outline with weekly
								sessions, outcomes, and assessment.
							</p>
						</div>
					</div>
					<div className="lp-page-actions">
						<Link href="/lesson-planner/saved" className="lp-btn lp-btn-outline lp-btn-sm">
							<IconBook size={16} />
							Saved courses
						</Link>
					</div>
				</header>

				<ol className="lp-steps-card" aria-label="Progress">
					<li className={`lp-step${step >= 1 ? " lp-step-active" : ""}${step > 1 ? " lp-step-done" : ""}`}>
						<span className="lp-step-num">{step > 1 ? <IconCheck size={12} /> : "1"}</span>
						<span className="lp-step-label">Configure</span>
					</li>
					<li className="lp-step-line" aria-hidden />
					<li className={`lp-step${step >= 2 ? " lp-step-active" : ""}${step > 2 ? " lp-step-done" : ""}`}>
						<span className="lp-step-num">{step > 2 ? <IconCheck size={12} /> : "2"}</span>
						<span className="lp-step-label">Generate</span>
					</li>
					<li className="lp-step-line" aria-hidden />
					<li className={`lp-step${step >= 3 ? " lp-step-active" : ""}`}>
						<span className="lp-step-num">3</span>
						<span className="lp-step-label">Export</span>
					</li>
				</ol>

				<div className="lp-workspace">
					<aside className="lp-panel lp-panel-form" aria-labelledby="outline-form-title">
						<div className="lp-panel-head">
							<div className="lp-panel-head-icon" aria-hidden>
								<IconBook size={20} />
							</div>
							<div>
								<h2 id="outline-form-title" className="lp-panel-title">
									Course details
								</h2>
								<p className="lp-panel-subtitle">
									{sessions
										? `${sessions} sessions for ${getTeachingLevelLabel(level).toLowerCase()}`
										: "Select department and teaching level to configure your outline"}
								</p>
							</div>
						</div>

						<div className="lp-panel-body">
							<div className="lp-field">
								<label className="lp-label" htmlFor="lesson-title">
									Course title
								</label>
								<input
									id="lesson-title"
									className={`lp-input${titleError ? " lp-input-error" : ""}`}
									placeholder="e.g. Introduction to Machine Learning"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !loading) void generate();
									}}
									autoFocus
								/>
								{titleError && <p className="lp-field-error">Please enter a title.</p>}
							</div>

							<div className="lp-field-row">
								<div className="lp-field">
									<DepartmentSelect id="lesson-department" value={department} onChange={setDepartment} />
								</div>
								<div className="lp-field">
									<TeachingLevelSelect id="lesson-level" value={level} onChange={setLevel} />
								</div>
							</div>

							<button
								type="button"
								className="lp-btn lp-btn-primary lp-btn-block"
								onClick={() => void generate()}
								disabled={loading || loadingSaved || !formReady}
							>
								{loading ? (
									<>
										<span className="lp-btn-spinner" aria-hidden />
										Generating…
									</>
								) : hasOutline ? (
									<>
										<IconRefresh size={18} />
										Regenerate outline
									</>
								) : (
									<>
										<IconSparkles size={18} />
										Generate course outline
									</>
								)}
							</button>
						</div>
					</aside>

					<section className="lp-panel lp-panel-result" aria-labelledby="outline-result-title">
						<div className="lp-panel-head lp-panel-head-row">
							<div className="lp-panel-head-main">
								<div className="lp-panel-head-icon lp-panel-head-icon-accent" aria-hidden>
									<IconLayers size={20} />
								</div>
								<div>
									<h2 id="outline-result-title" className="lp-panel-title">
										Course outline
									</h2>
									{hasOutline ? (
										<p className="lp-panel-subtitle">
											{title} · {getDisciplineLabel(department)} · {getTeachingLevelLabel(level)}
											{saveNotice && <span className="lp-save-notice">{saveNotice}</span>}
										</p>
									) : (
										<p className="lp-panel-subtitle">Your generated outline appears here</p>
									)}
								</div>
							</div>

							{hasOutline && !loading && !loadingSaved && (
								<div className="lp-toolbar">
									<button type="button" className="lp-btn lp-btn-primary lp-btn-sm" onClick={openPresentation}>
										<IconPresentation size={16} />
										Open presentation
									</button>
									<button type="button" className="lp-btn lp-btn-outline lp-btn-sm" onClick={() => void handleCopy()}>
										{copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
										{copied ? "Copied" : "Copy"}
									</button>
									<button type="button" className="lp-btn lp-btn-outline lp-btn-sm" onClick={handleDownload}>
										<IconDownload size={16} />
										Download PDF
									</button>
									<button type="button" className="lp-btn lp-btn-ghost lp-btn-sm" onClick={startOver}>
										<IconPlus size={16} />
										New course
									</button>
								</div>
							)}
						</div>

						<div className="lp-panel-body">
							{(loading || loadingSaved) && sessions !== null && <GeneratingPanel sessions={sessions} />}

							{error && !loading && !loadingSaved && (
								<div className="lp-state lp-state-error">
									<div className="lp-state-icon" aria-hidden>
										<IconAlert size={24} />
									</div>
									<h3 className="lp-state-title">Could not generate outline</h3>
									<p className="lp-state-detail">{error}</p>
									{!savedId && (
										<button type="button" className="lp-btn lp-btn-primary" onClick={() => void generate()}>
											<IconRefresh size={18} />
											Try again
										</button>
									)}
								</div>
							)}

							{!loading && !loadingSaved && !error && !hasOutline && (
								<div className="lp-state lp-state-empty">
									<div className="lp-empty-visual" aria-hidden>
										<div className="lp-empty-ring">
											<NavIcon id="lesson-planner" size={36} />
										</div>
									</div>
									<h3 className="lp-state-title">Your outline will appear here</h3>
									<p className="lp-state-detail">
										Enter a course title, choose your department and level, then generate a full outline with
										weekly sessions, learning outcomes, and assessment.
									</p>
									<ul className="lp-feature-list">
										{OUTLINE_FEATURES.map(({ icon: FeatureIcon, label }) => (
											<li key={label} className="lp-feature-item">
												<span className="lp-feature-icon" aria-hidden>
													<FeatureIcon size={16} />
												</span>
												{label}
											</li>
										))}
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
			</div>
		</AulaLayout>
	);
}
