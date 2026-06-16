"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminDataTable } from "@/components/admin/AdminDataTable";
import {
	AdminPanel,
	AdminShell,
	AdminStatCard,
	formatAdminDate,
	formatAdminRelative,
} from "@/components/admin/AdminShell";
import { useAdminTable } from "@/hooks/useAdminTable";
import {
	AdminTokenEditModal,
	formatTokenCount,
	resetUserTokensQuick,
	tokenUsagePercent,
} from "@/components/admin/AdminTokenEditModal";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
	bulkAdminDeleteUsers,
	bulkAdminResetTokens,
	bulkAdminUserStatus,
	createAdminUser,
	deleteAdminUser,
	exportUsersCsv,
	fetchAdminUsers,
	resetAdminUserPassword,
	updateAdminUser,
} from "@/lib/admin-api";
import type { CreateUserInput, UserRecord } from "@/lib/dashboard";

function roleLabel(role: UserRecord["role"]): string {
	if (role === "researcher") return "Lecturer";
	return role.charAt(0).toUpperCase() + role.slice(1);
}

type UserFormMode = "create" | "edit";

type UserFormProps = {
	mode: UserFormMode;
	initial?: Partial<CreateUserInput>;
	title: string;
	submitLabel: string;
	onSubmit: (input: CreateUserInput) => Promise<void>;
	onCancel: () => void;
};

