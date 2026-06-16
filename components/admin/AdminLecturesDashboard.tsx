"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useAdminTable } from "@/hooks/useAdminTable";
import { deleteAdminLecture, fetchAdminLectures } from "@/lib/admin-api";
import type { AdminLectureRecord, LectureAdminStats } from "@/lib/admin";

function levelLabel(level: string): string {
	return level
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

export function AdminLecturesDashboard() {
	const { ready } = useAdminGuard();
	const [lectures, setLectures] = useState<AdminLectureRecord[]>([]);
	const [stats, setStats] = useState<LectureAdminStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");

	const loadLectures = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminLectures();
			setLectures(data.lectures);
			setStats(data.stats);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void loadLectures();
	}, [loadLectures, ready]);

	const removeLecture = async (id: string, title: string) => {
		if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
		try {
			await deleteAdminLecture(id);
			await loadLectures();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	const query = search.trim().toLowerCase();
	const filtered = useMemo(() => {
		if (!query) return lectures;
		return lectures.filter(
			(lecture) =>
				lecture.title.toLowerCase().includes(query) ||
				lecture.department.toLowerCase().includes(query) ||
				(lecture.ownerName?.toLowerCase().includes(query) ?? false) ||
				(lecture.ownerEmail?.toLowerCase().includes(query) ?? false),
		);
	}, [lectures, query]);

	const { pageItems, pagination } = useAdminTable(filtered, { resetDeps: [query] });

	const columns = useMemo(
		() => [
			{
				key: "title",
				header: "Title",
				cell: (lecture: AdminLectureRecord) => (
					<span className="admin-cell-name">{lecture.title}</span>
				),
			},
			{
				key: "department",
				header: "Department",
				cell: (lecture: AdminLectureRecord) => lecture.department,
			},
			{
				key: "level",
				header: "Level",
				cell: (lecture: AdminLectureRecord) => (
					<span className="dash-badge">{levelLabel(lecture.level)}</span>
				),
			},
			{
				key: "owner",
				header: "Owner",
				cell: (lecture: AdminLectureRecord) =>
					lecture.ownerName ? (
						<>
							<span className="admin-cell-name">{lecture.ownerName}</span>
							{lecture.ownerEmail && (
								<span className="admin-cell-sub">{lecture.ownerEmail}</span>
							)}
						</>
					) : (
						<span className="muted">Anonymous</span>
					),
			},
			{
				key: "slides",
				header: "Slides",
				cell: (lecture: AdminLectureRecord) =>
					lecture.slideCount > 0 ? lecture.slideCount : "—",
				align: "center" as const,
			},
			{
				key: "updated",
				header: "Updated",
				cell: (lecture: AdminLectureRecord) => (
					<span className="muted">{formatAdminDate(lecture.updatedAt)}</span>
				),
			},
			{
				key: "actions",
				header: "",
				align: "right" as const,
				cell: (lecture: AdminLectureRecord) => (
					<button
						type="button"
						className="danger-btn"
						onClick={() => void removeLecture(lecture.id, lecture.title)}
					>
						Delete
					</button>
				),
			},
		],
		[],
	);

	return (
		<AdminShell
			title="Lectures"
			subtitle="View and manage all saved course plans"
			breadcrumb="Admin Console"
		>
			{loading && <p className="muted">Loading lectures…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Total lectures" value={stats.total} accent="primary" />
					<AdminStatCard label="With slides" value={stats.withPresentation} hint="Has presentation" accent="success" />
					<AdminStatCard
						label="Outline only"
						value={stats.withoutPresentation}
						hint="No slide deck yet"
					/>
				</section>
			)}

			<AdminPanel
				title="All lectures"
				description={`${filtered.length.toLocaleString()} of ${lectures.length.toLocaleString()} lectures`}
			>
				<AdminDataTable
					columns={columns}
					data={pageItems}
					rowKey={(lecture) => lecture.id}
					loading={loading}
					search={search}
					onSearchChange={setSearch}
					searchPlaceholder="Search by title, department, or owner…"
					hasActiveFilters={Boolean(query)}
					emptyMessage="No saved lectures yet."
					emptyFilteredMessage="No lectures match your search."
					pagination={pagination}
				/>
			</AdminPanel>
		</AdminShell>
	);
}
