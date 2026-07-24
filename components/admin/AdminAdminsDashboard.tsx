"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
	AdminPanel,
	AdminStatCard,
	formatAdminDate,
	SuperAdminShell,
} from "@/components/admin/SuperAdminShell";
import { useSuperAdminGuard } from "@/hooks/useAdminGuard";
import {
	createAdminUser,
	fetchAdminConsoleAdmins,
	fetchAdminUniversities,
	updateAdminUser,
	type UniversityRecord,
} from "@/lib/admin-api";
import type { UserRecord, UserRole } from "@/lib/dashboard";
import { userRoleLabel } from "@/lib/dashboard";

const UNI_ADMIN_ROLES: Array<{ label: string; value: UserRole }> = [
	{ label: "Faculty Administrator", value: "faculty_admin" },
	{ label: "Governance Administrator", value: "governance_admin" },
	{ label: "Auditor", value: "auditor" },
];

export function AdminAdminsDashboard() {
	const { ready } = useSuperAdminGuard();
	const [admins, setAdmins] = useState<UserRecord[]>([]);
	const [universities, setUniversities] = useState<UniversityRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState<UserRole>("faculty_admin");
	const [universityId, setUniversityId] = useState("");

	const load = useCallback(async () => {
		setError(null);
		try {
			const [adminList, uniList] = await Promise.all([
				fetchAdminConsoleAdmins(),
				fetchAdminUniversities(),
			]);
			setAdmins(adminList);
			setUniversities(uniList);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const uniNameById = useMemo(() => {
		const map = new Map(universities.map((u) => [u.id, u.name]));
		return map;
	}, [universities]);

	const uniAdmins = admins.filter((a) => a.role !== "admin");
	const superAdmins = admins.filter((a) => a.role === "admin");

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!universityId) {
			setError("Select a university for this admin.");
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const uni = universities.find((u) => u.id === universityId);
			await createAdminUser({
				name,
				email,
				password,
				role,
				status: "active",
				universityId,
				institution: uni?.name,
			});
			setName("");
			setEmail("");
			setPassword("");
			setRole("faculty_admin");
			setUniversityId("");
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	const setStatus = async (admin: UserRecord, status: UserRecord["status"]) => {
		setError(null);
		try {
			await updateAdminUser(admin.id, { status });
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	return (
		<SuperAdminShell
			title="University admins"
			subtitle="Create university admins who can only manage users in their institution."
			breadcrumb="Platform"
		>
			{error && <p className="error-text">{error}</p>}

			<section className="admin-stats">
				<AdminStatCard label="Super admins" value={superAdmins.length} />
				<AdminStatCard label="University admins" value={uniAdmins.length} />
				<AdminStatCard label="Active universities" value={universities.filter((u) => u.status === "active").length} />
			</section>

			<AdminPanel title="Create university admin">
				<form className="admin-form-grid" onSubmit={handleCreate}>
					<label>
						<span>Full name</span>
						<input value={name} onChange={(e) => setName(e.target.value)} required disabled={saving} />
					</label>
					<label>
						<span>Email</span>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							disabled={saving}
						/>
					</label>
					<label>
						<span>Password</span>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={8}
							disabled={saving}
						/>
					</label>
					<label>
						<span>Role</span>
						<select
							value={role}
							onChange={(e) => setRole(e.target.value as UserRole)}
							disabled={saving}
						>
							{UNI_ADMIN_ROLES.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</label>
					<label className="admin-form-span">
						<span>University</span>
						<select
							value={universityId}
							onChange={(e) => setUniversityId(e.target.value)}
							required
							disabled={saving}
						>
							<option value="">Select university…</option>
							{universities.map((uni) => (
								<option key={uni.id} value={uni.id}>
									{uni.name} ({uni.status})
								</option>
							))}
						</select>
					</label>
					<div className="admin-form-span">
						<button type="submit" className="primary-btn" disabled={saving}>
							{saving ? "Creating…" : "Create admin"}
						</button>
					</div>
				</form>
			</AdminPanel>

			<AdminPanel title="University admins">
				{loading ? (
					<p className="muted">Loading…</p>
				) : uniAdmins.length === 0 ? (
					<p className="muted">No university admins yet.</p>
				) : (
					<table className="admin-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Role</th>
								<th>University</th>
								<th>Status</th>
								<th>Created</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{uniAdmins.map((admin) => (
								<tr key={admin.id}>
									<td>
										<strong>{admin.name}</strong>
										<div className="muted">{admin.email}</div>
									</td>
									<td>{userRoleLabel(admin.role)}</td>
									<td>
										{admin.universityId
											? uniNameById.get(admin.universityId) ?? admin.institution ?? "—"
											: "—"}
									</td>
									<td>
										<span className={`pill status-${admin.status}`}>{admin.status}</span>
									</td>
									<td>{formatAdminDate(admin.createdAt)}</td>
									<td>
										{admin.status === "active" ? (
											<button
												type="button"
												className="ghost-btn"
												onClick={() => void setStatus(admin, "suspended")}
											>
												Suspend
											</button>
										) : (
											<button
												type="button"
												className="ghost-btn"
												onClick={() => void setStatus(admin, "active")}
											>
												Activate
											</button>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</AdminPanel>

			<AdminPanel title="Super administrators">
				{superAdmins.length === 0 ? (
					<p className="muted">No super admins found.</p>
				) : (
					<table className="admin-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Email</th>
								<th>Status</th>
								<th>Created</th>
							</tr>
						</thead>
						<tbody>
							{superAdmins.map((admin) => (
								<tr key={admin.id}>
									<td>
										<strong>{admin.name}</strong>
									</td>
									<td>{admin.email}</td>
									<td>{admin.status}</td>
									<td>{formatAdminDate(admin.createdAt)}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</AdminPanel>
		</SuperAdminShell>
	);
}
