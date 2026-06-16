"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { NavIcon } from "@/components/aula/NavIcon";
import { AulaLayout } from "@/components/AulaLayout";
import { useAuth } from "@/hooks/useAuth";
import { AULA_QUICK_ACCESS } from "@/lib/aula-nav";
import { loadAllSavedPapers, SAVED_RESEARCH_CHANGED, type SavedResearchPaper } from "@/lib/chat-research-storage";
import { fetchSavedCoursePlansFromApi } from "@/lib/lesson-planner-api";
import { SAVED_LESSONS_CHANGED, type SavedCoursePlan } from "@/lib/lesson-planner-storage";
import { loadAllSavedIdeas } from "@/lib/research-storage";
import { savedResearchPagePath } from "@/lib/saved-research-routes";
import { researchTokenAllowance } from "@/lib/student-tokens";

type ActivityItem = {
	id: string;
	title: string;
	meta: string;
	href: string;
	kind: "lesson" | "paper";
	sortAt: string;
};

function formatShortDate(iso: string): string {
	try {
		return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(iso));
	} catch {
		return "";
	}
}

function formatToday(): string {
	return new Intl.DateTimeFormat(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
	}).format(new Date());
}

function getGreeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return "Good morning";
	if (hour < 17) return "Good afternoon";
	return "Good evening";
}

function StatCard({
	label,
	value,
	tone,
	icon,
	loading,
}: {
	label: string;
	value: number | string;
	tone: "blue" | "green" | "purple" | "orange";
	icon: string;
	loading?: boolean;
}) {
	return (
		<div className={`aula-stat aula-stat-${tone}`}>
			<span className="aula-stat-icon" aria-hidden>
				<NavIcon id={icon} size={18} />
			</span>
			<div className="aula-stat-body">
				{loading ? (
					<div className="aula-skeleton aula-skeleton-value" aria-hidden />
				) : (
					<p className="aula-stat-value">{value}</p>
				)}
				<p className="aula-stat-label">{label}</p>
			</div>
		</div>
	);
}

function buildActivityItems(plans: SavedCoursePlan[], papers: SavedResearchPaper[]): ActivityItem[] {
	const lessonItems: ActivityItem[] = plans.map((plan) => ({
		id: `lesson-${plan.id}`,
		title: plan.title,
		meta: `Course plan · ${formatShortDate(plan.updatedAt)}`,
		href: `/lesson-planner?saved=${encodeURIComponent(plan.id)}`,
		kind: "lesson",
		sortAt: plan.updatedAt,
	}));

	const paperItems: ActivityItem[] = papers.map((paper) => ({
		id: `paper-${paper.id}`,
		title: paper.title,
		meta: `Research paper · ${formatShortDate(paper.updatedAt)}`,
		href: savedResearchPagePath(paper.id),
		kind: "paper",
		sortAt: paper.updatedAt,
	}));

	return [...lessonItems, ...paperItems]
		.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime())
		.slice(0, 6);
}

