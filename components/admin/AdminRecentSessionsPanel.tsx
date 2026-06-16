"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import {
	AdminPanel,
	formatAdminDate,
	formatAdminRelative,
	formatSessionTopic,
	isSessionTopicTruncated,
} from "@/components/admin/AdminShell";
import { AdminSessionRowActions, SessionStateBadge } from "@/components/admin/AdminSessionRowActions";
import { useAdminTable } from "@/hooks/useAdminTable";
import {
	deleteAdminSession,
	exportSessionTopicsCsv,
	fetchAdminRecentSessionTopics,
	stopAdminSession,
} from "@/lib/admin-api";
import type { RecentSessionTopic } from "@/lib/dashboard";

type Props = {
	limit?: number;
	ready?: boolean;
};

type StateFilter = "all" | "live" | "idle" | "error";

const STATE_FILTERS: { id: StateFilter; label: string }[] = [
	{ id: "all", label: "All" },
	{ id: "live", label: "Live" },
	{ id: "idle", label: "Idle" },
	{ id: "error", label: "Error" },
];

function isLive(state: string): boolean {
	return state === "running" || state === "starting";
}

function SessionTopicCell({ session }: { session: RecentSessionTopic }) {
	const topicTitle = session.topic.trim() || session.workflow?.trim() || "General research";

	return (
		<div className="admin-recent-topic">
			<div className="admin-recent-topic-head">
				{isLive(session.state) && (
					<span className="admin-recent-live-dot" title="Live session" aria-hidden />
				)}
				<span
					className="admin-recent-topic-title"
					title={isSessionTopicTruncated(topicTitle) ? topicTitle : undefined}
				>
					{formatSessionTopic(topicTitle)}
				</span>
			</div>
			<SessionMetaLine session={session} />
		</div>
	);
}

function SessionMetaLine({ session }: { session: RecentSessionTopic }) {
	const parts: string[] = [];

	if (session.workflow && session.workflow !== session.topic) {
		parts.push(session.workflow);
	}
	if (session.lectureTitle) {
		parts.push(formatSessionTopic(session.lectureTitle, 5));
	}
	parts.push(session.model);
	parts.push(`${session.messageCount.toLocaleString()} msgs`);

	if (parts.length === 0) return null;

	return (
		<p className="admin-recent-meta" title={session.lectureTitle ?? undefined}>
			{parts.join(" · ")}
		</p>
	);
}

function StateFilterChips({
	value,
	onChange,
	counts,
}: {
	value: StateFilter;
	onChange: (next: StateFilter) => void;
	counts: Record<StateFilter, number>;
}) {
	return (
		<div className="admin-recent-filter-chips" role="group" aria-label="Filter by state">
			{STATE_FILTERS.map((filter) => (
				<button
					key={filter.id}
					type="button"
					className={`admin-recent-filter-chip${value === filter.id ? " admin-recent-filter-chip-active" : ""}`}
					onClick={() => onChange(filter.id)}
					aria-pressed={value === filter.id}
				>
					{filter.label}
					<span className="admin-recent-filter-count">{counts[filter.id].toLocaleString()}</span>
				</button>
			))}
		</div>
	);
}

