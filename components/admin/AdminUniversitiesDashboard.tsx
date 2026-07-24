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
	fetchAdminUniversities,
	onboardAdminUniversity,
	updateAdminUniversity,
	type UniversityRecord,
} from "@/lib/admin-api";
import { NIGERIA_UNIVERSITY_GROUPS, NIGERIA_UNIVERSITIES } from "@/lib/nigeria-universities";

export function AdminUniversitiesDashboard() {
	const { ready } = useSuperAdminGuard();
	const [universities, setUniversities] = useState<UniversityRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [catalogueId, setCatalogueId] = useState("");
	const [saving, setSaving] = useState(false);
	const [search, setSearch] = useState("");

	const load = useCallback(async () => {
		setError(null);
		try {
			setUniversities(await fetchAdminUniversities());
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const onboardedIds = useMemo(
		() => new Set(universities.map((u) => u.catalogueId)),
		[universities],
	);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return universities;
		return universities.filter(
			(u) => u.name.toLowerCase().includes(q) || u.catalogueId.toLowerCase().includes(q),
		);
	}, [universities, search]);

	const activeCount = universities.filter((u) => u.status === "active").length;

	const handleOnboard = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!catalogueId) return;
		const label = NIGERIA_UNIVERSITIES.find((u) => u.id === catalogueId)?.label ?? catalogueId;
		setSaving(true);
		setError(null);
		try {
			await onboardAdminUniversity({
				catalogueId,
				name: label,
				status: "active",
			});
			setCatalogueId("");
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	const toggleStatus = async (uni: UniversityRecord) => {
		setError(null);
		try {
			await updateAdminUniversity(uni.id, {
				status: uni.status === "active" ? "inactive" : "active",
			});
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	return (
		<SuperAdminShell
			title="Universities"
			subtitle="Onboard institutions so their lecturers and students can sign in."
			breadcrumb="Platform"
		>
			{error && <p className="error-text">{error}</p>}

			<section className="admin-stats">
				<AdminStatCard label="Onboarded" value={universities.length} />
				<AdminStatCard label="Active" value={activeCount} />
				<AdminStatCard label="Inactive" value={universities.length - activeCount} />
			</section>

			<AdminPanel title="Onboard a university">
				<form className="admin-form-grid" onSubmit={handleOnboard}>
					<label className="admin-form-span">
						<span>Institution</span>
						<select
							value={catalogueId}
							onChange={(e) => setCatalogueId(e.target.value)}
							required
							disabled={saving}
						>
							<option value="">Select from catalogue…</option>
							{NIGERIA_UNIVERSITY_GROUPS.map((group) => (
								<optgroup key={group.id} label={group.label}>
									{group.universities.map((uni) => (
										<option key={uni.id} value={uni.id} disabled={onboardedIds.has(uni.id)}>
											{uni.label}
											{onboardedIds.has(uni.id) ? " (already onboarded)" : ""}
										</option>
									))}
								</optgroup>
							))}
						</select>
					</label>
					<div className="admin-form-span">
						<button type="submit" className="primary-btn" disabled={saving || !catalogueId}>
							{saving ? "Onboarding…" : "Onboard & activate"}
						</button>
					</div>
				</form>
			</AdminPanel>

			<AdminPanel
				title="Onboarded universities"
				actions={
					<input
						type="search"
						placeholder="Search universities…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						aria-label="Search universities"
					/>
				}
			>
				{loading ? (
					<p className="muted">Loading…</p>
				) : filtered.length === 0 ? (
					<p className="muted">No universities onboarded yet.</p>
				) : (
					<table className="admin-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Status</th>
								<th>Users</th>
								<th>Admins</th>
								<th>Onboarded</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{filtered.map((uni) => (
								<tr key={uni.id}>
									<td>
										<strong>{uni.name}</strong>
										<div className="muted">{uni.catalogueId}</div>
									</td>
									<td>
										<span className={`pill status-${uni.status}`}>{uni.status}</span>
									</td>
									<td>{uni.userCount}</td>
									<td>{uni.adminCount}</td>
									<td>{uni.onboardedAt ? formatAdminDate(uni.onboardedAt) : "—"}</td>
									<td>
										<button
											type="button"
											className="ghost-btn"
											onClick={() => void toggleStatus(uni)}
										>
											{uni.status === "active" ? "Deactivate" : "Activate"}
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</AdminPanel>
		</SuperAdminShell>
	);
}
