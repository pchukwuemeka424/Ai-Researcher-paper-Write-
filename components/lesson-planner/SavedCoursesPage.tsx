"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { NavIcon } from "@/components/aula/NavIcon";
import { AulaLayout } from "@/components/AulaLayout";
import { IconPlus, IconPresentation } from "@/components/lesson-planner/LessonPlannerIcons";
import {
	deleteSavedCoursePlanFromApi,
	fetchSavedCoursePlansFromApi,
} from "@/lib/lesson-planner-api";
import { SAVED_LESSONS_CHANGED, type SavedCoursePlan } from "@/lib/lesson-planner-storage";
import { getTeachingLevelLabel } from "@/lib/lesson-planner";
import { getDisciplineLabel } from "@/lib/research-disciplines";
import {
	savedCourseOutlinePath,
	savedCoursePresentationPath,
} from "@/lib/saved-courses-routes";

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

export function SavedCoursesPage() {
	const [plans, setPlans] = useState<SavedCoursePlan[]>([]);
	const [loading, setLoading] = useState(true);
	const [removingId, setRemovingId] = useState<string | null>(null);

	const loadPlans = useCallback(async () => {
		setLoading(true);
		const rows = await fetchSavedCoursePlansFromApi();
		setPlans(rows ?? []);
		setLoading(false);
	}, []);

	useEffect(() => {
		void loadPlans();
	}, [loadPlans]);

	useEffect(() => {
		const onChanged = () => {
			void loadPlans();
		};
		window.addEventListener(SAVED_LESSONS_CHANGED, onChanged);
		return () => window.removeEventListener(SAVED_LESSONS_CHANGED, onChanged);
	}, [loadPlans]);

	const sortedPlans = useMemo(
		() => [...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
		[plans],
	);

	const handleRemove = async (id: string) => {
		setRemovingId(id);
		const ok = await deleteSavedCoursePlanFromApi(id);
		if (ok) {
			setPlans((current) => current.filter((plan) => plan.id !== id));
		}
		setRemovingId(null);
	};

	return (
		<AulaLayout showRightPanel={false}>
			<div className="lp-page sc-saved-page">
				<header className="lp-page-header">
					<div className="lp-page-header-start">
						<div className="lp-page-icon" aria-hidden>
							<NavIcon id="folder" size={24} />
						</div>
						<div>
							<p className="lp-page-eyebrow">Your library</p>
							<h1 className="lp-page-title">Saved courses</h1>
							<p className="lp-page-lead">
								Open outlines and slide decks you have generated and saved from Lesson Planner.
							</p>
						</div>
					</div>
					<div className="lp-page-actions">
						<Link href="/lesson-planner" className="lp-btn lp-btn-primary lp-btn-sm">
							<IconPlus size={16} />
							New course
						</Link>
					</div>
				</header>

				<div className="sc-saved-body">
					{loading && (
						<div className="lp-state lp-state-loading" role="status">
							<div className="lp-spinner" aria-hidden />
							<p className="lp-state-title">Loading saved courses…</p>
						</div>
					)}

					{!loading && sortedPlans.length === 0 && (
						<div className="sc-saved-empty">
							<div className="sc-saved-empty-icon" aria-hidden>
								<NavIcon id="folder" size={32} />
							</div>
							<h2>No saved courses yet</h2>
							<p>Generate a course outline in Lesson Planner — it will appear here automatically.</p>
							<Link href="/lesson-planner" className="lp-btn lp-btn-primary">
								<IconPlus size={16} />
								Plan a course
							</Link>
						</div>
					)}

					{!loading && sortedPlans.length > 0 && (
						<ul className="sc-saved-list">
							{sortedPlans.map((plan) => (
								<li key={plan.id} className="sc-saved-row">
									<div className="sc-saved-row-main">
										<Link href={savedCourseOutlinePath(plan.id)} className="sc-saved-row-title">
											{plan.title}
										</Link>
										<p className="sc-saved-row-meta">
											{getDisciplineLabel(plan.department)} · {getTeachingLevelLabel(plan.level)}
											{plan.presentation ? " · slides saved" : " · outline only"}
										</p>
										<p className="sc-saved-row-date">Updated {formatWhen(plan.updatedAt)}</p>
									</div>
									<div className="sc-saved-row-actions">
										<Link href={savedCourseOutlinePath(plan.id)} className="sc-saved-action">
											Outline
										</Link>
										{plan.presentation && (
											<Link
												href={savedCoursePresentationPath(plan.id)}
												className="sc-saved-action sc-saved-action-slides"
											>
												<IconPresentation size={14} />
												Slides
											</Link>
										)}
										<button
											type="button"
											className="sc-saved-remove"
											disabled={removingId === plan.id}
											aria-label={`Remove ${plan.title}`}
											onClick={() => void handleRemove(plan.id)}
										>
											{removingId === plan.id ? "…" : "Remove"}
										</button>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</AulaLayout>
	);
}
