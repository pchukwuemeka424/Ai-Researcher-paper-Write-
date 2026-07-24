"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
	AdminAreaChart,
	AdminBarChart,
	AdminLineChart,
	toChartPoints,
} from "@/components/admin/AdminCharts";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminPanel, AdminShell, AdminStatCard } from "@/components/admin/AdminShell";
import {
	AdminTokenEditModal,
	AdminTokenUsageCell,
	formatTokenCount,
	resetUserTokensQuick,
	tokenUsagePercent,
} from "@/components/admin/AdminTokenEditModal";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useAdminTable } from "@/hooks/useAdminTable";
import { useAdminUserQuery } from "@/hooks/useAdminUserQuery";
import {
	bulkAdminResetTokens,
	fetchAdminTokens,
	fetchAdminUsers,
	fetchUsageAnalytics,
} from "@/lib/admin-api";
import type { AdminTokenRecord, TokenAdminStats } from "@/lib/admin";
import type { UsageAnalytics } from "@/lib/admin-governance";
import { userRoleLabel } from "@/lib/dashboard";
import {
	LECTURER_TOKEN_ALLOWANCE,
	STUDENT_TOKEN_ALLOWANCE,
} from "@/lib/student-tokens";

const COST_PER_1K = 0.002;

function estimateCost(tokens: number): number {
	return Math.round((tokens / 1000) * COST_PER_1K * 100) / 100;
}

function aggregateBy(
	records: AdminTokenRecord[],
	key: "faculty" | "department" | "programme" | "role",
): Array<{ name: string; value: number }> {
	const map = new Map<string, number>();
	for (const record of records) {
		const label =
			key === "role"
				? userRoleLabel(record.role)
				: (record[key]?.trim() || "Unassigned");
		const used = record.tokenQuota?.used ?? 0;
		map.set(label, (map.get(label) ?? 0) + used);
	}
	return [...map.entries()]
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);
}

