"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
import { bulkAdminResetTokens, fetchAdminTokens } from "@/lib/admin-api";
import type { AdminTokenRecord, TokenAdminStats } from "@/lib/admin";
import {
	LECTURER_TOKEN_ALLOWANCE,
	STUDENT_TOKEN_ALLOWANCE,
} from "@/lib/student-tokens";

function roleLabel(role: string): string {
	if (role === "researcher") return "Lecturer";
	return role.charAt(0).toUpperCase() + role.slice(1);
}

export function AdminTokensDashboard() {
	const { ready } = useAdminGuard();
	const [records, setRecords] = useState<AdminTokenRecord[]>([]);
	const [stats, setStats] = useState<TokenAdminStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editingUser, setEditingUser] = useState<AdminTokenRecord | null>(null);
	const [roleFilter, setRoleFilter] = useState<"all" | "student" | "lecturer">("all");
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [bulkWorking, setBulkWorking] = useState(false);

	const loadTokens = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminTokens();
			setRecords(data.users);
			setStats(data.stats);
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

	const query = search.trim().toLowerCase();
	const filtered = useMemo(() => {
		return records.filter((record) => {
			if (roleFilter === "student" && record.role !== "student") return false;
			if (roleFilter === "lecturer" && record.role !== "lecturer" && record.role !== "researcher") {
				return false;
			}
			if (!query) return true;
			return (
				record.name.toLowerCase().includes(query) ||
				record.email.toLowerCase().includes(query) ||
				record.role.toLowerCase().includes(query)
			);
		});
	}, [records, roleFilter, query]);

	const { pageItems, pagination } = useAdminTable(filtered, { resetDeps: [query, roleFilter] });

	const quotaUsers = records.filter((record) => record.tokenQuota !== null);
	const allVisibleSelected =
		pageItems.length > 0 && pageItems.every((record) => selected.has(record.id));

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
				header: "Name",
				cell: (record: AdminTokenRecord) => (
					<span className="admin-cell-name">{record.name}</span>
				),
			},
			{
				key: "email",
				header: "Email",
				cell: (record: AdminTokenRecord) => record.email,
			},
			{
				key: "role",
				header: "Role",
				cell: (record: AdminTokenRecord) => (
					<span className={`dash-badge dash-badge-role-${record.role}`}>
						{roleLabel(record.role)}
					</span>
				),
			},
			{
				key: "used",
				header: "Used",
				cell: (record: AdminTokenRecord) =>
					record.tokenQuota ? <AdminTokenUsageCell quota={record.tokenQuota} compact /> : "—",
			},
			{
				key: "remaining",
				header: "Remaining",
				cell: (record: AdminTokenRecord) => (
					<span className="dash-mono">
						{record.tokenQuota ? formatTokenCount(record.tokenQuota.remaining) : "—"}
					</span>
				),
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
			title="Tokens"
			subtitle="Manage research token usage and reset quotas"
			breadcrumb="Admin Console"
		>
			{loading && <p className="muted">Loading token data…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Total tokens used" value={stats.totalTokensUsed} accent="primary" />
					<AdminStatCard
						label="Students"
						value={stats.studentsWithQuota}
						hint={`${formatTokenCount(STUDENT_TOKEN_ALLOWANCE)} allowance each`}
					/>
					<AdminStatCard
						label="Lecturers"
						value={stats.lecturersWithQuota}
						hint={`${formatTokenCount(LECTURER_TOKEN_ALLOWANCE)} allowance each`}
					/>
					<AdminStatCard label="Users tracked" value={quotaUsers.length} hint="With token quotas" />
				</section>
			)}

			<AdminPanel
				title="User token usage"
				description={`${filtered.length.toLocaleString()} accounts`}
				actions={
					<button type="button" className="ghost-btn" onClick={() => void loadTokens()}>
						Refresh
					</button>
				}
			>
				<AdminDataTable
					columns={columns}
					data={pageItems}
					rowKey={(record) => record.id}
					loading={loading}
					search={search}
					onSearchChange={setSearch}
					searchPlaceholder="Search name or email…"
					hasActiveFilters={Boolean(query) || roleFilter !== "all"}
					emptyMessage="No users with token quotas yet."
					emptyFilteredMessage="No users match this filter."
					filters={
						<select
							className="topic-input admin-toolbar-select"
							value={roleFilter}
							onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
							aria-label="Filter by role"
						>
							<option value="all">All roles</option>
							<option value="student">Students</option>
							<option value="lecturer">Lecturers</option>
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
