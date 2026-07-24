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
	AdminTokenEditModal,
	formatTokenCount,
	resetUserTokensQuick,
	tokenUsagePercent,
} from "@/components/admin/AdminTokenEditModal";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useAdminTable } from "@/hooks/useAdminTable";
import { useAdminUserQuery } from "@/hooks/useAdminUserQuery";
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
import type { CreateUserInput, UserRecord, UserRole } from "@/lib/dashboard";
import { USER_ROLE_OPTIONS, userRoleLabel } from "@/lib/dashboard";

type UserFormMode = "create" | "edit";

type UserFormProps = {
	mode: UserFormMode;
	initial?: Partial<CreateUserInput>;
	title: string;
	submitLabel: string;
	roleOptions?: Array<{ label: string; value: UserRole }>;
	onSubmit: (input: CreateUserInput) => Promise<void>;
	onCancel: () => void;
};

function UserForm({
	mode,
	initial,
	title,
	submitLabel,
	roleOptions = USER_ROLE_OPTIONS,
	onSubmit,
	onCancel,
}: UserFormProps) {
	const [name, setName] = useState(initial?.name ?? "");
	const [email, setEmail] = useState(initial?.email ?? "");
	const [role, setRole] = useState<UserRole>(
		(initial?.role === "viewer" ? "auditor" : initial?.role) ?? "lecturer",
	);
	const [status, setStatus] = useState<UserRecord["status"]>(initial?.status ?? "active");
	const [department, setDepartment] = useState(initial?.department ?? "");
	const [institution, setInstitution] = useState(initial?.institution ?? "");
	const [faculty, setFaculty] = useState(initial?.faculty ?? "");
	const [programme, setProgramme] = useState(initial?.programme ?? "");
	const [cohort, setCohort] = useState(initial?.cohort ?? "");
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
				faculty: faculty.trim() || undefined,
				programme: programme.trim() || undefined,
				cohort: cohort.trim() || undefined,
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
								Name
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
							<label className="field-label" htmlFor="user-role">
								Role
							</label>
							<select
								id="user-role"
								className="topic-input"
								value={role}
								onChange={(e) => setRole(e.target.value as UserRole)}
							>
								{roleOptions.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
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
								<option value="inactive">Inactive / deactivated</option>
								<option value="suspended">Suspended</option>
							</select>
						</div>
						<div>
							<label className="field-label" htmlFor="user-faculty">
								Faculty
							</label>
							<input
								id="user-faculty"
								className="topic-input"
								value={faculty}
								onChange={(e) => setFaculty(e.target.value)}
								placeholder="Optional"
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
							<label className="field-label" htmlFor="user-programme">
								Programme
							</label>
							<input
								id="user-programme"
								className="topic-input"
								value={programme}
								onChange={(e) => setProgramme(e.target.value)}
								placeholder="Optional"
							/>
						</div>
						<div>
							<label className="field-label" htmlFor="user-cohort">
								Cohort
							</label>
							<input
								id="user-cohort"
								className="topic-input"
								value={cohort}
								onChange={(e) => setCohort(e.target.value)}
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
					<p className="muted">
						Set a new password for {user.name} ({user.email})
					</p>
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

function AssignFieldModal({
	user,
	field,
	label,
	roleOptions = USER_ROLE_OPTIONS,
	onClose,
	onSaved,
}: {
	user: UserRecord;
	field: "role" | "faculty" | "department" | "programme";
	label: string;
	roleOptions?: Array<{ label: string; value: UserRole }>;
	onClose: () => void;
	onSaved: () => Promise<void>;
}) {
	const [value, setValue] = useState(
		field === "role"
			? user.role === "viewer"
				? "auditor"
				: user.role
			: (user[field] ?? ""),
	);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		try {
			await updateAdminUser(user.id, {
				[field]: field === "role" ? value : value.trim() || undefined,
			} as CreateUserInput);
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
					<h3>{label}</h3>
					<button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
						×
					</button>
				</div>
				<form className="dash-form" onSubmit={handleSubmit}>
					<p className="muted">
						{user.name} · {user.email}
					</p>
					<label className="field-label" htmlFor="assign-field">
						{label.replace(/^Assign /, "")}
					</label>
					{field === "role" ? (
						<select
							id="assign-field"
							className="topic-input"
							value={value}
							onChange={(e) => setValue(e.target.value)}
						>
							{roleOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					) : (
						<input
							id="assign-field"
							className="topic-input"
							value={value}
							onChange={(e) => setValue(e.target.value)}
							required
						/>
					)}
					{error && <p className="error-text">{error}</p>}
					<div className="dash-form-actions">
						<button type="button" className="ghost-btn" onClick={onClose}>
							Cancel
						</button>
						<button type="submit" className="primary-btn" disabled={saving}>
							{saving ? "Saving…" : "Save"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export function AdminUsersDashboard() {
	const { ready, user: actor } = useAdminGuard();
	const [users, setUsers] = useState<UserRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useAdminUserQuery();
	const [roleFilter, setRoleFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [showCreate, setShowCreate] = useState(false);
	const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
	const [resetUser, setResetUser] = useState<UserRecord | null>(null);
	const [editingTokenUser, setEditingTokenUser] = useState<UserRecord | null>(null);
	const [assignTarget, setAssignTarget] = useState<{
		user: UserRecord;
		field: "role" | "faculty" | "department" | "programme";
		label: string;
	} | null>(null);
	const [bulkWorking, setBulkWorking] = useState(false);

	const roleOptions = useMemo(() => {
		if (actor?.role === "admin") return USER_ROLE_OPTIONS;
		return USER_ROLE_OPTIONS.filter((opt) => opt.value !== "admin");
	}, [actor?.role]);

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
				(user.programme?.toLowerCase().includes(query) ?? false) ||
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

	const setStatus = async (user: UserRecord, status: UserRecord["status"]) => {
		await updateAdminUser(user.id, { status });
		await loadUsers();
	};

	const runBulkStatus = async (status: "active" | "inactive" | "suspended") => {
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
	const suspendedCount = users.filter((u) => u.status === "suspended").length;
	const adminCount = users.filter(
		(u) => u.role === "admin" || u.role === "governance_admin" || u.role === "faculty_admin",
	).length;

	const userColumns = useMemo(
		() => [
			{
				key: "name",
				header: "Name",
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
				key: "faculty",
				header: "Faculty",
				cell: (user: UserRecord) => user.faculty ?? "—",
			},
			{
				key: "department",
				header: "Department",
				cell: (user: UserRecord) => user.department ?? "—",
			},
			{
				key: "programme",
				header: "Programme",
				cell: (user: UserRecord) => user.programme ?? "—",
			},
			{
				key: "status",
				header: "Status",
				cell: (user: UserRecord) => (
					<span className={`dash-badge dash-badge-status-${user.status}`}>{user.status}</span>
				),
			},
			{
				key: "registered",
				header: "Registration",
				cell: (user: UserRecord) => (
					<span className="muted">{formatAdminDate(user.createdAt)}</span>
				),
			},
			{
				key: "lastLogin",
				header: "Last login",
				cell: (user: UserRecord) => (
					<span className="muted" title={formatAdminDate(user.lastActiveAt)}>
						{formatAdminRelative(user.lastActiveAt)}
					</span>
				),
			},
			{
				key: "aiUsage",
				header: "AI usage",
				cell: (user: UserRecord) =>
					user.tokenQuota ? (
						<span className="dash-mono">{formatTokenCount(user.tokenQuota.used)}</span>
					) : (
						<span className="muted">—</span>
					),
			},
			{
				key: "tokenUsage",
				header: "Tokens",
				cell: (user: UserRecord) =>
					user.tokenQuota ? (
						<span className="admin-token-cell">
							<span className="dash-mono">
								{formatTokenCount(user.tokenQuota.used)}/
								{formatTokenCount(user.tokenQuota.allowance)}
							</span>
							<span
								className="admin-token-bar-track"
								title={`${tokenUsagePercent(user.tokenQuota.used, user.tokenQuota.allowance)}%`}
							>
								<span
									className="admin-token-bar-fill"
									style={{
										width: `${tokenUsagePercent(
											user.tokenQuota.used,
											user.tokenQuota.allowance,
										)}%`,
									}}
								/>
							</span>
						</span>
					) : (
						<span className="muted">—</span>
					),
			},
			{
				key: "actions",
				header: "Actions",
				align: "right" as const,
				cell: (user: UserRecord) => (
					<div className="admin-row-actions admin-row-actions-compact">
						<button type="button" className="ghost-btn" onClick={() => setEditingUser(user)}>
							Edit
						</button>
						{user.status !== "active" ? (
							<button
								type="button"
								className="ghost-btn"
								onClick={() => void setStatus(user, "active")}
							>
								Activate
							</button>
						) : (
							<button
								type="button"
								className="ghost-btn"
								onClick={() => void setStatus(user, "suspended")}
							>
								Suspend
							</button>
						)}
						{user.tokenQuota && (
							<button
								type="button"
								className="ghost-btn"
								onClick={() => setEditingTokenUser(user)}
							>
								Tokens
							</button>
						)}
						<details className="admin-actions-menu">
							<summary className="ghost-btn admin-actions-menu-trigger">More</summary>
							<div
								className="admin-actions-menu-panel"
								onClick={(e) => {
									const root = (e.currentTarget.parentElement as HTMLDetailsElement | null);
									if (root) root.open = false;
								}}
							>
								{user.status !== "inactive" && (
									<button
										type="button"
										onClick={() => void setStatus(user, "inactive")}
									>
										Deactivate
									</button>
								)}
								<button type="button" onClick={() => setResetUser(user)}>
									Reset password
								</button>
								<button
									type="button"
									onClick={() =>
										setAssignTarget({ user, field: "role", label: "Assign Role" })
									}
								>
									Assign role
								</button>
								<button
									type="button"
									onClick={() =>
										setAssignTarget({ user, field: "faculty", label: "Assign Faculty" })
									}
								>
									Assign faculty
								</button>
								<button
									type="button"
									onClick={() =>
										setAssignTarget({
											user,
											field: "department",
											label: "Assign Department",
										})
									}
								>
									Assign department
								</button>
								<button
									type="button"
									onClick={() =>
										setAssignTarget({
											user,
											field: "programme",
											label: "Assign Programme",
										})
									}
								>
									Assign programme
								</button>
								{user.tokenQuota && (
									<button
										type="button"
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
								)}
								<Link href={`/admin/audit?user=${encodeURIComponent(user.email)}`}>
									Audit history
								</Link>
								<Link href={`/admin/analytics?user=${encodeURIComponent(user.email)}`}>
									AI activity
								</Link>
								<Link href={`/admin/tokens?user=${encodeURIComponent(user.email)}`}>
									Token usage
								</Link>
								<Link href={`/admin/alerts?user=${encodeURIComponent(user.email)}`}>
									Alerts
								</Link>
								<Link href={`/admin/incidents?user=${encodeURIComponent(user.email)}`}>
									Incidents
								</Link>
								<Link href={`/admin/retention?user=${encodeURIComponent(user.email)}`}>
									Data retention
								</Link>
								<button
									type="button"
									className="admin-actions-menu-danger"
									onClick={() => void removeUser(user.id)}
								>
									Delete
								</button>
							</div>
						</details>
					</div>
				),
			},
		],
		[loadUsers],
	);

	return (
		<AdminShell
			title="Account management"
			subtitle="Create accounts, assign roles and organisational units, and manage activation status"
			breadcrumb="Admin · Users"
			actions={
				<button type="button" className="primary-btn" onClick={() => setShowCreate(true)}>
					Create User
				</button>
			}
		>
			{loading && <p className="muted">Loading accounts…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			<section className="admin-stats">
				<AdminStatCard label="Total accounts" value={users.length} accent="primary" />
				<AdminStatCard label="Active" value={activeCount} accent="success" />
				<AdminStatCard label="Suspended" value={suspendedCount} accent="warning" />
				<AdminStatCard label="Administrators" value={adminCount} accent="danger" />
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
					searchPlaceholder="Search name, email, faculty, department…"
					hasActiveFilters={Boolean(query) || roleFilter !== "all" || statusFilter !== "all"}
					emptyMessage="No accounts yet. Create your first user."
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
										onClick={() => void runBulkStatus("suspended")}
									>
										Suspend
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
									<button
										type="button"
										className="ghost-btn"
										onClick={() => setSelected(new Set())}
									>
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
					title="Create User"
					submitLabel="Create User"
					roleOptions={roleOptions}
					onSubmit={createUser}
					onCancel={() => setShowCreate(false)}
				/>
			)}

			{editingUser && (
				<UserForm
					mode="edit"
					title="Edit User"
					submitLabel="Save changes"
					roleOptions={roleOptions}
					initial={{
						name: editingUser.name,
						email: editingUser.email,
						role: editingUser.role,
						status: editingUser.status,
						department: editingUser.department ?? "",
						institution: editingUser.institution ?? "",
						faculty: editingUser.faculty ?? "",
						programme: editingUser.programme ?? "",
						cohort: editingUser.cohort ?? "",
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

			{assignTarget && (
				<AssignFieldModal
					user={assignTarget.user}
					field={assignTarget.field}
					label={assignTarget.label}
					roleOptions={roleOptions}
					onClose={() => setAssignTarget(null)}
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
