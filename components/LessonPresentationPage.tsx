"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AulaLayout } from "@/components/AulaLayout";
import { CoursePresentationPanel } from "@/components/lesson-planner/CoursePresentation";
import {
	IconArrowLeft,
	IconDownload,
	IconPresentation,
	IconRefresh,
	IconSparkles,
} from "@/components/lesson-planner/LessonPlannerIcons";
import { fetchCoursePresentationFromApi } from "@/lib/lesson-presentation-api";
import type { CoursePresentation } from "@/lib/lesson-presentation";
import {
	fetchSavedCoursePlanFromApi,
	persistCoursePlanToApi,
} from "@/lib/lesson-planner-api";
import {
	readLessonPlannerSession,
	saveLessonPlannerSession,
	type LessonPlannerSession,
} from "@/lib/lesson-planner-session";
import { notifySavedLessonsChanged } from "@/lib/lesson-planner-storage";
import { getTeachingLevelLabel } from "@/lib/lesson-planner";
import { downloadPresentationPdf } from "@/lib/presentation-pdf";
import { getDisciplineLabel } from "@/lib/research-disciplines";

export function LessonPresentationPage() {
	const searchParams = useSearchParams();
	const savedId = searchParams.get("saved");

	const [session, setSession] = useState<LessonPlannerSession | null>(null);
	const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
	const [sessionReady, setSessionReady] = useState(false);
	const [presentation, setPresentation] = useState<CoursePresentation | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saveNotice, setSaveNotice] = useState<string | null>(null);
	const [exportingPdf, setExportingPdf] = useState(false);

	const persistPresentation = useCallback(
		async (context: LessonPlannerSession, deck: CoursePresentation, planId?: string | null) => {
			const saved = await persistCoursePlanToApi({
				id: planId ?? savedPlanId ?? context.savedPlanId,
				title: context.title,
				department: context.department,
				level: context.level,
				outline: context.outline,
				presentation: deck,
			});
			if (saved) {
				setSavedPlanId(saved.id);
				setSaveNotice("Course preparation saved");
				notifySavedLessonsChanged();
				setTimeout(() => setSaveNotice(null), 2500);
			}
		},
		[savedPlanId],
	);

	const handlePresentationChange = useCallback(
		(deck: CoursePresentation) => {
			setPresentation(deck);
			if (session) void persistPresentation(session, deck, savedPlanId);
		},
		[session, savedPlanId, persistPresentation],
	);

	const generatePresentation = useCallback(
		async (context: LessonPlannerSession, planId?: string | null) => {
			setLoading(true);
			setError(null);
			setPresentation(null);
			try {
				const deck = await fetchCoursePresentationFromApi({
					title: context.title,
					department: context.department,
					level: context.level,
					outline: context.outline,
				});
				let mergedDeck: CoursePresentation | null = null;
				setPresentation((prev) => {
					mergedDeck = {
						...deck,
						slides: deck.slides.map((slide, index) => ({
							...slide,
							imageUrl: prev?.slides[index]?.imageUrl ?? null,
						})),
					};
					return mergedDeck;
				});
				if (mergedDeck) await persistPresentation(context, mergedDeck, planId);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to generate presentation.");
			} finally {
				setLoading(false);
			}
		},
		[persistPresentation],
	);

	useEffect(() => {
		let cancelled = false;

		void (async () => {
			if (savedId) {
				const plan = await fetchSavedCoursePlanFromApi(savedId);
				if (cancelled) return;
				if (!plan) {
					setSessionReady(true);
					setError("Could not load saved course plan.");
					return;
				}

				const nextSession: LessonPlannerSession = {
					title: plan.title,
					department: plan.department,
					level: plan.level,
					outline: plan.outline,
					savedPlanId: plan.id,
				};
				setSession(nextSession);
				setSavedPlanId(plan.id);
				saveLessonPlannerSession(nextSession);

				if (plan.presentation) {
					setPresentation(plan.presentation);
					setSessionReady(true);
					return;
				}

				setSessionReady(true);
				void generatePresentation(nextSession, plan.id);
				return;
			}

			const stored = readLessonPlannerSession();
			setSession(stored);
			setSavedPlanId(stored?.savedPlanId ?? null);
			setSessionReady(true);
		})();

		return () => {
			cancelled = true;
		};
	}, [savedId, generatePresentation]);

	useEffect(() => {
		if (!sessionReady || !session || savedId) return;
		void generatePresentation(session);
	}, [sessionReady, session, savedId, generatePresentation]);

	const handleExportPdf = async () => {
		if (!presentation) return;
		setExportingPdf(true);
		try {
			await downloadPresentationPdf(presentation);
		} finally {
			setExportingPdf(false);
		}
	};

	const slideCount = presentation?.slides.length ?? 0;

	if (!sessionReady) {
		return (
			<AulaLayout showRightPanel={false}>
				<div className="lp-page">
					<div className="lp-state lp-state-loading" role="status" aria-live="polite">
						<div className="lp-spinner" aria-hidden />
						<p className="lp-state-title">Loading presentation…</p>
					</div>
				</div>
			</AulaLayout>
		);
	}

	if (!session) {
		return (
			<AulaLayout showRightPanel={false}>
				<div className="lp-page">
					<header className="lp-hero lp-hero-compact">
						<div className="lp-hero-bg" aria-hidden />
						<div className="lp-hero-inner">
							<div className="lp-hero-main">
								<div className="lp-hero-icon" aria-hidden>
									<IconPresentation size={24} />
								</div>
								<div className="lp-hero-copy">
									<h1 className="lp-hero-title">Course presentation</h1>
									<p className="lp-hero-lead">
										Generate a course outline first, then open the presentation from the lesson planner.
									</p>
								</div>
							</div>
						</div>
					</header>

					<div className="lp-panel">
						<div className="lp-panel-body">
							<div className="lp-state lp-state-empty">
								<div className="lp-empty-visual" aria-hidden>
									<div className="lp-empty-ring">
										<IconPresentation size={32} />
									</div>
								</div>
								<h3 className="lp-state-title">No course outline found</h3>
								<p className="lp-state-detail">
									Create an outline on the lesson planner, then return here to build your slides.
								</p>
								<Link href="/lesson-planner" className="lp-btn lp-btn-primary">
									<IconArrowLeft size={18} />
									Go to lesson planner
								</Link>
							</div>
						</div>
					</div>
				</div>
			</AulaLayout>
		);
	}

	return (
		<AulaLayout showRightPanel={false}>
			<div className="lp-page">
				<header className="lp-hero">
					<div className="lp-hero-bg" aria-hidden />
					<div className="lp-hero-inner">
						<div className="lp-hero-main">
							<div className="lp-hero-icon" aria-hidden>
								<IconPresentation size={24} />
							</div>
							<div className="lp-hero-copy">
								<span className="lp-badge">
									<IconSparkles size={14} />
									Slide deck
								</span>
								<h1 className="lp-hero-title">{session.title}</h1>
								<p className="lp-hero-lead">
									{getDisciplineLabel(session.department)} · {getTeachingLevelLabel(session.level)}
									{slideCount > 0 && ` · ${slideCount} slides`}
									{saveNotice && <span className="lp-save-notice">{saveNotice}</span>}
								</p>
							</div>
						</div>
						<div className="lp-hero-actions">
							<Link href="/lesson-planner" className="lp-btn lp-btn-ghost lp-btn-sm">
								<IconArrowLeft size={16} />
								Lesson planner
							</Link>
							{presentation && slideCount > 0 && (
								<button
									type="button"
									className="lp-btn lp-btn-primary lp-btn-sm"
									onClick={() => void handleExportPdf()}
									disabled={exportingPdf || loading}
								>
									{exportingPdf ? (
										<>
											<span className="lp-btn-spinner" aria-hidden />
											Exporting…
										</>
									) : (
										<>
											<IconDownload size={16} />
											Download PDF
										</>
									)}
								</button>
							)}
							<button
								type="button"
								className="lp-btn lp-btn-outline lp-btn-sm lp-btn-on-dark"
								onClick={() => void generatePresentation(session, savedPlanId)}
								disabled={loading}
							>
								<IconRefresh size={16} />
								Regenerate
							</button>
						</div>
					</div>
				</header>

				<section className="lp-panel lp-panel-deck" aria-labelledby="presentation-title">
					<div className="lp-panel-head lp-panel-head-row">
						<div className="lp-panel-head-main">
							<div className="lp-panel-head-icon lp-panel-head-icon-accent" aria-hidden>
								<IconPresentation size={20} />
							</div>
							<div>
								<h2 id="presentation-title" className="lp-panel-title">
									Presentation editor
								</h2>
								<p className="lp-panel-subtitle">
									Review slides, upload illustrations, and export the full deck as one PDF.
								</p>
							</div>
						</div>
					</div>
					<div className="lp-panel-body lp-panel-body-flush">
						<CoursePresentationPanel
							presentation={presentation}
							loading={loading}
							error={error}
							onRetry={() => void generatePresentation(session, savedPlanId)}
							onPresentationChange={handlePresentationChange}
						/>
					</div>
				</section>
			</div>
		</AulaLayout>
	);
}