export function AulaDashboard() {
	const { user } = useAuth();
	const [plans, setPlans] = useState<SavedCoursePlan[]>([]);
	const [papers, setPapers] = useState<SavedResearchPaper[]>([]);
	const [ideaCount, setIdeaCount] = useState(0);
	const [loading, setLoading] = useState(true);

	const refreshDashboard = useCallback(async () => {
		setLoading(true);
		try {
			const [planRows, paperRows, ideas] = await Promise.all([
				fetchSavedCoursePlansFromApi(),
				loadAllSavedPapers(),
				loadAllSavedIdeas(),
			]);
			setPlans(planRows ?? []);
			setPapers(paperRows);
			setIdeaCount(ideas.length);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refreshDashboard();
	}, [refreshDashboard]);

	useEffect(() => {
		const onChanged = () => {
			void refreshDashboard();
		};
		window.addEventListener(SAVED_LESSONS_CHANGED, onChanged);
		window.addEventListener(SAVED_RESEARCH_CHANGED, onChanged);
		return () => {
			window.removeEventListener(SAVED_LESSONS_CHANGED, onChanged);
			window.removeEventListener(SAVED_RESEARCH_CHANGED, onChanged);
		};
	}, [refreshDashboard]);

	const activity = useMemo(() => buildActivityItems(plans, papers), [plans, papers]);
	const allowance = user?.tokenQuota?.allowance ?? researchTokenAllowance(user?.role) ?? 0;
	const tokensRemaining = user?.tokenQuota?.remaining ?? allowance;
	const firstName = user?.name.split(" ")[0] ?? user?.name ?? "";

	if (!user) return null;

	return (
		<AulaLayout>
			<header className="aula-page-header aula-page-header-pro">
				<div className="aula-page-header-copy">
					<p className="aula-page-eyebrow">{formatToday()}</p>
					<h1 className="aula-page-title">
						{getGreeting()}, {firstName}
					</h1>
					<p className="aula-page-lead">
						Your teaching and research workspace. Pick a tool below or continue from recent work.
					</p>
				</div>
				<div className="aula-page-actions">
					<Link href="/lesson-planner" className="aula-btn-ghost">
						Plan a lecture
					</Link>
					<Link href="/dashboard/chat" className="aula-btn-primary">
						New research paper
					</Link>
				</div>
			</header>

			<section className="aula-stats" aria-label="Workspace summary">
				<StatCard label="Course plans" value={plans.length} tone="purple" icon="lesson-planner" loading={loading} />
				<StatCard label="Research ideas" value={ideaCount} tone="blue" icon="research" loading={loading} />
				<StatCard label="Saved papers" value={papers.length} tone="green" icon="notes" loading={loading} />
				<StatCard
					label="Tokens remaining"
					value={tokensRemaining.toLocaleString()}
					tone="orange"
					icon="tokens"
					loading={loading}
				/>
			</section>

			<section className="aula-section" aria-labelledby="tools-title">
				<div className="aula-section-head">
					<h2 id="tools-title" className="aula-section-title">
						Workspace tools
					</h2>
				</div>
				<div className="aula-quick-grid">
					{AULA_QUICK_ACCESS.map((tool) => (
						<Link key={tool.id} href={tool.href} className="aula-quick-card">
							<div className="aula-quick-card-top">
								<span className={`aula-quick-icon aula-quick-icon-${tool.iconColor}`} aria-hidden>
									<NavIcon id={tool.id} size={20} />
								</span>
							</div>
							<p className="aula-quick-title">{tool.label}</p>
							<p className="aula-quick-desc">{tool.description}</p>
							<span className="aula-quick-cta">Open tool →</span>
						</Link>
					))}
				</div>
			</section>

			<section className="aula-section" aria-labelledby="recent-work-title">
				<div className="aula-section-head">
					<h2 id="recent-work-title" className="aula-section-title">
						Recent work
					</h2>
					{activity.length > 0 && (
						<Link href="/lesson-planner" className="aula-section-link">
							View all plans
						</Link>
					)}
				</div>

				{loading ? (
					<div className="aula-activity-list" aria-busy="true" aria-label="Loading recent work">
						{[1, 2, 3].map((i) => (
							<div key={i} className="aula-activity-row aula-activity-row-skeleton">
								<div className="aula-skeleton aula-skeleton-icon" />
								<div className="aula-activity-body">
									<div className="aula-skeleton aula-skeleton-line" />
									<div className="aula-skeleton aula-skeleton-line aula-skeleton-line-short" />
								</div>
							</div>
						))}
					</div>
				) : activity.length === 0 ? (
					<div className="aula-dash-empty">
						<div className="aula-dash-empty-icon" aria-hidden>
							<NavIcon id="lesson-planner" size={24} />
						</div>
						<h3 className="aula-dash-empty-title">No recent activity</h3>
						<p className="aula-dash-empty-text">
							Generate a course outline or draft a research paper to see your latest work here.
						</p>
						<div className="aula-dash-empty-actions">
							<Link href="/lesson-planner" className="aula-btn-primary">
								Plan a lecture
							</Link>
							<Link href="/dashboard/chat" className="aula-btn-ghost">
								Start research paper
							</Link>
						</div>
					</div>
				) : (
					<ul className="aula-activity-list">
						{activity.map((item) => (
							<li key={item.id}>
								<Link href={item.href} className="aula-activity-row">
									<span
										className={`aula-activity-icon aula-activity-icon-${item.kind === "lesson" ? "purple" : "blue"}`}
										aria-hidden
									>
										<NavIcon id={item.kind === "lesson" ? "lesson-planner" : "research"} size={16} />
									</span>
									<span className="aula-activity-body">
										<p className="aula-activity-title">{item.title}</p>
										<p className="aula-activity-meta">{item.meta}</p>
									</span>
									<span
										className={`aula-activity-tag aula-activity-tag-${item.kind === "lesson" ? "purple" : "blue"}`}
									>
										{item.kind === "lesson" ? "Course" : "Paper"}
									</span>
									<span className="aula-activity-chevron" aria-hidden>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
											<path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
									</span>
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>

			<div className="aula-security-banner">
				<div className="aula-security-icon" aria-hidden>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
					</svg>
				</div>
				<div className="aula-security-copy">
					<p className="aula-security-text">Secure AI environment</p>
					<p className="aula-security-sub">All research generation runs in a governed, institution-safe workspace.</p>
				</div>
				<Link href="/dashboard/chat" className="aula-security-link">
					Open workspace
				</Link>
			</div>
		</AulaLayout>
	);
}