function UserForm({ mode, initial, title, submitLabel, onSubmit, onCancel }: UserFormProps) {
	const [name, setName] = useState(initial?.name ?? "");
	const [email, setEmail] = useState(initial?.email ?? "");
	const [role, setRole] = useState<UserRecord["role"]>(initial?.role ?? "lecturer");
	const [status, setStatus] = useState<UserRecord["status"]>(initial?.status ?? "active");
	const [department, setDepartment] = useState(initial?.department ?? "");
	const [institution, setInstitution] = useState(initial?.institution ?? "");
	const [password, setPassword] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		try {
			await onSubmit({
				name,
				email,
				role,
				status,
				department: department.trim() || undefined,
				institution: institution.trim() || undefined,
				...(mode === "create" && password ? { password } : {}),
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="modal-backdrop" onClick={onCancel}>
			<div className="modal dash-modal admin-user-modal" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h3>{title}</h3>
					<button type="button" className="icon-btn" onClick={onCancel} aria-label="Close">
						×
					</button>
				</div>
				<form className="dash-form" onSubmit={handleSubmit}>
					<div className="admin-form-grid">
						<div>
							<label className="field-label" htmlFor="user-name">
								Full name
							</label>
							<input
								id="user-name"
								className="topic-input"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>
						<div>
							<label className="field-label" htmlFor="user-email">
								Email
							</label>
							<input
								id="user-email"
								type="email"
								className="topic-input"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>
						<div>
							<label className="field-label" htmlFor="user-department">
								Department
							</label>
							<input
								id="user-department"
								className="topic-input"
								value={department}
								onChange={(e) => setDepartment(e.target.value)}
								placeholder="Optional"
							/>
						</div>
						<div>
							<label className="field-label" htmlFor="user-institution">
								Institution
							</label>
							<input
								id="user-institution"
								className="topic-input"
								value={institution}
								onChange={(e) => setInstitution(e.target.value)}
								placeholder="Optional"
							/>
						</div>
						<div>
							<label className="field-label" htmlFor="user-role">
								Role
							</label>
							<select
								id="user-role"
								className="topic-input"
								value={role}
								onChange={(e) => setRole(e.target.value as UserRecord["role"])}
							>
								<option value="lecturer">Lecturer</option>
								<option value="student">Student</option>
								<option value="admin">Admin</option>
								<option value="viewer">Viewer</option>
							</select>
						</div>
						<div>
							<label className="field-label" htmlFor="user-status">
								Status
							</label>
							<select
								id="user-status"
								className="topic-input"
								value={status}
								onChange={(e) => setStatus(e.target.value as UserRecord["status"])}
							>
								<option value="active">Active</option>
								<option value="inactive">Inactive</option>
							</select>
						</div>
					</div>
					{mode === "create" && (
						<>
							<label className="field-label" htmlFor="user-password">
								Password
							</label>
							<input
								id="user-password"
								type="password"
								className="topic-input"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Optional — min 8 characters"
								minLength={8}
								autoComplete="new-password"
							/>
						</>
					)}
					{error && <p className="error-text">{error}</p>}
					<div className="dash-form-actions">
						<button type="button" className="ghost-btn" onClick={onCancel}>
							Cancel
						</button>
						<button type="submit" className="primary-btn" disabled={saving}>
							{saving ? "Saving…" : submitLabel}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

function ResetPasswordModal({
	user,
	onClose,
	onSaved,
}: {
	user: UserRecord;
	onClose: () => void;
	onSaved: () => Promise<void>;
}) {
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password !== confirm) {
			setError("Passwords do not match.");
			return;
		}
		if (password.length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await resetAdminUserPassword(user.id, password);
			await onSaved();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal dash-modal" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h3>Reset password</h3>
					<button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
						×
					</button>
				</div>
				<form className="dash-form" onSubmit={handleSubmit}>
					<p className="muted">Set a new password for {user.name} ({user.email})</p>
					<label className="field-label" htmlFor="new-password">
						New password
					</label>
					<input
						id="new-password"
						type="password"
						className="topic-input"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						minLength={8}
						autoComplete="new-password"
					/>
					<label className="field-label" htmlFor="confirm-password">
						Confirm password
					</label>
					<input
						id="confirm-password"
						type="password"
						className="topic-input"
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
						required
						minLength={8}
						autoComplete="new-password"
					/>
					{error && <p className="error-text">{error}</p>}
					<div className="dash-form-actions">
						<button type="button" className="ghost-btn" onClick={onClose}>
							Cancel
						</button>
						<button type="submit" className="primary-btn" disabled={saving}>
							{saving ? "Saving…" : "Reset password"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export function AdminUsersDashboard() {
	const { ready } = useAdminGuard();
	const [users, setUsers] = useState<UserRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [showCreate, setShowCreate] = useState(false);
	const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
	const [resetUser, setResetUser] = useState<UserRecord | null>(null);
	const [editingTokenUser, setEditingTokenUser] = useState<UserRecord | null>(null);
	const [bulkWorking, setBulkWorking] = useState(false);

	const loadUsers = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminUsers();
			setUsers(data);
			setSelected(new Set());
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void loadUsers();
	}, [loadUsers, ready]);

	const query = search.trim().toLowerCase();
	const filtered = useMemo(() => {
		return users.filter((user) => {
			if (roleFilter !== "all" && user.role !== roleFilter) return false;
			if (statusFilter !== "all" && user.status !== statusFilter) return false;
			if (!query) return true;
			return (
				user.name.toLowerCase().includes(query) ||
				user.email.toLowerCase().includes(query) ||
				(user.department?.toLowerCase().includes(query) ?? false) ||
				(user.institution?.toLowerCase().includes(query) ?? false)
			);
		});
	}, [users, roleFilter, statusFilter, query]);

	const { pageItems, pagination } = useAdminTable(filtered, {
		resetDeps: [query, roleFilter, statusFilter],
	});

	const allVisibleSelected =
		pageItems.length > 0 && pageItems.every((user) => selected.has(user.id));

	const toggleAll = () => {
		if (allVisibleSelected) {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const user of pageItems) next.delete(user.id);
				return next;
			});
		} else {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const user of pageItems) next.add(user.id);
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

	const createUser = async (input: CreateUserInput) => {
		await createAdminUser(input);
		setShowCreate(false);
		await loadUsers();
	};

	const saveUser = async (id: string, input: CreateUserInput) => {
		await updateAdminUser(id, input);
		setEditingUser(null);
		await loadUsers();
	};

	const removeUser = async (id: string) => {
		if (!window.confirm("Delete this account? This cannot be undone.")) return;
		await deleteAdminUser(id);
		await loadUsers();
	};

	const toggleStatus = async (user: UserRecord) => {
		await updateAdminUser(user.id, { status: user.status === "active" ? "inactive" : "active" });
		await loadUsers();
	};

	const runBulkStatus = async (status: "active" | "inactive") => {
		const ids = Array.from(selected);
		if (ids.length === 0) return;
		setBulkWorking(true);
		try {
			await bulkAdminUserStatus(ids, status);
			await loadUsers();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBulkWorking(false);
		}
	};

	const runBulkDelete = async () => {
		const ids = Array.from(selected);
		if (ids.length === 0) return;
		if (!window.confirm(`Delete ${ids.length} account(s)? This cannot be undone.`)) return;
		setBulkWorking(true);
		try {
			await bulkAdminDeleteUsers(ids);
			await loadUsers();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBulkWorking(false);
		}
	};

	const runBulkResetTokens = async () => {
		const ids = Array.from(selected).filter((id) => {
			const user = users.find((row) => row.id === id);
			return user?.tokenQuota;
		});
		if (ids.length === 0) return;
		if (!window.confirm(`Reset tokens to 0 for ${ids.length} account(s)?`)) return;
		setBulkWorking(true);
		setError(null);
		try {
			await bulkAdminResetTokens(ids);
			await loadUsers();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBulkWorking(false);
		}
	};

	const activeCount = users.filter((u) => u.status === "active").length;
	const adminCount = users.filter((u) => u.role === "admin").length;

	const userColumns = useMemo(
		() => [
			{
				key: "account",
				header: "Account",
				cell: (user: UserRecord) => (
					<>
						<span className="admin-cell-name">{user.name}</span>
						<span className="admin-cell-sub">{user.email}</span>
						{user.institution && (
							<span className="admin-cell-sub">{user.institution}</span>
						)}
					</>
				),
			},
			{
				key: "role",
				header: "Role",
				cell: (user: UserRecord) => (
					<span className={`dash-badge dash-badge-role-${user.role}`}>
						{roleLabel(user.role)}
					</span>
				),
			},
			{
				key: "status",
				header: "Status",
				cell: (user: UserRecord) => (
					<button
						type="button"
						className={`dash-badge dash-badge-status-${user.status}`}
						onClick={() => void toggleStatus(user)}
						title="Toggle status"
					>
						{user.status}
					</button>
				),
			},
			{
				key: "tokens",
				header: "Tokens",
				cell: (user: UserRecord) =>
					user.tokenQuota ? (
						<>
							<span className="dash-mono">
								{formatTokenCount(user.tokenQuota.used)} /{" "}
								{formatTokenCount(user.tokenQuota.allowance)}
							</span>
							<span className="dash-token-usage">
								<span
									className="dash-token-bar"
									style={{
										width: `${tokenUsagePercent(
											user.tokenQuota.used,
											user.tokenQuota.allowance,
										)}%`,
									}}
								/>
								<span className="muted">
									{tokenUsagePercent(user.tokenQuota.used, user.tokenQuota.allowance)}%
								</span>
							</span>
						</>
					) : (
						<span className="muted">—</span>
					),
			},
			{
				key: "department",
				header: "Department",
				cell: (user: UserRecord) => user.department ?? "—",
			},
			{
				key: "lastActive",
				header: "Last active",
				cell: (user: UserRecord) => (
					<span className="muted" title={formatAdminDate(user.lastActiveAt)}>
						{formatAdminRelative(user.lastActiveAt)}
					</span>
				),
			},
			{
				key: "joined",
				header: "Joined",
				cell: (user: UserRecord) => (
					<span className="muted">{formatAdminDate(user.createdAt)}</span>
				),
			},
			{
				key: "actions",
				header: "",
				align: "right" as const,
				cell: (user: UserRecord) => (
					<div className="admin-row-actions">
						<button type="button" className="ghost-btn" onClick={() => setEditingUser(user)}>
							Edit
						</button>
						<button type="button" className="ghost-btn" onClick={() => setResetUser(user)}>
							Reset pwd
						</button>
						{user.tokenQuota && (
							<>
								<button
									type="button"
									className="ghost-btn"
									onClick={() => setEditingTokenUser(user)}
								>
									Tokens
								</button>
								<button
									type="button"
									className="ghost-btn"
									onClick={() =>
										void resetUserTokensQuick(
											{
												id: user.id,
												name: user.name,
												role: user.role,
												tokenQuota: user.tokenQuota ?? null,
											},
											loadUsers,
										)
									}
								>
									Reset tokens
								</button>
							</>
						)}
						<button
							type="button"
							className="danger-btn"
							onClick={() => void removeUser(user.id)}
						>
							Delete
						</button>
					</div>
				),
			},
		],
		[loadUsers],
	);

	return (
		<AdminShell
			title="Accounts"
			subtitle="Manage users, roles, and access control"
			breadcrumb="Admin Console"
			actions={
				<button type="button" className="primary-btn" onClick={() => setShowCreate(true)}>
					Add account
				</button>
			}
		>
			{loading && <p className="muted">Loading accounts…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			<section className="admin-stats">
				<AdminStatCard label="Total accounts" value={users.length} accent="primary" />
				<AdminStatCard label="Active" value={activeCount} accent="success" />
				<AdminStatCard label="Inactive" value={users.length - activeCount} />
				<AdminStatCard label="Administrators" value={adminCount} accent="warning" />
			</section>

			<AdminPanel
				title="All accounts"
				description={`${filtered.length.toLocaleString()} of ${users.length.toLocaleString()} accounts`}
				actions={
					<>
						<button
							type="button"
							className="ghost-btn"
							onClick={() => exportUsersCsv(filtered)}
							disabled={filtered.length === 0}
						>
							Export CSV
						</button>
						<button type="button" className="ghost-btn" onClick={() => void loadUsers()}>
							Refresh
						</button>
					</>
				}
			>
				<AdminDataTable
					columns={userColumns}
					data={pageItems}
					rowKey={(user) => user.id}
					loading={loading}
					search={search}
					onSearchChange={setSearch}
					searchPlaceholder="Search name, email, department…"
					hasActiveFilters={Boolean(query) || roleFilter !== "all" || statusFilter !== "all"}
					emptyMessage="No accounts yet. Add your first team member."
					emptyFilteredMessage="No accounts match your filters."
					filters={
						<>
							<select
								className="topic-input admin-toolbar-select"
								value={roleFilter}
								onChange={(e) => setRoleFilter(e.target.value)}
								aria-label="Filter by role"
							>
								<option value="all">All roles</option>
								<option value="lecturer">Lecturer</option>
								<option value="student">Student</option>
								<option value="admin">Admin</option>
								<option value="viewer">Viewer</option>
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
							</select>
						</>
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
										onClick={() => void runBulkStatus("active")}
									>
										Activate
									</button>
									<button
										type="button"
										className="ghost-btn"
										disabled={bulkWorking}
										onClick={() => void runBulkStatus("inactive")}
									>
										Deactivate
									</button>
									<button
										type="button"
										className="ghost-btn"
										disabled={bulkWorking}
										onClick={() => void runBulkResetTokens()}
									>
										Reset tokens
									</button>
									<button
										type="button"
										className="danger-btn"
										disabled={bulkWorking}
										onClick={() => void runBulkDelete()}
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

			{showCreate && (
				<UserForm
					mode="create"
					title="Add account"
					submitLabel="Create account"
					onSubmit={createUser}
					onCancel={() => setShowCreate(false)}
				/>
			)}

			{editingUser && (
				<UserForm
					mode="edit"
					title="Edit account"
					submitLabel="Save changes"
					initial={{
						name: editingUser.name,
						email: editingUser.email,
						role: editingUser.role,
						status: editingUser.status,
						department: editingUser.department ?? "",
						institution: editingUser.institution ?? "",
					}}
					onSubmit={(input) => saveUser(editingUser.id, input)}
					onCancel={() => setEditingUser(null)}
				/>
			)}

			{resetUser && (
				<ResetPasswordModal
					user={resetUser}
					onClose={() => setResetUser(null)}
					onSaved={loadUsers}
				/>
			)}

			{editingTokenUser && (
				<AdminTokenEditModal
					user={{
						id: editingTokenUser.id,
						name: editingTokenUser.name,
						role: editingTokenUser.role,
						tokenQuota: editingTokenUser.tokenQuota ?? null,
					}}
					onClose={() => setEditingTokenUser(null)}
					onSaved={loadUsers}
				/>
			)}
		</AdminShell>
	);
}
