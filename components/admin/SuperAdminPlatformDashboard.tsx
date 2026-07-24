"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
	AdminPanel,
	AdminStatCard,
	formatAdminDate,
	SuperAdminShell,
} from "@/components/admin/SuperAdminShell";
import { useSuperAdminGuard } from "@/hooks/useAdminGuard";
import {
	fetchAdminConsoleAdmins,
	fetchAdminUniversities,
	type UniversityRecord,
} from "@/lib/admin-api";
import type { UserRecord } from "@/lib/dashboard";
import { userRoleLabel } from "@/lib/dashboard";

export function SuperAdminPlatformDashboard() {
	const { ready } = useSuperAdminGuard();
	const [universities, setUniversities] = useState<UniversityRecord[]>([]);
	const [admins, setAdmins] = useState<UserRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const [uniList, adminList] = await Promise.all([
				fetchAdminUniversities(),
				fetchAdminConsoleAdmins(),
			]);
			setUniversities(uniList);
			setAdmins(adminList);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const stats = useMemo(() => {
		const activeUnis = universities.filter((u) => u.status === "active").length;
		const uniAdmins = admins.filter((a) => a.role !== "admin");
		const totalUsers = universities.reduce((sum, u) => sum + u.userCount, 0);
		return {
			activeUnis,
			uniAdminCount: uniAdmins.length,
			totalUsers,
			onboarded: universities.length,
		};
	}, [universities, admins]);

	const recentUnis = useMemo(
		() =>
			[...universities]
				.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
				.slice(0, 6),
		[universities],
	);

	const uniAdmins = useMemo(
		() => admins.filter((a) => a.role !== "admin").slice(0, 6),
		[admins],
	);

	const uniNameById = useMemo(
		() => new Map(universities.map((u) => [u.id, u.name])),
		[universities],
	);

	return (
		<SuperAdminShell
			title="Platform overview"
			subtitle="Onboard universities and manage the administrators who run each institution."
			breadcrumb="Super admin"
			actions={
				<>
					<Link href="/super-admin/universities" className="primary-btn">
						Onboard university
					</Link>
					<Link href="/super-admin/admins" className="ghost-btn">
						Manage admins
					</Link>
				</>
			}
		>
			{error && <p className="error-text">{error}</p>}

			<section className="admin-stats">
				<AdminStatCard label="Onboarded universities" value={stats.onboarded} />
				<AdminStatCard label="Active universities" value={stats.activeUnis} />
				<AdminStatCard label="University admins" value={stats.uniAdminCount} />
				<AdminStatCard label="Users across platform" value={stats.totalUsers} />
			</section>

			<div className="admin-stack">
				<AdminPanel
					title="Universities"
					actions={
						<Link href="/super-admin/universities" className="ghost-btn">
							View all
						</Link>
					}
				>
					{loading ? (
						<p className="muted">Loading…</p>
					) : recentUnis.length === 0 ? (
						<p className="muted">
							No universities onboarded yet.{" "}
							<Link href="/super-admin/universities">Onboard the first one</Link>.
						</p>
					) : (
						<table className="admin-table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Status</th>
									<th>Users</th>
									<th>Admins</th>
									<th>Added</th>
								</tr>
							</thead>
							<tbody>
								{recentUnis.map((uni) => (
									<tr key={uni.id}>
										<td>
											<strong>{uni.name}</strong>
										</td>
										<td>
											<span className={`pill status-${uni.status}`}>{uni.status}</span>
										</td>
										<td>{uni.userCount}</td>
										<td>{uni.adminCount}</td>
										<td>{formatAdminDate(uni.createdAt)}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</AdminPanel>

				<AdminPanel
					title="University admins"
					actions={
						<Link href="/super-admin/admins" className="ghost-btn">
							View all
						</Link>
					}
				>
					{loading ? (
						<p className="muted">Loading…</p>
					) : uniAdmins.length === 0 ? (
						<p className="muted">
							No university admins yet.{" "}
							<Link href="/super-admin/admins">Create one</Link>.
						</p>
					) : (
						<table className="admin-table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Role</th>
									<th>University</th>
									<th>Status</th>
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
									</tr>
								))}
							</tbody>
						</table>
					)}
				</AdminPanel>
			</div>
		</SuperAdminShell>
	);
}
