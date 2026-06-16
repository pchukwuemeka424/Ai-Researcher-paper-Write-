"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { NavIcon } from "@/components/aula/NavIcon";
import {
	IconBookmark,
	IconCheck,
	IconChevronRight,
	IconClock,
	IconLightbulb,
	IconMoveRight,
	IconRefresh,
} from "@/components/ui/ButtonIcon";
import { useAuth } from "@/hooks/useAuth";
import { userInitials } from "@/lib/aula-utils";
import { getDisciplineLabel } from "@/lib/research-disciplines";
import { getFeasibilityLabel, getTypeLabel } from "@/lib/research-ideas";
import {
	loadAllSavedIdeas,
	removeSavedIdea,
	type ResearchBoardStatus,
	type SavedIdea,
	updateSavedIdeaStatus,
} from "@/lib/research-storage";
import { STUDENT_BOARD_COLUMNS, STUDENT_NAV_ITEMS } from "@/lib/student-nav";
import { researchTokenAllowance } from "@/lib/student-tokens";

const COLUMN_ACCENTS: Record<ResearchBoardStatus, string> = {
	saved: "saved",
	in_progress: "progress",
	completed: "completed",
};

const STATUS_LABELS: Record<ResearchBoardStatus, string> = {
	saved: "Saved",
	in_progress: "In progress",
	completed: "Completed",
};

type StatTone = "total" | "saved" | "progress" | "completed" | "tokens";

type KpiItem = {
	label: string;
	value: number | string;
	tone: StatTone;
	hint: string;
};

const KPI_ICONS: Record<StatTone, ReactNode> = {
	total: <IconLightbulb size={18} />,
	saved: <IconBookmark size={18} />,
	progress: <IconClock size={18} />,
	completed: <IconCheck size={18} />,
	tokens: <NavIcon id="tokens" size={18} />,
};

const PIPELINE_ICONS: Record<ResearchBoardStatus, ReactNode> = {
	saved: <IconBookmark size={18} />,
	in_progress: <IconClock size={18} />,
	completed: <IconCheck size={18} />,
};

function formatToday(): string {
	return new Intl.DateTimeFormat(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
	}).format(new Date());
}

function formatShortDate(iso: string): string {
	try {
		return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(iso));
	} catch {
		return "";
	}
}

function getGreeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return "Good morning";
	if (hour < 17) return "Good afternoon";
	return "Good evening";
}

function formatShare(count: number, total: number): string {
	if (total === 0) return "Awaiting first idea";
	return `${Math.round((count / total) * 100)}% of portfolio`;
}

function KpiCard({ label, value, tone, hint, loading }: KpiItem & { loading?: boolean }) {
	return (
		<article className={`stu-kpi stu-kpi-${tone}`}>
			<div className="stu-kpi-head">
				<span className="stu-kpi-icon" aria-hidden>
					{KPI_ICONS[tone]}
				</span>
				<p className="stu-kpi-label">{label}</p>
			</div>
			<div className="stu-kpi-body">
				{loading ? (
					<div className="stu-skeleton stu-skeleton-kpi-value" aria-hidden />
				) : (
					<p className="stu-kpi-value">{value}</p>
				)}
				{loading ? (
					<div className="stu-skeleton stu-skeleton-kpi-hint" aria-hidden />
				) : (
					<p className="stu-kpi-hint">{hint}</p>
				)}
			</div>
			<div className="stu-kpi-watermark" aria-hidden>
				{KPI_ICONS[tone]}
			</div>
		</article>
	);
}

function BoardCard({
	idea,
	columnId,
	onMove,
	onRemove,
}: {
	idea: SavedIdea;
	columnId: ResearchBoardStatus;
	onMove: (status: ResearchBoardStatus) => void;
	onRemove: () => void;
}) {
	const disciplineLabel = getDisciplineLabel(idea.discipline);
	const nextColumns = STUDENT_BOARD_COLUMNS.filter((col) => col.id !== columnId);

	return (
		<article className="stu-card">
			<div className="stu-card-tags">
				<span className="stu-tag stu-tag-type">{getTypeLabel(idea.type)}</span>
				<span className="stu-tag stu-tag-feasibility">{getFeasibilityLabel(idea.feasibility)}</span>
			</div>
			<h3 className="stu-card-title">{idea.title}</h3>
			<p className="stu-card-meta">
				{disciplineLabel} · {idea.topic}
			</p>
			<p className="stu-card-body">{idea.rationale}</p>
			<div className="stu-card-foot">
				<div className="stu-card-moves">
					{nextColumns.map((col) => (
						<button key={col.id} type="button" className="stu-card-move" onClick={() => onMove(col.id)}>
							<IconMoveRight size={12} />
							{col.label}
						</button>
					))}
				</div>
				<button type="button" className="stu-card-remove" onClick={onRemove} aria-label="Remove idea">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
						<path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
					</svg>
				</button>
			</div>
		</article>
	);
}