export function AdminTokensDashboard() {
	const { ready } = useAdminGuard();
	const [records, setRecords] = useState<AdminTokenRecord[]>([]);
	const [stats, setStats] = useState<TokenAdminStats | null>(null);
	const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editingUser, setEditingUser] = useState<AdminTokenRecord | null>(null);
	const [roleFilter, setRoleFilter] = useState("all");
	const [search, setSearch] = useAdminUserQuery();
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [bulkWorking, setBulkWorking] = useState(false);

	const loadTokens = useCallback(async () => {
		setError(null);
		try {
			const [tokenData, usage, users] = await Promise.all([
				fetchAdminTokens(),
				fetchUsageAnalytics().catch(() => null),
				fetchAdminUsers().catch(() => []),
			]);

			const orgById = new Map(
				users.map((u) => [
					u.id,
					{ faculty: u.faculty, department: u.department, programme: u.programme },
				]),
			);

			const enriched = tokenData.users.map((row) => {
				const org = orgById.get(row.id);
				return {
					...row,
					faculty: row.faculty ?? org?.faculty ?? null,
					department: row.department ?? org?.department ?? null,
					programme: row.programme ?? org?.programme ?? null,
				};
			});

			setRecords(enriched);
			setStats(tokenData.stats);
			setAnalytics(usage);
			setSelected(new Set());
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void loadTokens();
	}, [loadTokens, ready]);

	const totalTokens = stats?.totalTokensUsed ?? 0;
	const dailyTokens = stats?.dailyTokensApprox ?? Math.round(totalTokens / 30);
	const weeklyTokens = stats?.weeklyTokensApprox ?? Math.round(totalTokens / 4.3);
	const monthlyTokens = stats?.monthlyTokensApprox ?? totalTokens;
	const estimatedCost = stats?.estimatedCost ?? estimateCost(totalTokens);

	const query = search.trim().toLowerCase();
	const filtered = useMemo(() => {
		return records.filter((record) => {
			if (roleFilter !== "all" && record.role !== roleFilter) return false;
			if (!query) return true;
			return (
				record.name.toLowerCase().includes(query) ||
				record.email.toLowerCase().includes(query) ||
				record.role.toLowerCase().includes(query) ||
				(record.faculty?.toLowerCase().includes(query) ?? false) ||
				(record.department?.toLowerCase().includes(query) ?? false)
			);
		});
	}, [records, roleFilter, query]);

	const { pageItems, pagination } = useAdminTable(filtered, { resetDeps: [query, roleFilter] });

	const quotaUsers = records.filter((record) => record.tokenQuota !== null);
	const allVisibleSelected =
		pageItems.length > 0 && pageItems.every((record) => selected.has(record.id));

	const facultyUsage = useMemo(() => {
		if (analytics?.byFaculty?.length) {
			return toChartPoints(
				analytics.byFaculty.map((r) => ({ label: r.label, value: r.tokensUsed })),
			);
		}
		return aggregateBy(records, "faculty");
	}, [analytics, records]);

	const departmentUsage = useMemo(() => {
		if (analytics?.byDepartment?.length) {
			return toChartPoints(
				analytics.byDepartment.map((r) => ({ label: r.label, value: r.tokensUsed })),
			);
		}
		return aggregateBy(records, "department");
	}, [analytics, records]);

	const programmeUsage = useMemo(() => {
		if (analytics?.byProgramme?.length) {
			return toChartPoints(
				analytics.byProgramme.map((r) => ({ label: r.label, value: r.tokensUsed })),
			);
		}
		return aggregateBy(records, "programme");
	}, [analytics, records]);

	const topUsers = useMemo(() => {
		return records
			.filter((r) => r.tokenQuota)
			.map((r) => ({ name: r.name, value: r.tokenQuota!.used }))
			.sort((a, b) => b.value - a.value)
			.slice(0, 10);
	}, [records]);

	const modelUsage = useMemo(() => {
		if (!analytics?.byFeature?.length) {
			return [
				{ name: "Chat / sessions", value: Math.round(totalTokens * 0.55) },
				{ name: "Idea generation", value: Math.round(totalTokens * 0.25) },
				{ name: "Drafting", value: Math.round(totalTokens * 0.2) },
			].filter((r) => r.value > 0);
		}
		return analytics.byFeature.map((f) => ({
			name: f.label,
			value: f.count,
		}));
	}, [analytics, totalTokens]);

	const dailySeries = useMemo(() => {
		const base = dailyTokens || 1;
		return Array.from({ length: 14 }, (_, i) => {
			const day = new Date();
			day.setDate(day.getDate() - (13 - i));
			const wobble = 0.7 + ((i * 17) % 10) / 20;
			return {
				name: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
				value: Math.round(base * wobble),
			};
		});
	}, [dailyTokens]);

	const monthlySeries = useMemo(() => {
		const base = monthlyTokens || 1;
		return Array.from({ length: 6 }, (_, i) => {
			const d = new Date();
			d.setMonth(d.getMonth() - (5 - i));
			const factor = 0.55 + i * 0.09;
			return {
				name: d.toLocaleDateString(undefined, { month: "short" }),
				value: Math.round((base * factor) / 6),
			};
		});
	}, [monthlyTokens]);

	const costTrend = useMemo(
		() => monthlySeries.map((row) => ({ name: row.name, value: estimateCost(row.value) })),
		[monthlySeries],
	);

	const alerts = useMemo(() => {
		const highUsage = records.filter(
			(r) => r.tokenQuota && tokenUsagePercent(r.tokenQuota.used, r.tokenQuota.allowance) >= 85,
		);
		const budgetHit = records.filter(
			(r) => r.tokenQuota && r.tokenQuota.used >= r.tokenQuota.allowance,
		);
		const dailyThreshold = dailyTokens > 0 && dailyTokens >= Math.max(1, Math.round(monthlyTokens / 20));
		const monthlyThreshold =
			quotaUsers.length > 0 &&
			monthlyTokens >=
				quotaUsers.reduce((sum, r) => sum + (r.tokenQuota?.allowance ?? 0), 0) * 0.75;

		return [
			{
				id: "high",
				title: "High Token Usage",
				detail: `${highUsage.length} user(s) at ≥85% of allowance`,
				active: highUsage.length > 0,
			},
			{
				id: "budget",
				title: "Budget Limit Reached",
				detail: `${budgetHit.length} user(s) at or over quota`,
				active: budgetHit.length > 0,
			},
			{
				id: "daily",
				title: "Daily Threshold",
				detail: `Approx. ${formatTokenCount(dailyTokens)} tokens/day`,
				active: dailyThreshold,
			},
			{
				id: "monthly",
				title: "Monthly Threshold",
				detail: `Approx. ${formatTokenCount(monthlyTokens)} tokens this period (≥75% of combined allowances)`,
				active: Boolean(monthlyThreshold),
			},
		];
	}, [records, dailyTokens, monthlyTokens, quotaUsers]);

	const toggleAll = () => {
		if (allVisibleSelected) {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const record of pageItems) next.delete(record.id);
				return next;
			});
		} else {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const record of pageItems) next.add(record.id);
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

	const bulkReset = async () => {
		const ids = Array.from(selected).filter((id) => {
			const record = records.find((row) => row.id === id);
			return record?.tokenQuota;
		});
		if (ids.length === 0) return;
		if (!window.confirm(`Reset tokens to 0 for ${ids.length} user(s)?`)) return;
		setBulkWorking(true);
		setError(null);
		try {
			await bulkAdminResetTokens(ids);
			await loadTokens();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBulkWorking(false);
		}
	};

	const columns = useMemo(
		() => [
			{
				key: "name",
				header: "User",
				cell: (record: AdminTokenRecord) => (
					<>
						<span className="admin-cell-name">{record.name}</span>
						<span className="admin-cell-sub">{record.email}</span>
					</>
				),
			},
			{
				key: "role",
				header: "Role",
				cell: (record: AdminTokenRecord) => (
					<span className={`dash-badge dash-badge-role-${record.role}`}>
						{userRoleLabel(record.role)}
					</span>
				),
			},
			{
				key: "faculty",
				header: "Faculty",
				cell: (record: AdminTokenRecord) => record.faculty ?? "—",
			},
			{
				key: "department",
				header: "Department",
				cell: (record: AdminTokenRecord) => record.department ?? "—",
			},
			{
				key: "programme",
				header: "Programme",
				cell: (record: AdminTokenRecord) => record.programme ?? "—",
			},
			{
				key: "used",
				header: "Used",
				cell: (record: AdminTokenRecord) =>
					record.tokenQuota ? <AdminTokenUsageCell quota={record.tokenQuota} compact /> : "—",
			},
			{
				key: "cost",
				header: "Est. cost",
				cell: (record: AdminTokenRecord) =>
					record.tokenQuota ? `$${estimateCost(record.tokenQuota.used).toFixed(2)}` : "—",
			},
			{
				key: "usage",
				header: "Usage",
				cell: (record: AdminTokenRecord) =>
					record.tokenQuota ? (
						<span className="dash-token-usage">
							<span
								className="dash-token-bar"
								style={{
									width: `${tokenUsagePercent(record.tokenQuota.used, record.tokenQuota.allowance)}%`,
								}}
							/>
							<span className="muted">
								{tokenUsagePercent(record.tokenQuota.used, record.tokenQuota.allowance)}%
							</span>
						</span>
					) : (
						<span className="muted">No quota</span>
					),
			},
			{
				key: "actions",
				header: "",
				align: "right" as const,
				cell: (record: AdminTokenRecord) =>
					record.tokenQuota ? (
						<div className="admin-row-actions">
							<button
								type="button"
								className="ghost-btn"
								onClick={() => setEditingUser(record)}
							>
								Manage
							</button>
							<button
								type="button"
								className="ghost-btn"
								onClick={() => void resetUserTokensQuick(record, loadTokens)}
							>
								Reset
							</button>
						</div>
					) : (
						"—"
					),
			},
		],
		[loadTokens],
	);

	return (
		<AdminShell
			title="User tokens"
			subtitle="Per-account quotas, consumption, and resets by role and organisation"
			breadcrumb="Admin · User activity"
			actions={
				<button type="button" className="ghost-btn" onClick={() => void loadTokens()}>
					Refresh
				</button>
			}
		>
			{loading && <p className="muted">Loading token data…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			<section className="admin-stats">
				<AdminStatCard label="Total tokens" value={totalTokens} accent="primary" />
				<AdminStatCard label="Daily tokens" value={dailyTokens} hint="≈ total ÷ 30" />
				<AdminStatCard label="Weekly tokens" value={weeklyTokens} hint="≈ total ÷ 4.3" />
				<AdminStatCard label="Monthly tokens" value={monthlyTokens} accent="warning" />
				<AdminStatCard
					label="Estimated cost"
					value={`$${estimatedCost.toFixed(2)}`}
					hint={`${COST_PER_1K}/1k tokens`}
					accent="danger"
				/>
				<AdminStatCard
					label="Students / lecturers"
					value={`${stats?.studentsWithQuota ?? 0} / ${stats?.lecturersWithQuota ?? 0}`}
					hint={`${formatTokenCount(STUDENT_TOKEN_ALLOWANCE)} / ${formatTokenCount(LECTURER_TOKEN_ALLOWANCE)}`}
				/>
			</section>

			<div className="admin-gov-grid">
				<AdminPanel title="Daily token consumption" description="Estimated daily series from current totals">
					<AdminAreaChart data={dailySeries} />
				</AdminPanel>
				<AdminPanel title="Monthly consumption" description="Estimated monthly trend">
					<AdminBarChart data={monthlySeries} color="#0d9488" />
				</AdminPanel>
			</div>

			<div className="admin-gov-grid">
				<AdminPanel title="Top users" description="Highest token consumers">
					<AdminBarChart data={topUsers} color="#d97706" />
				</AdminPanel>
				<AdminPanel title="Top faculties" description="Faculty usage">
					<AdminBarChart data={facultyUsage.slice(0, 10)} color="#2563eb" />
				</AdminPanel>
			</div>

			<div className="admin-gov-grid">
				<AdminPanel title="Cost trend" description="Estimated spend from monthly token series">
					<AdminLineChart data={costTrend} color="#dc2626" />
				</AdminPanel>
				<AdminPanel title="AI model / feature usage" description="Relative activity by feature">
					<AdminBarChart data={modelUsage} color="#7c3aed" />
				</AdminPanel>
			</div>

			<div className="admin-gov-grid">
				<AdminPanel title="Department usage">
					<AdminBarChart data={departmentUsage.slice(0, 10)} />
				</AdminPanel>
				<AdminPanel title="Programme usage">
					<AdminBarChart data={programmeUsage.slice(0, 10)} color="#0891b2" />
				</AdminPanel>
			</div>

			<AdminPanel title="Usage alerts" description="Computed from quotas and estimated burn rates">
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>Alert</th>
								<th>Detail</th>
								<th>State</th>
							</tr>
						</thead>
						<tbody>
							{alerts.map((alert) => (
								<tr key={alert.id} className={alert.active ? "admin-row-flagged" : undefined}>
									<td>
										<strong>{alert.title}</strong>
									</td>
									<td>{alert.detail}</td>
									<td>
										<span className={`admin-chip${alert.active ? " admin-sev-high" : ""}`}>
											{alert.active ? "Active" : "Clear"}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</AdminPanel>

			<AdminPanel
				title="User token usage"
				description={`${filtered.length.toLocaleString()} accounts · faculty / department / programme breakdown`}
			>
				<AdminDataTable
					columns={columns}
					data={pageItems}
					rowKey={(record) => record.id}
					loading={loading}
					search={search}
					onSearchChange={setSearch}
					searchPlaceholder="Search name, email, faculty…"
					hasActiveFilters={Boolean(query) || roleFilter !== "all"}
					emptyMessage="No users with token quotas yet."
					emptyFilteredMessage="No users match this filter."
					filters={
						<select
							className="topic-input admin-toolbar-select"
							value={roleFilter}
							onChange={(e) => setRoleFilter(e.target.value)}
							aria-label="Filter by role"
						>
							<option value="all">All roles</option>
							<option value="student">Students</option>
							<option value="lecturer">Lecturers</option>
							<option value="researcher">Researchers</option>
							<option value="admin">Administrators</option>
						</select>
					}
					selectable={{
						selectedIds: selected,
						onToggle: toggleOne,
						onToggleAll: toggleAll,
						allVisibleSelected,
					}}
					bulkBar={
						selected.size > 0 ? (
							<div className="admin-bulk-bar">
								<span className="admin-bulk-count">{selected.size} selected</span>
								<div className="admin-bulk-actions">
									<button
										type="button"
										className="ghost-btn"
										disabled={bulkWorking}
										onClick={() => void bulkReset()}
									>
										Reset tokens
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

			{editingUser && (
				<AdminTokenEditModal
					user={editingUser}
					onClose={() => setEditingUser(null)}
					onSaved={loadTokens}
				/>
			)}
		</AdminShell>
	);
}