export function AdminRecentSessionsPanel({ limit = 8, ready = true }: Props) {
	const [sessions, setSessions] = useState<RecentSessionTopic[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [stateFilter, setStateFilter] = useState<StateFilter>("all");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [bulkWorking, setBulkWorking] = useState(false);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminRecentSessionTopics(limit);
			setSessions(data);
			setSelected(new Set());
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, [limit]);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const query = search.trim().toLowerCase();
	const filtered = useMemo(() => {
		return sessions.filter((session) => {
			if (stateFilter === "live" && !isLive(session.state)) return false;
			if (stateFilter === "idle" && session.state !== "idle") return false;
			if (stateFilter === "error" && session.state !== "error") return false;
			if (!query) return true;
			return (
				session.topic.toLowerCase().includes(query) ||
				(session.workflow?.toLowerCase().includes(query) ?? false) ||
				session.model.toLowerCase().includes(query) ||
				(session.lectureTitle?.toLowerCase().includes(query) ?? false) ||
				(session.generatedByName?.toLowerCase().includes(query) ?? false) ||
				(session.generatedByEmail?.toLowerCase().includes(query) ?? false)
			);
		});
	}, [sessions, stateFilter, query]);

	const { pageItems, pagination } = useAdminTable(filtered, {
		pageSize: 8,
		resetDeps: [query, stateFilter],
	});

	const stateCounts = useMemo(
		() => ({
			all: sessions.length,
			live: sessions.filter((s) => isLive(s.state)).length,
			idle: sessions.filter((s) => s.state === "idle").length,
			error: sessions.filter((s) => s.state === "error").length,
		}),
		[sessions],
	);

	const liveCount = stateCounts.live;
	const allVisibleSelected =
		pageItems.length > 0 && pageItems.every((session) => selected.has(session.id));

	const toggleAll = () => {
		if (allVisibleSelected) {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const session of pageItems) next.delete(session.id);
				return next;
			});
		} else {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const session of pageItems) next.add(session.id);
				return next;
			});
		}
	};

	const toggleOne = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const bulkDelete = async () => {
		const ids = Array.from(selected);
		if (ids.length === 0) return;
		if (!window.confirm(`Delete ${ids.length} session(s) and their messages?`)) return;
		setBulkWorking(true);
		setError(null);
		try {
			await Promise.all(ids.map((id) => deleteAdminSession(id)));
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBulkWorking(false);
		}
	};

	const bulkStop = async () => {
		const ids = Array.from(selected).filter((id) => {
			const session = sessions.find((s) => s.id === id);
			return session && isLive(session.state);
		});
		if (ids.length === 0) return;
		if (!window.confirm(`Stop ${ids.length} live session(s)?`)) return;
		setBulkWorking(true);
		setError(null);
		try {
			await Promise.all(ids.map((id) => stopAdminSession(id)));
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBulkWorking(false);
		}
	};

	const columns = useMemo(
		() => [
			{
				key: "session",
				header: "Session",
				className: "admin-recent-col-session",
				cell: (session: RecentSessionTopic) => <SessionTopicCell session={session} />,
			},
			{
				key: "state",
				header: "State",
				className: "admin-recent-col-state",
				cell: (session: RecentSessionTopic) => <SessionStateBadge state={session.state} />,
			},
			{
				key: "generatedBy",
				header: "User",
				className: "admin-recent-col-user",
				cell: (session: RecentSessionTopic) =>
					session.generatedByName ? (
						<div className="admin-recent-user">
							<span className="admin-recent-user-name">{session.generatedByName}</span>
							{session.generatedByEmail && (
								<span className="admin-recent-user-email">{session.generatedByEmail}</span>
							)}
						</div>
					) : (
						<span className="muted">—</span>
					),
			},
			{
				key: "lecture",
				header: "Lecture",
				className: "admin-recent-col-lecture",
				cell: (session: RecentSessionTopic) =>
					session.lectureTitle ? (
						<span
							className="admin-recent-lecture"
							title={
								isSessionTopicTruncated(session.lectureTitle)
									? session.lectureTitle
									: undefined
							}
						>
							{formatSessionTopic(session.lectureTitle)}
						</span>
					) : (
						<span className="muted">—</span>
					),
			},
			{
				key: "model",
				header: "Model",
				className: "admin-recent-col-model",
				cell: (session: RecentSessionTopic) => (
					<span className="admin-recent-model dash-mono" title={session.model}>
						{session.model}
					</span>
				),
			},
			{
				key: "messages",
				header: "Msgs",
				className: "admin-recent-col-msgs",
				align: "center" as const,
				cell: (session: RecentSessionTopic) => (
					<span className="admin-recent-msgs">{session.messageCount.toLocaleString()}</span>
				),
			},
			{
				key: "updated",
				header: "Activity",
				className: "admin-recent-col-activity",
				cell: (session: RecentSessionTopic) => (
					<time
						className="admin-recent-activity"
						dateTime={session.updatedAt}
						title={formatAdminDate(session.updatedAt)}
					>
						{formatAdminRelative(session.updatedAt)}
					</time>
				),
			},
			{
				key: "actions",
				header: "",
				className: "admin-recent-col-actions",
				align: "right" as const,
				cell: (session: RecentSessionTopic) => (
					<AdminSessionRowActions session={session} onChange={() => void load()} compact />
				),
			},
		],
		[load],
	);

	return (
		<AdminPanel
			className="admin-recent-panel"
			title="Recent sessions"
			description={
				liveCount > 0
					? `${filtered.length.toLocaleString()} shown · ${liveCount} live now`
					: `${filtered.length.toLocaleString()} recent across the platform`
			}
			actions={
				<>
					<button
						type="button"
						className="ghost-btn"
						onClick={() => exportSessionTopicsCsv(filtered)}
						disabled={filtered.length === 0}
					>
						Export
					</button>
					<button type="button" className="ghost-btn" onClick={() => void load()} disabled={loading}>
						Refresh
					</button>
					<Link href="/admin/sessions" className="ghost-btn">
						View all
					</Link>
				</>
			}
		>
			{error && <div className="banner banner-error admin-recent-banner">{error}</div>}

			<AdminDataTable
				className="admin-recent-sessions-table"
				columns={columns}
				data={pageItems}
				rowKey={(session) => session.id}
				rowClassName={(session) => (isLive(session.state) ? "admin-recent-row-live" : undefined)}
				loading={loading}
				search={search}
				onSearchChange={setSearch}
				searchPlaceholder="Search topics, lectures, users…"
				hasActiveFilters={Boolean(query) || stateFilter !== "all"}
				emptyMessage="No sessions yet."
				emptyFilteredMessage="No sessions match your filters."
				filters={
					<StateFilterChips
						value={stateFilter}
						onChange={setStateFilter}
						counts={stateCounts}
					/>
				}
				selectable={{
					selectedIds: selected,
					onToggle: toggleOne,
					onToggleAll: toggleAll,
					allVisibleSelected,
				}}
				bulkBar={
					selected.size > 0 ? (
						<div className="admin-bulk-bar admin-recent-bulk-bar">
							<span className="admin-bulk-count">{selected.size} selected</span>
							<div className="admin-bulk-actions">
								<button
									type="button"
									className="ghost-btn"
									disabled={bulkWorking}
									onClick={() => void bulkStop()}
								>
									Stop live
								</button>
								<button
									type="button"
									className="danger-btn"
									disabled={bulkWorking}
									onClick={() => void bulkDelete()}
								>
									Delete
								</button>
								<button type="button" className="ghost-btn" onClick={() => setSelected(new Set())}>
									Clear
								</button>
							</div>
						</div>
					) : undefined
				}
				pagination={pagination}
			/>
		</AdminPanel>
	);
}
