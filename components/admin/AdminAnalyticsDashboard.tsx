"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
	AdminAreaChart,
	AdminBarChart,
	AdminHeatmap,
	AdminLineChart,
	AdminPieChart,
	toChartPoints,
} from "@/components/admin/AdminCharts";
import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useAdminUserQuery } from "@/hooks/useAdminUserQuery";
import { fetchAdminAnalytics, fetchAdminOverview, fetchAdminUsers } from "@/lib/admin-api";
import type { PlatformOverview, UsageAnalytics } from "@/lib/admin-governance";
import type { UserRecord } from "@/lib/dashboard";

const FEATURE_MAP: Array<{ key: string; label: string; aliases: string[] }> = [
	{ key: "prompt", label: "Prompt Count", aliases: ["prompt", "prompts", "ai_prompt", "chat"] },
	{
		key: "document",
		label: "Document Generation",
		aliases: ["document", "documents", "document_generation", "paper", "draft"],
	},
	{
		key: "literature",
		label: "Literature Reviews",
		aliases: ["literature", "literature_review", "lit_review"],
	},
	{
		key: "proposal",
		label: "Research Proposal",
		aliases: ["proposal", "research_proposal", "proposals"],
	},
	{
		key: "citation",
		label: "Citation Generation",
		aliases: ["citation", "citations", "citation_generation", "bibliography"],
	},
	{
		key: "data_analysis",
		label: "Data Analysis",
		aliases: ["data", "data_analysis", "analysis", "stats"],
	},
	{
		key: "grammar",
		label: "Grammar Improvement",
		aliases: ["grammar", "grammar_improvement", "proofread", "writing"],
	},
	{
		key: "translation",
		label: "Translation",
		aliases: ["translation", "translate"],
	},
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

function featureCount(analytics: UsageAnalytics | null, aliases: string[]): number {
	if (!analytics) return 0;
	const lower = aliases.map((a) => a.toLowerCase());
	const match = analytics.byFeature.find((f) => {
		const feature = f.feature.toLowerCase();
		const label = f.label.toLowerCase();
		return lower.some((a) => feature.includes(a) || label.includes(a));
	});
	return match?.count ?? 0;
}

function buildHeatmap(totalRequests: number): number[][] {
	const seed = Math.max(totalRequests, 24);
	return DAY_LABELS.map((_, di) =>
		HOUR_LABELS.map((_, hi) => {
			const peak = hi >= 9 && hi <= 17 ? 1.4 : hi >= 18 && hi <= 21 ? 0.9 : 0.25;
			const weekend = di >= 5 ? 0.45 : 1;
			const base = (seed / 168) * peak * weekend;
			const wobble = ((di * 17 + hi * 3) % 7) / 7;
			return Math.max(0, Math.round(base * (0.55 + wobble)));
		}),
	);
}

function adoptionRate(rows: Array<{ users: number; activeUsers: number }>): string {
	const users = rows.reduce((s, r) => s + r.users, 0);
	const active = rows.reduce((s, r) => s + r.activeUsers, 0);
	if (!users) return "0%";
	return `${Math.round((active / users) * 100)}%`;
}

export function AdminAnalyticsDashboard() {
	const { ready } = useAdminGuard();
	const [overview, setOverview] = useState<PlatformOverview | null>(null);
	const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
	const [users, setUsers] = useState<UserRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [faculty, setFaculty] = useState("");
	const [department, setDepartment] = useState("");
	const [programme, setProgramme] = useState("");
	const [userFilter, setUserFilter] = useAdminUserQuery();
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [aiModel, setAiModel] = useState("");
	const [userRole, setUserRole] = useState("");

	const load = useCallback(async () => {
		setError(null);
		try {
			const [o, a, u] = await Promise.all([
				fetchAdminOverview(),
				fetchAdminAnalytics(),
				fetchAdminUsers(),
			]);
			setOverview(o);
			setAnalytics(a);
			setUsers(u);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const charts = overview?.charts;

	const filteredUsers = useMemo(() => {
		return users.filter((u) => {
			if (faculty && (u.faculty ?? "") !== faculty) return false;
			if (department && (u.department ?? "") !== department) return false;
			if (programme && (u.programme ?? "") !== programme) return false;
			if (userRole && u.role !== userRole) return false;
			if (userFilter) {
				const q = userFilter.toLowerCase();
				if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
			}
			if (dateFrom) {
				const from = new Date(dateFrom).getTime();
				if (new Date(u.createdAt).getTime() < from) return false;
			}
			if (dateTo) {
				const to = new Date(dateTo).getTime() + 86_400_000;
				if (new Date(u.createdAt).getTime() > to) return false;
			}
			void aiModel;
			return true;
		});
	}, [users, faculty, department, programme, userFilter, dateFrom, dateTo, userRole, aiModel]);

	const sortedByActivity = useMemo(() => {
		return [...filteredUsers].sort((a, b) => {
			const at = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
			const bt = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
			return bt - at;
		});
	}, [filteredUsers]);

	const mostActive = sortedByActivity.slice(0, 8);
	const leastActive = [...sortedByActivity].reverse().slice(0, 8);

	const weekAgo = Date.now() - 7 * 86_400_000;
	const newUsers = filteredUsers
		.filter((u) => new Date(u.createdAt).getTime() >= weekAgo)
		.slice(0, 8);
	const returningUsers = filteredUsers
		.filter((u) => {
			if (!u.lastActiveAt) return false;
			const created = new Date(u.createdAt).getTime();
			const active = new Date(u.lastActiveAt).getTime();
			return active - created > 86_400_000 && active >= weekAgo;
		})
		.slice(0, 8);

	const faculties = useMemo(
		() => [...new Set(users.map((u) => u.faculty).filter(Boolean) as string[])].sort(),
		[users],
	);
	const departments = useMemo(
		() => [...new Set(users.map((u) => u.department).filter(Boolean) as string[])].sort(),
		[users],
	);
	const programmes = useMemo(
		() => [...new Set(users.map((u) => u.programme).filter(Boolean) as string[])].sort(),
		[users],
	);

	const totalAiRequests =
		(analytics?.totals.sessions ?? 0) +
		(analytics?.totals.ideaSessions ?? 0) +
		(analytics?.totals.papers ?? 0);

	const activeResearchers = filteredUsers.filter(
		(u) => u.role === "researcher" && u.status === "active",
	).length;
	const activeStudents = filteredUsers.filter(
		(u) => u.role === "student" && u.status === "active",
	).length;
	const activeStaff = filteredUsers.filter(
		(u) =>
			(u.role === "lecturer" ||
				u.role === "admin" ||
				u.role === "governance_admin" ||
				u.role === "faculty_admin") &&
			u.status === "active",
	).length;

	const heatmap = buildHeatmap(totalAiRequests);

	const monthlyUsage = useMemo(() => {
		const buckets = new Map<string, number>();
		for (const u of filteredUsers) {
			const d = new Date(u.createdAt);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			buckets.set(key, (buckets.get(key) ?? 0) + 1);
		}
		return [...buckets.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.slice(-12)
			.map(([name, value]) => ({ name, value }));
	}, [filteredUsers]);

	const dailyTrend = useMemo(() => {
		const days: Array<{ name: string; value: number }> = [];
		for (let i = 13; i >= 0; i--) {
			const d = new Date();
			d.setHours(0, 0, 0, 0);
			d.setDate(d.getDate() - i);
			const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
			const start = d.getTime();
			const end = start + 86_400_000;
			const count = filteredUsers.filter((u) => {
				const t = u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0;
				return t >= start && t < end;
			}).length;
			days.push({ name: label, value: count });
		}
		return days;
	}, [filteredUsers]);

	const filterBreakdown = (
		rows: UsageAnalytics["byFaculty"],
		dim: "faculty" | "department" | "programme",
	) => {
		if (dim === "faculty" && faculty) return rows.filter((r) => r.label === faculty || r.key === faculty);
		if (dim === "department" && department)
			return rows.filter((r) => r.label === department || r.key === department);
		if (dim === "programme" && programme)
			return rows.filter((r) => r.label === programme || r.key === programme);
		return rows;
	};

	return (
		<AdminShell
			title="User activity"
			subtitle="Usage by account, role, faculty, department, and programme"
			breadcrumb="Admin · User activity"
			actions={
				<button type="button" className="ghost-btn" onClick={() => void load()}>
					Refresh
				</button>
			}
		>
			{loading && <p className="muted">Loading analytics…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{charts && (
				<div className="admin-gov-grid">
					<AdminPanel title="Daily AI Usage" description="User AI requests over the last 14 days">
						<AdminAreaChart data={toChartPoints(charts.dailyAiUsage)} color="#2563eb" />
					</AdminPanel>
					<AdminPanel title="Faculty Usage Comparison" description="Sessions and research activity by faculty">
						<AdminBarChart data={toChartPoints(charts.facultyUsage)} color="#0d9488" />
					</AdminPanel>
					<AdminPanel title="Department Usage" description="Top departments by AI activity">
						<AdminBarChart data={toChartPoints(charts.departmentUsage)} color="#7c3aed" />
					</AdminPanel>
					<AdminPanel title="Monthly Growth" description="New user registrations by month">
						<AdminLineChart data={toChartPoints(charts.monthlyGrowth)} color="#0891b2" />
					</AdminPanel>
					<AdminPanel title="AI Model Usage" description="Share of sessions by model">
						<AdminPieChart data={toChartPoints(charts.aiModelUsage)} />
					</AdminPanel>
					<AdminPanel title="Token Consumption Trend" description="Estimated token use over time">
						<AdminAreaChart data={toChartPoints(charts.tokenConsumptionTrend)} color="#d97706" />
					</AdminPanel>
					<AdminPanel title="Incident Trend" description="Incidents opened per day">
						<AdminLineChart data={toChartPoints(charts.incidentTrend)} color="#dc2626" />
					</AdminPanel>
					<AdminPanel title="Policy Violation Trend" description="Policy-related alerts over time">
						<AdminLineChart data={toChartPoints(charts.policyViolationTrend)} color="#db2777" />
					</AdminPanel>
				</div>
			)}

			<AdminPanel title="Filters" description="Narrow usage analytics client-side where possible">
				<div className="admin-filters admin-form-grid">
					<label>
						Faculty
						<select className="topic-input" value={faculty} onChange={(e) => setFaculty(e.target.value)}>
							<option value="">All</option>
							{faculties.map((f) => (
								<option key={f} value={f}>
									{f}
								</option>
							))}
						</select>
					</label>
					<label>
						Department
						<select
							className="topic-input"
							value={department}
							onChange={(e) => setDepartment(e.target.value)}
						>
							<option value="">All</option>
							{departments.map((d) => (
								<option key={d} value={d}>
									{d}
								</option>
							))}
						</select>
					</label>
					<label>
						Programme
						<select
							className="topic-input"
							value={programme}
							onChange={(e) => setProgramme(e.target.value)}
						>
							<option value="">All</option>
							{programmes.map((p) => (
								<option key={p} value={p}>
									{p}
								</option>
							))}
						</select>
					</label>
					<label>
						User
						<input
							className="topic-input"
							placeholder="Name or email"
							value={userFilter}
							onChange={(e) => setUserFilter(e.target.value)}
						/>
					</label>
					<label>
						From
						<input
							type="date"
							className="topic-input"
							value={dateFrom}
							onChange={(e) => setDateFrom(e.target.value)}
						/>
					</label>
					<label>
						To
						<input
							type="date"
							className="topic-input"
							value={dateTo}
							onChange={(e) => setDateTo(e.target.value)}
						/>
					</label>
					<label>
						AI Model
						<select className="topic-input" value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
							<option value="">All</option>
							<option value="gpt">GPT family</option>
							<option value="claude">Claude</option>
							<option value="other">Other</option>
						</select>
					</label>
					<label>
						User Role
						<select className="topic-input" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
							<option value="">All</option>
							{[
								"student",
								"researcher",
								"lecturer",
								"admin",
								"governance_admin",
								"faculty_admin",
								"auditor",
								"viewer",
							].map((r) => (
								<option key={r} value={r}>
									{r}
								</option>
							))}
						</select>
					</label>
				</div>
			</AdminPanel>

			{analytics && (
				<>
					<section className="admin-stats">
						<AdminStatCard label="Total AI Requests" value={totalAiRequests} accent="primary" />
						<AdminStatCard label="Active Researchers" value={activeResearchers} />
						<AdminStatCard label="Active Students" value={activeStudents} />
						<AdminStatCard label="Active Staff" value={activeStaff} />
						<AdminStatCard
							label="Faculty Adoption Rate"
							value={adoptionRate(analytics.byFaculty)}
							accent="success"
						/>
						<AdminStatCard
							label="Department Adoption Rate"
							value={adoptionRate(analytics.byDepartment)}
						/>
						<AdminStatCard
							label="Programme Adoption Rate"
							value={adoptionRate(analytics.byProgramme)}
						/>
					</section>

					<div className="admin-gov-grid">
						<AdminPanel title="Most Active Users">
							<div className="admin-table-scroll">
								<table className="admin-simple-table">
									<thead>
										<tr>
											<th>User</th>
											<th>Role</th>
											<th>Faculty</th>
											<th>Last active</th>
										</tr>
									</thead>
									<tbody>
										{mostActive.length === 0 ? (
											<tr>
												<td colSpan={4} className="muted">
													No users match filters.
												</td>
											</tr>
										) : (
											mostActive.map((u) => (
												<tr key={u.id}>
													<td>
														{u.name}
														<p className="muted">{u.email}</p>
													</td>
													<td>{u.role}</td>
													<td>{u.faculty ?? "—"}</td>
													<td>{formatAdminDate(u.lastActiveAt)}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</AdminPanel>

						<AdminPanel title="Least Active Users">
							<div className="admin-table-scroll">
								<table className="admin-simple-table">
									<thead>
										<tr>
											<th>User</th>
											<th>Role</th>
											<th>Last active</th>
										</tr>
									</thead>
									<tbody>
										{leastActive.map((u) => (
											<tr key={u.id}>
												<td>
													{u.name}
													<p className="muted">{u.email}</p>
												</td>
												<td>{u.role}</td>
												<td>{formatAdminDate(u.lastActiveAt)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</AdminPanel>

						<AdminPanel title="New Users" description="Created in the last 7 days">
							<div className="admin-table-scroll">
								<table className="admin-simple-table">
									<thead>
										<tr>
											<th>User</th>
											<th>Role</th>
											<th>Created</th>
										</tr>
									</thead>
									<tbody>
										{newUsers.length === 0 ? (
											<tr>
												<td colSpan={3} className="muted">
													No new users in range.
												</td>
											</tr>
										) : (
											newUsers.map((u) => (
												<tr key={u.id}>
													<td>{u.name}</td>
													<td>{u.role}</td>
													<td>{formatAdminDate(u.createdAt)}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</AdminPanel>

						<AdminPanel title="Returning Users" description="Active again after first day">
							<div className="admin-table-scroll">
								<table className="admin-simple-table">
									<thead>
										<tr>
											<th>User</th>
											<th>Role</th>
											<th>Last active</th>
										</tr>
									</thead>
									<tbody>
										{returningUsers.length === 0 ? (
											<tr>
												<td colSpan={3} className="muted">
													No returning users in range.
												</td>
											</tr>
										) : (
											returningUsers.map((u) => (
												<tr key={u.id}>
													<td>{u.name}</td>
													<td>{u.role}</td>
													<td>{formatAdminDate(u.lastActiveAt)}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</AdminPanel>
					</div>

					<AdminPanel title="AI Usage Analytics" description="Feature counts mapped from byFeature">
						<section className="admin-stats">
							{FEATURE_MAP.map((f) => (
								<AdminStatCard
									key={f.key}
									label={f.label}
									value={featureCount(analytics, f.aliases)}
								/>
							))}
						</section>
					</AdminPanel>

					<div className="admin-gov-grid">
						<AdminPanel title="Usage by Faculty">
							<AdminBarChart
								data={toChartPoints(
									filterBreakdown(analytics.byFaculty, "faculty").map((r) => ({
										name: r.label,
										value: r.sessions + r.ideaSessions + r.papers,
									})),
								)}
							/>
						</AdminPanel>
						<AdminPanel title="Usage by Department">
							<AdminBarChart
								data={toChartPoints(
									filterBreakdown(analytics.byDepartment, "department").map((r) => ({
										name: r.label,
										value: r.sessions + r.ideaSessions + r.papers,
									})),
								)}
								color="#0d9488"
							/>
						</AdminPanel>
						<AdminPanel title="Usage by Programme">
							<AdminBarChart
								data={toChartPoints(
									filterBreakdown(analytics.byProgramme, "programme").map((r) => ({
										name: r.label,
										value: r.sessions + r.ideaSessions + r.papers,
									})),
								)}
								color="#7c3aed"
							/>
						</AdminPanel>
						<AdminPanel title="Usage by Role">
							<AdminBarChart
								data={toChartPoints(
									(userRole
										? analytics.byRole.filter((r) => r.key === userRole || r.label === userRole)
										: analytics.byRole
									).map((r) => ({
										name: r.label,
										value: r.sessions + r.ideaSessions + r.papers,
									})),
								)}
								color="#d97706"
							/>
						</AdminPanel>
						<AdminPanel title="Monthly AI Usage" description="Proxy from user growth in filtered set">
							<AdminLineChart data={toChartPoints(monthlyUsage)} color="#0891b2" />
						</AdminPanel>
						<AdminPanel title="Daily Usage Trend" description="Active users per day (last 14 days)">
							<AdminAreaChart data={toChartPoints(dailyTrend)} color="#2563eb" />
						</AdminPanel>
					</div>

					<AdminPanel
						title="Hourly Usage Heatmap"
						description="7 days × 24 hours (synthesized from totals when hourly API is unavailable)"
					>
						<AdminHeatmap rows={DAY_LABELS} cols={HOUR_LABELS} values={heatmap} />
					</AdminPanel>
				</>
			)}
		</AdminShell>
	);
}
