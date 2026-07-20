"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { fetchUsageAnalytics } from "@/lib/admin-api";
import type { UsageAnalytics, UsageBreakdownRow } from "@/lib/admin-governance";

type Dimension = "faculty" | "department" | "programme" | "cohort" | "role";

function BreakdownTable({ rows, label }: { rows: UsageBreakdownRow[]; label: string }) {
	if (rows.length === 0) return <p className="muted">No {label.toLowerCase()} data yet.</p>;
	return (
		<table className="admin-simple-table">
			<thead>
				<tr>
					<th>{label}</th>
					<th>Users</th>
					<th>Active</th>
					<th>Sessions</th>
					<th>Ideas</th>
					<th>Papers</th>
					<th>Projects</th>
					<th>Tokens</th>
					<th>Intensity</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => (
					<tr key={row.key}>
						<td>{row.label}</td>
						<td>{row.users}</td>
						<td>{row.activeUsers}</td>
						<td>{row.sessions}</td>
						<td>{row.ideaSessions}</td>
						<td>{row.papers}</td>
						<td>{row.projects}</td>
						<td>{row.tokensUsed.toLocaleString()}</td>
						<td>{row.intensity}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

export function AdminAnalyticsDashboard() {
	const { ready } = useAdminGuard();
	const [data, setData] = useState<UsageAnalytics | null>(null);
	const [dimension, setDimension] = useState<Dimension>("faculty");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			setData(await fetchUsageAnalytics());
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const rows =
		dimension === "faculty"
			? data?.byFaculty
			: dimension === "department"
				? data?.byDepartment
				: dimension === "programme"
					? data?.byProgramme
					: dimension === "cohort"
						? data?.byCohort
						: data?.byRole;

	return (
		<AdminShell
			title="Usage analytics"
			subtitle="Adoption and intensity by faculty, department, programme, and cohort"
			breadcrumb="Admin · Governance"
			actions={
				<button type="button" className="ghost-btn" onClick={() => void load()}>
					Refresh
				</button>
			}
		>
			{loading && <p className="muted">Loading analytics…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{data && (
				<>
					<section className="admin-stats">
						<AdminStatCard label="Active users" value={data.totals.activeUsers} accent="primary" />
						<AdminStatCard label="Sessions" value={data.totals.sessions} />
						<AdminStatCard label="Idea generations" value={data.totals.ideaSessions} />
						<AdminStatCard label="Saved papers" value={data.totals.papers} />
						<AdminStatCard
							label="Tokens used"
							value={data.totals.tokensUsed}
							accent="warning"
						/>
					</section>

					<AdminPanel
						title="Breakdown"
						description="Leadership view of who is adopting AI and how intensively"
						actions={
							<div className="admin-filter-row">
								{(
									[
										["faculty", "Faculty"],
										["department", "Department"],
										["programme", "Programme"],
										["cohort", "Cohort"],
										["role", "Role"],
									] as const
								).map(([id, label]) => (
									<button
										key={id}
										type="button"
										className={`ghost-btn${dimension === id ? " admin-filter-active" : ""}`}
										onClick={() => setDimension(id)}
									>
										{label}
									</button>
								))}
							</div>
						}
					>
						<div className="admin-table-scroll">
							<BreakdownTable
								rows={rows ?? []}
								label={
									dimension === "faculty"
										? "Faculty"
										: dimension === "department"
											? "Department"
											: dimension === "programme"
												? "Programme"
												: dimension === "cohort"
													? "Cohort"
													: "Role"
								}
							/>
						</div>
					</AdminPanel>

					<AdminPanel title="Feature adoption" description="Counts by research AI capability">
						<ul className="admin-feature-list">
							{data.byFeature.map((f) => (
								<li key={f.feature}>
									<span>{f.label}</span>
									<strong>{f.count.toLocaleString()}</strong>
								</li>
							))}
						</ul>
					</AdminPanel>
				</>
			)}
		</AdminShell>
	);
}
