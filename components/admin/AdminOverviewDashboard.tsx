"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import {
	AdminPanel,
	AdminShell,
	AdminStatCard,
	formatAdminDate,
	formatAdminRelative,
} from "@/components/admin/AdminShell";
import {
	formatTokenCount,
	tokenUsagePercent,
} from "@/components/admin/AdminTokenEditModal";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useAdminTable } from "@/hooks/useAdminTable";
import { fetchAdminUsers } from "@/lib/admin-api";
import type { UserRecord } from "@/lib/dashboard";
import { USER_ROLE_OPTIONS, userRoleLabel } from "@/lib/dashboard";

function isAdminRole(role: UserRecord["role"]) {
	return role === "admin" || role === "governance_admin" || role === "faculty_admin";
}

function startOfToday() {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

function daysAgo(n: number) {
	return Date.now() - n * 86_400_000;
}

export function AdminOverviewDashboard() {
	const { ready } = useAdminGuard();
	const [users, setUsers] = useState<UserRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");

	const load = useCallback(async () => {
		setError(null);
		try {
			setUsers(await fetchAdminUsers());
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const today = startOfToday();
	const weekAgo = daysAgo(7);

	const stats = useMemo(() => {
		const active = users.filter((u) => u.status === "active").length;
		const inactive = users.filter((u) => u.status === "inactive").length;
		const suspended = users.filter((u) => u.status === "suspended").length;
		const admins = users.filter((u) => isAdminRole(u.role)).length;
		const students = users.filter((u) => u.role === "student").length;
		const lecturers = users.filter((u) => u.role === "lecturer").length;
		const researchers = users.filter((u) => u.role === "researcher").length;
		const activeToday = users.filter(
			(u) => u.lastActiveAt && new Date(u.lastActiveAt).getTime() >= today,
		).length;
		const newThisWeek = users.filter((u) => new Date(u.createdAt).getTime() >= weekAgo).length;
		const withTokens = users.filter((u) => u.tokenQuota);
		const tokensUsed = withTokens.reduce((sum, u) => sum + (u.tokenQuota?.used ?? 0), 0);
		const tokensAllowance = withTokens.reduce(
			(sum, u) => sum + (u.tokenQuota?.allowance ?? 0),
			0,
		);
		const highUsage = withTokens.filter((u) => {
			const q = u.tokenQuota;
			if (!q || q.allowance <= 0) return false;
			return tokenUsagePercent(q.used, q.allowance) >= 80;
		}).length;
		const faculties = new Set(users.map((u) => u.faculty).filter(Boolean)).size;
		const departments = new Set(users.map((u) => u.department).filter(Boolean)).size;
		const programmes = new Set(users.map((u) => u.programme).filter(Boolean)).size;
		return {
			total: users.length,
			active,
			inactive,
			suspended,
			admins,
			students,
			lecturers,
			researchers,
			activeToday,
			newThisWeek,
			tokensUsed,
			tokensAllowance,
			highUsage,
			faculties,
			departments,
			programmes,
		};
	}, [users, today, weekAgo]);

	const roleBreakdown = useMemo(() => {
		return USER_ROLE_OPTIONS.map((opt) => ({
			...opt,
			count: users.filter((u) =>
				opt.value === "auditor" ? u.role === "auditor" || u.role === "viewer" : u.role === opt.value,
			).length,
		})).filter((row) => row.count > 0);
	}, [users]);

	const query = search.trim().toLowerCase();
	const filtered = useMemo(() => {
		return users
			.filter((user) => {
				if (roleFilter !== "all") {
					if (roleFilter === "auditor") {
						if (user.role !== "auditor" && user.role !== "viewer") return false;
					} else if (user.role !== roleFilter) {
						return false;
					}
				}
				if (statusFilter !== "all" && user.status !== statusFilter) return false;
				if (!query) return true;
				return (
					user.name.toLowerCase().includes(query) ||
					user.email.toLowerCase().includes(query) ||
					(user.faculty?.toLowerCase().includes(query) ?? false) ||
					(user.department?.toLowerCase().includes(query) ?? false) ||
					(user.programme?.toLowerCase().includes(query) ?? false)
				);
			})
			.sort((a, b) => {
				const at = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
				const bt = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
				return bt - at;
			});
	}, [users, roleFilter, statusFilter, query]);

	const { pageItems, pagination } = useAdminTable(filtered, {
		resetDeps: [query, roleFilter, statusFilter],
	});

	const columns = useMemo(
		() => [
			{
				key: "name",
				header: "User",
				cell: (user: UserRecord) => (
					<>
						<span className="admin-cell-name">{user.name}</span>
						<span className="admin-cell-sub">{user.email}</span>
					</>
				),
			},
			{
				key: "role",
				header: "Role",
				cell: (user: UserRecord) => (
					<span className={`dash-badge dash-badge-role-${user.role}`}>
						{userRoleLabel(user.role)}
					</span>
				),
			},
			{
				key: "org",
				header: "Organisation",
				cell: (user: UserRecord) => (
					<>
						<span>{user.faculty ?? "—"}</span>
						<span className="admin-cell-sub">
							{[user.department, user.programme].filter(Boolean).join(" · ") || "—"}
						</span>
					</>
				),
			},
			{
				key: "status",
				header: "Status",
				cell: (user: UserRecord) => (
					<span className={`dash-badge dash-badge-status-${user.status}`}>{user.status}</span>
				),
			},
			{
				key: "lastLogin",
				header: "Last active",
				cell: (user: UserRecord) => (
					<span className="muted" title={formatAdminDate(user.lastActiveAt)}>
						{formatAdminRelative(user.lastActiveAt)}
					</span>
				),
			},
			{
				key: "tokens",
				header: "Tokens",
				cell: (user: UserRecord) =>
					user.tokenQuota ? (
						<span className="dash-mono">
							{formatTokenCount(user.tokenQuota.used)} /{" "}
							{formatTokenCount(user.tokenQuota.allowance)}
						</span>
					) : (
						<span className="muted">—</span>
					),
			},
			{
				key: "actions",
				header: "User links",
				align: "right" as const,
				cell: (user: UserRecord) => (
					<div className="admin-row-actions">
						<Link
							className="ghost-btn"
							href={`/admin/users?user=${encodeURIComponent(user.email)}`}
						>
							Manage
						</Link>
						<Link
							className="ghost-btn"
							href={`/admin/analytics?user=${encodeURIComponent(user.email)}`}
						>
							Activity
						</Link>
						<Link
							className="ghost-btn"
							href={`/admin/tokens?user=${encodeURIComponent(user.email)}`}
						>
							Tokens
						</Link>
						<Link
							className="ghost-btn"
							href={`/admin/audit?user=${encodeURIComponent(user.email)}`}
						>
							Audit
						</Link>
						<Link
							className="ghost-btn"
							href={`/admin/alerts?user=${encodeURIComponent(user.email)}`}
						>
							Alerts
						</Link>
						<Link
							className="ghost-btn"
							href={`/admin/incidents?user=${encodeURIComponent(user.email)}`}
						>
							Incidents
						</Link>
					</div>
				),
			},
		],
		[],
	);

	return (
		<AdminShell
			title="Users overview"
			subtitle="Account health, roles, organisation coverage, and per-user shortcuts"
			breadcrumb="Admin · Users"
			actions={
				<>
					<Link href="/admin/users" className="primary-btn">
						Manage accounts
					</Link>
					<button type="button" className="ghost-btn" onClick={() => void load()}>
						Refresh
					</button>
				</>
			}
		>
			{loading && <p className="muted">Loading users…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			<section className="admin-stats">
				<AdminStatCard label="Total users" value={stats.total} accent="primary" />
				<AdminStatCard label="Active" value={stats.active} accent="success" />
				<AdminStatCard label="Active today" value={stats.activeToday} accent="success" />
				<AdminStatCard label="New this week" value={stats.newThisWeek} />
				<AdminStatCard label="Suspended" value={stats.suspended} accent="warning" />
				<AdminStatCard label="Inactive" value={stats.inactive} />
				<AdminStatCard label="Administrators" value={stats.admins} accent="danger" />
				<AdminStatCard label="Students" value={stats.students} />
				<AdminStatCard label="Lecturers" value={stats.lecturers} />
				<AdminStatCard label="Researchers" value={stats.researchers} />
				<AdminStatCard label="Faculties" value={stats.faculties} />
				<AdminStatCard label="Departments" value={stats.departments} />
				<AdminStatCard label="Programmes" value={stats.programmes} />
				<AdminStatCard
					label="Tokens used"
					value={formatTokenCount(stats.tokensUsed)}
					accent="warning"
				/>
				<AdminStatCard
					label="Token allowance"
					value={formatTokenCount(stats.tokensAllowance)}
				/>
				<AdminStatCard
					label="High token usage (≥80%)"
					value={stats.highUsage}
					accent={stats.highUsage > 0 ? "warning" : undefined}
				/>
			</section>

			<div className="admin-gov-grid">
				<AdminPanel title="Users by role" description="Account distribution across roles">
					<ul className="admin-simple-list" style={{ margin: "0 1.25rem 1.25rem", padding: 0, listStyle: "none" }}>
						{roleBreakdown.length === 0 && <li className="muted">No accounts yet.</li>}
						{roleBreakdown.map((row) => (
							<li
								key={row.value}
								style={{
									display: "flex",
									justifyContent: "space-between",
									gap: "1rem",
									padding: "0.45rem 0",
									borderBottom: "1px solid color-mix(in srgb, currentColor 8%, transparent)",
								}}
							>
								<span>{row.label}</span>
								<span className="dash-mono">{row.count}</span>
							</li>
						))}
					</ul>
				</AdminPanel>

				<AdminPanel
					title="User admin modules"
					description="Every console feature is scoped to accounts"
				>
					<div className="admin-row-actions" style={{ margin: "0 1.25rem 1.25rem", flexWrap: "wrap" }}>
						<Link className="ghost-btn" href="/admin/users">
							Accounts & roles
						</Link>
						<Link className="ghost-btn" href="/admin/analytics">
							User activity
						</Link>
						<Link className="ghost-btn" href="/admin/tokens">
							User tokens
						</Link>
						<Link className="ghost-btn" href="/admin/audit">
							User audit log
						</Link>
						<Link className="ghost-btn" href="/admin/alerts">
							User alerts
						</Link>
						<Link className="ghost-btn" href="/admin/incidents">
							User incidents
						</Link>
						<Link className="ghost-btn" href="/admin/policies">
							Role access policies
						</Link>
						<Link className="ghost-btn" href="/admin/reports">
							User reports
						</Link>
						<Link className="ghost-btn" href="/admin/retention">
							User data retention
						</Link>
						<Link className="ghost-btn" href="/admin/privacy">
							User privacy rules
						</Link>
						<Link className="ghost-btn" href="/admin/contributions">
							User AI disclosures
						</Link>
						<Link className="ghost-btn" href="/admin/provenance">
							User provenance
						</Link>
					</div>
				</AdminPanel>
			</div>

			<AdminPanel
				title="All users"
				description={`${filtered.length.toLocaleString()} of ${users.length.toLocaleString()} accounts · sorted by last activity`}
				actions={
					<Link href="/admin/users" className="ghost-btn">
						Open full user management
					</Link>
				}
			>
				<AdminDataTable
					columns={columns}
					data={pageItems}
					rowKey={(user) => user.id}
					loading={loading}
					search={search}
					onSearchChange={setSearch}
					searchPlaceholder="Search name, email, faculty, department…"
					hasActiveFilters={Boolean(query) || roleFilter !== "all" || statusFilter !== "all"}
					emptyMessage="No accounts yet. Create users in User management."
					emptyFilteredMessage="No users match your filters."
					filters={
						<>
							<select
								className="topic-input admin-toolbar-select"
								value={roleFilter}
								onChange={(e) => setRoleFilter(e.target.value)}
								aria-label="Filter by role"
							>
								<option value="all">All roles</option>
								{USER_ROLE_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
							<select
								className="topic-input admin-toolbar-select"
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								aria-label="Filter by status"
							>
								<option value="all">All statuses</option>
								<option value="active">Active</option>
								<option value="inactive">Inactive</option>
								<option value="suspended">Suspended</option>
							</select>
						</>
					}
					pagination={pagination}
				/>
			</AdminPanel>
		</AdminShell>
	);
}