function BoardSkeleton() {
	return (
		<div className="stu-board" aria-busy="true" aria-label="Loading research board">
			{STUDENT_BOARD_COLUMNS.map((column) => (
				<div key={column.id} className={`stu-column stu-column-${COLUMN_ACCENTS[column.id]}`}>
					<div className="stu-column-head">
						<div className="stu-skeleton stu-skeleton-line" />
					</div>
					<div className="stu-column-body">
						<div className="stu-skeleton stu-skeleton-card" />
						<div className="stu-skeleton stu-skeleton-card" />
					</div>
				</div>
			))}
		</div>
	);
}

export function StudentDashboard() {
	const { user } = useAuth();
	const [ideas, setIdeas] = useState<SavedIdea[]>([]);
	const [loadingIdeas, setLoadingIdeas] = useState(true);

	const refreshIdeas = useCallback(async () => {
		setLoadingIdeas(true);
		try {
			const next = await loadAllSavedIdeas();
			setIdeas(next);
		} finally {
			setLoadingIdeas(false);
		}
	}, []);

	useEffect(() => {
		void refreshIdeas();
	}, [refreshIdeas]);

	const ideasByStatus = useMemo(() => {
		const grouped: Record<ResearchBoardStatus, SavedIdea[]> = {
			saved: [],
			in_progress: [],
			completed: [],
		};
		for (const idea of ideas) {
			const status = idea.status ?? "saved";
			grouped[status].push(idea);
		}
		return grouped;
	}, [ideas]);

	const stats = useMemo(
		() => ({
			total: ideas.length,
			saved: ideasByStatus.saved.length,
			inProgress: ideasByStatus.in_progress.length,
			completed: ideasByStatus.completed.length,
		}),
		[ideas.length, ideasByStatus],
	);

	const recentIdeas = useMemo(
		() =>
			[...ideas]
				.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
				.slice(0, 5),
		[ideas],
	);

	const completionPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

	const allowance = user?.tokenQuota?.allowance ?? researchTokenAllowance(user?.role) ?? 0;
	const tokensRemaining = user?.tokenQuota?.remaining ?? allowance;
	const tokenPercentUsed =
		allowance > 0 ? Math.min(100, Math.round(((allowance - tokensRemaining) / allowance) * 100)) : 0;

	const kpiItems = useMemo<KpiItem[]>(
		() => [
			{
				label: "Total ideas",
				value: stats.total,
				tone: "total",
				hint: stats.total === 0 ? "Start in Research Assistant" : "Across all stages",
			},
			{
				label: "Saved",
				value: stats.saved,
				tone: "saved",
				hint: formatShare(stats.saved, stats.total),
			},
			{
				label: "In progress",
				value: stats.inProgress,
				tone: "progress",
				hint: formatShare(stats.inProgress, stats.total),
			},
			{
				label: "Completed",
				value: stats.completed,
				tone: "completed",
				hint: formatShare(stats.completed, stats.total),
			},
			{
				label: "Tokens remaining",
				value: tokensRemaining.toLocaleString(),
				tone: "tokens",
				hint:
					allowance > 0
						? `${tokenPercentUsed}% of ${allowance.toLocaleString()} used`
						: "No allocation set",
			},
		],
		[stats, tokensRemaining, tokenPercentUsed, allowance],
	);

	const handleMove = async (idea: SavedIdea, status: ResearchBoardStatus) => {
		if (!idea.dbId) {
			setIdeas((current) =>
				current.map((item) =>
					item.id === idea.id && item.title === idea.title ? { ...item, status } : item,
				),
			);
			return;
		}
		const next = await updateSavedIdeaStatus(idea.dbId, status);
		setIdeas(next);
	};

	const handleRemove = async (idea: SavedIdea) => {
		const next = await removeSavedIdea(idea.id, idea.title, idea.dbId);
		setIdeas(next);
	};

	if (!user) return null;

	const firstName = user.name.split(" ")[0] ?? user.name;
	const tools = STUDENT_NAV_ITEMS.filter((item) => item.id !== "dashboard");
	const initials = userInitials(user.name);

	return (
		<div className="stu-dashboard">
			<header className="stu-dash-header">
				<div className="stu-dash-header-copy">
					<p className="stu-dash-eyebrow">{formatToday()}</p>
					<h2 className="stu-dash-title">
						{getGreeting()}, {firstName}
					</h2>
					<p className="stu-dash-lead">
						Track ideas from first inspiration to finished topics. Save from the Research Assistant and
						organize them on your board.
					</p>
				</div>
				<div className="stu-dash-header-actions">
					<button
						type="button"
						className="stu-dash-btn-ghost"
						onClick={() => void refreshIdeas()}
						disabled={loadingIdeas}
					>
						<IconRefresh size={16} />
						{loadingIdeas ? "Syncing…" : "Refresh"}
					</button>
					<Link href="/student/research" className="stu-dash-btn-primary">
						<NavIcon id="research" size={16} />
						Generate ideas
					</Link>
				</div>
			</header>

			<section className="stu-kpi-panel" aria-label="Workspace overview">
				<div className="stu-kpi-panel-head">
					<div>
						<h2 className="stu-kpi-panel-title">Overview</h2>
						<p className="stu-kpi-panel-subtitle">Research activity and token usage at a glance.</p>
					</div>
					{!loadingIdeas && stats.total > 0 && (
						<span className="stu-kpi-panel-badge">{completionPercent}% complete</span>
					)}
				</div>
				<div className="stu-kpi-grid">
					{kpiItems.map((item) => (
						<KpiCard key={item.tone} {...item} loading={loadingIdeas} />
					))}
				</div>
			</section>

			<div className="stu-dash-body">
				<div className="stu-dash-main">
					<section className="stu-pipeline" aria-label="Research progress">
						<div className="stu-pipeline-head">
							<div>
								<h2 className="stu-section-title">Research journey</h2>
								<p className="stu-section-subtitle">
									{stats.total === 0
										? "Start by saving your first research idea."
										: `${completionPercent}% of your ideas are completed.`}
								</p>
							</div>
							{stats.total > 0 && (
								<span className="stu-pipeline-badge">{stats.completed} / {stats.total} done</span>
							)}
						</div>
						<div className="stu-pipeline-track">
							<div className="stu-pipeline-fill" style={{ width: `${completionPercent}%` }} />
						</div>
						<div className="stu-pipeline-steps">
							{STUDENT_BOARD_COLUMNS.map((column) => (
								<div key={column.id} className={`stu-pipeline-step stu-pipeline-step-${COLUMN_ACCENTS[column.id]}`}>
									<span className="stu-pipeline-step-icon" aria-hidden>
										{PIPELINE_ICONS[column.id]}
									</span>
									<span className="stu-pipeline-step-count">{ideasByStatus[column.id].length}</span>
									<span className="stu-pipeline-step-label">{column.label}</span>
								</div>
							))}
						</div>
					</section>

					<section className="stu-board-section" aria-labelledby="stu-board-heading">
						<div className="stu-section-head">
							<div>
								<h2 id="stu-board-heading" className="stu-section-title">
									Research board
								</h2>
								<p className="stu-section-subtitle">
									Move cards between columns as your work progresses.
								</p>
							</div>
						</div>

						{loadingIdeas ? (
							<BoardSkeleton />
						) : ideas.length === 0 ? (
							<div className="stu-empty">
								<div className="stu-empty-visual" aria-hidden>
									<NavIcon id="research" size={36} />
								</div>
								<h3>Your board is empty</h3>
								<p>
									Open the Research Assistant, explore topics in your field, and bookmark ideas you want to
									develop further.
								</p>
								<Link href="/student/research" className="stu-btn stu-btn-primary">
									<NavIcon id="research" size={18} />
									Open Research Assistant
									<IconChevronRight size={16} />
								</Link>
							</div>
						) : (
							<div className="stu-board">
								{STUDENT_BOARD_COLUMNS.map((column) => (
									<div key={column.id} className={`stu-column stu-column-${COLUMN_ACCENTS[column.id]}`}>
										<div className="stu-column-head">
											<div className="stu-column-title-wrap">
												<span className="stu-column-dot" aria-hidden />
												<div>
													<h3>{column.label}</h3>
													<p>{column.hint}</p>
												</div>
											</div>
											<span className="stu-column-count">{ideasByStatus[column.id].length}</span>
										</div>
										<div className="stu-column-body">
											{ideasByStatus[column.id].length === 0 ? (
												<div className="stu-column-empty">
													<p>No items yet</p>
												</div>
											) : (
												ideasByStatus[column.id].map((idea) => (
													<BoardCard
														key={`${idea.dbId ?? idea.id}-${idea.savedAt}`}
														idea={idea}
														columnId={column.id}
														onMove={(status) => void handleMove(idea, status)}
														onRemove={() => void handleRemove(idea)}
													/>
												))
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</section>

					<section className="stu-recent-section" aria-labelledby="stu-recent-heading">
						<div className="stu-section-head">
							<h2 id="stu-recent-heading" className="stu-section-title">
								Recent ideas
							</h2>
							{recentIdeas.length > 0 && (
								<Link href="/student/research/saved" className="stu-section-link">
									View all saved
								</Link>
							)}
						</div>

						{loadingIdeas ? (
							<ul className="stu-activity-list" aria-busy="true" aria-label="Loading recent ideas">
								{[1, 2, 3].map((i) => (
									<li key={i}>
										<div className="stu-activity-row stu-activity-row-skeleton">
											<div className="stu-skeleton stu-skeleton-icon" />
											<div className="stu-activity-body">
												<div className="stu-skeleton stu-skeleton-line" />
												<div className="stu-skeleton stu-skeleton-line stu-skeleton-line-short" />
											</div>
										</div>
									</li>
								))}
							</ul>
						) : recentIdeas.length === 0 ? (
							<div className="stu-recent-empty">
								<p>Saved ideas will appear here once you bookmark them from the Research Assistant.</p>
							</div>
						) : (
							<ul className="stu-activity-list">
								{recentIdeas.map((idea) => {
									const status = idea.status ?? "saved";
									return (
										<li key={`${idea.dbId ?? idea.id}-${idea.savedAt}`}>
											<div className="stu-activity-row">
												<span className={`stu-activity-icon stu-activity-icon-${COLUMN_ACCENTS[status]}`} aria-hidden>
													<NavIcon id="research" size={16} />
												</span>
												<span className="stu-activity-body">
													<p className="stu-activity-title">{idea.title}</p>
													<p className="stu-activity-meta">
														{getDisciplineLabel(idea.discipline)} · Saved {formatShortDate(idea.savedAt)}
													</p>
												</span>
												<span className={`stu-activity-tag stu-activity-tag-${COLUMN_ACCENTS[status]}`}>
													{STATUS_LABELS[status]}
												</span>
											</div>
										</li>
									);
								})}
							</ul>
						)}
					</section>
				</div>

				<aside className="stu-dash-aside" aria-label="Profile and quick access">
					<div className="stu-profile-card">
						<div className="stu-profile-top">
							<span className="stu-profile-avatar" aria-hidden>
								{initials}
							</span>
							<div className="stu-profile-identity">
								<p className="stu-profile-name">{user.name}</p>
								<p className="stu-profile-role">{user.department ?? "Student"}</p>
							</div>
						</div>
						<dl className="stu-profile-details">
							<div className="stu-profile-detail">
								<dt>Institution</dt>
								<dd>{user.institution ?? "Not set"}</dd>
							</div>
							<div className="stu-profile-detail">
								<dt>Email</dt>
								<dd>{user.email}</dd>
							</div>
						</dl>
					</div>

					<div className="stu-aside-tokens">
						<div className="stu-aside-tokens-head">
							<span className="stu-aside-tokens-label">Research tokens</span>
							<span className="stu-aside-tokens-count">
								{tokensRemaining.toLocaleString()} left
							</span>
						</div>
						<div
							className="stu-aside-tokens-track"
							role="progressbar"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={tokenPercentUsed}
							aria-label={`${tokenPercentUsed}% of research tokens used`}
						>
							<div className="stu-aside-tokens-fill" style={{ width: `${tokenPercentUsed}%` }} />
						</div>
						<p className="stu-aside-tokens-meta">{allowance.toLocaleString()} allocated</p>
					</div>

					<div className="stu-aside-tools">
						<h3 className="stu-aside-tools-title">Quick tools</h3>
						<ul className="stu-aside-tools-list">
							{tools.map((tool) => (
								<li key={tool.id}>
									<Link href={tool.href} className={`stu-aside-tool stu-aside-tool-${tool.id}`}>
										<span className="stu-aside-tool-icon" aria-hidden>
											<NavIcon id={tool.id} size={18} />
										</span>
										<span className="stu-aside-tool-copy">
											<span className="stu-aside-tool-label">{tool.label}</span>
											{tool.description && (
												<span className="stu-aside-tool-desc">{tool.description}</span>
											)}
										</span>
										<IconChevronRight size={14} />
									</Link>
								</li>
							))}
						</ul>
					</div>
				</aside>
			</div>
		</div>
	);
}
