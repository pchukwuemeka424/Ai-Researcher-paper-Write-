"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
	createAdminPrivacy,
	deleteAdminPrivacy,
	fetchAdminPrivacy,
	updateAdminPrivacy,
} from "@/lib/admin-api";
import type { PrivacyStats, ResearchPrivacySettingRecord } from "@/lib/admin-governance";

/** UI rule kinds map onto existing scope / dataClass / feature fields */
const RULE_KINDS = [
	{ id: "faculty_access", label: "Faculty access rules", scope: "faculty", dataClass: "confidential" },
	{ id: "department_access", label: "Department access rules", scope: "faculty", dataClass: "confidential" },
	{ id: "role_based", label: "Role-based access", scope: "role", dataClass: "internal" },
	{ id: "data_visibility", label: "Data visibility", scope: "global", dataClass: "internal" },
	{ id: "research_access", label: "Research access permissions", scope: "feature", dataClass: "confidential" },
	{ id: "sensitive_data", label: "Sensitive data controls", scope: "global", dataClass: "special_category" },
	{ id: "ai_data_sharing", label: "AI data sharing rules", scope: "feature", dataClass: "restricted" },
	{ id: "consent", label: "Consent management", scope: "global", dataClass: "confidential" },
] as const;

const DATA_CLASSES = [
	"public",
	"internal",
	"confidential",
	"restricted",
	"special_category",
] as const;

const emptyForm = {
	kind: "faculty_access" as (typeof RULE_KINDS)[number]["id"],
	name: "",
	description: "",
	dataClass: "confidential",
	scope: "faculty",
	adminRawAccess: "never",
	faculties: "",
	departments: "",
	roles: "",
	features: "",
	priority: "100",
	allowGovernanceMetadata: true,
	allowProvenanceReview: true,
	redactPiiInLogs: true,
	requireExplicitAuthorisation: true,
};

function kindFromSetting(setting: ResearchPrivacySettingRecord) {
	const features = setting.features ?? [];
	if (setting.dataClass === "special_category") return "Sensitive data controls";
	if (features.some((f) => f.toLowerCase().includes("ai") || f === "ai_sharing"))
		return "AI data sharing rules";
	if (setting.requireExplicitAuthorisation && setting.scope === "global") return "Consent management";
	if (setting.scope === "role") return "Role-based access";
	if (setting.scope === "faculty" && features.some((f) => f.startsWith("dept:")))
		return "Department access rules";
	if (setting.scope === "faculty") return "Faculty access rules";
	if (setting.scope === "feature") return "Research access permissions";
	return "Data visibility";
}

function labelize(value: string | null | undefined, fallback = "—") {
	if (!value) return fallback;
	return value.replace(/_/g, " ");
}

export function AdminPrivacyDashboard() {
	const { ready } = useAdminGuard();
	const [settings, setSettings] = useState<ResearchPrivacySettingRecord[]>([]);
	const [stats, setStats] = useState<PrivacyStats | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [kindFilter, setKindFilter] = useState("");
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminPrivacy();
			setSettings(data.settings);
			setStats(data.stats);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const applyKind = (kindId: (typeof RULE_KINDS)[number]["id"]) => {
		const kind = RULE_KINDS.find((k) => k.id === kindId)!;
		setForm((f) => ({
			...f,
			kind: kindId,
			scope: kind.scope,
			dataClass: kind.dataClass,
			name: f.name || kind.label,
			features:
				kindId === "ai_data_sharing"
					? f.features || "ai_sharing"
					: kindId === "consent"
						? f.features || "consent"
						: kindId === "research_access"
							? f.features || "research_workspace"
							: f.features,
			requireExplicitAuthorisation: kindId === "consent" ? true : f.requireExplicitAuthorisation,
		}));
	};

	const startEdit = (setting: ResearchPrivacySettingRecord) => {
		const features = setting.features ?? [];
		const faculties = setting.faculties ?? [];
		const roles = setting.roles ?? [];
		const deptFeatures = features.filter((f) => f.startsWith("dept:"));
		const otherFeatures = features.filter((f) => !f.startsWith("dept:"));
		setEditingId(setting.id);
		setForm({
			kind:
				RULE_KINDS.find((k) => k.label === kindFromSetting(setting))?.id ?? "data_visibility",
			name: setting.name,
			description: setting.description ?? "",
			dataClass: setting.dataClass || "confidential",
			scope: setting.scope || "global",
			adminRawAccess: setting.adminRawAccess || "never",
			faculties: faculties.join(", "),
			departments: deptFeatures.map((f) => f.slice(5)).join(", "),
			roles: roles.join(", "),
			features: otherFeatures.join(", "),
			priority: String(setting.priority ?? 100),
			allowGovernanceMetadata: setting.allowGovernanceMetadata !== false,
			allowProvenanceReview: setting.allowProvenanceReview !== false,
			redactPiiInLogs: setting.redactPiiInLogs !== false,
			requireExplicitAuthorisation: setting.requireExplicitAuthorisation !== false,
		});
	};

	const payloadFromForm = () => {
		const departments = form.departments
			.split(",")
			.map((d) => d.trim())
			.filter(Boolean)
			.map((d) => `dept:${d}`);
		const features = [
			...form.features
				.split(",")
				.map((f) => f.trim())
				.filter(Boolean),
			...departments,
		];
		return {
			name: form.name,
			description: form.description,
			dataClass: form.dataClass,
			scope: form.scope,
			adminRawAccess: form.adminRawAccess,
			faculties: form.faculties
				.split(",")
				.map((f) => f.trim())
				.filter(Boolean),
			roles: form.roles
				.split(",")
				.map((r) => r.trim())
				.filter(Boolean),
			features,
			priority: Number.parseInt(form.priority, 10) || 100,
			allowGovernanceMetadata: form.allowGovernanceMetadata,
			allowProvenanceReview: form.allowProvenanceReview,
			redactPiiInLogs: form.redactPiiInLogs,
			requireExplicitAuthorisation: form.requireExplicitAuthorisation,
		};
	};

	const onSave = async () => {
		if (!form.name.trim()) {
			setError("Rule name is required.");
			return;
		}
		setWorking(true);
		setError(null);
		try {
			const payload = payloadFromForm();
			if (editingId) {
				await updateAdminPrivacy(editingId, payload);
			} else {
				await createAdminPrivacy(payload);
			}
			setForm(emptyForm);
			setEditingId(null);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const toggle = async (setting: ResearchPrivacySettingRecord) => {
		setWorking(true);
		try {
			await updateAdminPrivacy(setting.id, { enabled: !setting.enabled });
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const onDelete = async (id: string) => {
		if (!window.confirm("Delete this privacy rule?")) return;
		setWorking(true);
		try {
			await deleteAdminPrivacy(id);
			if (editingId === id) {
				setEditingId(null);
				setForm(emptyForm);
			}
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const filtered = kindFilter
		? settings.filter((s) => kindFromSetting(s) === kindFilter)
		: settings;

	return (
		<AdminShell
			title="User privacy rules"
			subtitle="Access and consent rules by role, faculty, and department — scoped to user data"
			breadcrumb="Admin · User data"
			actions={
				<>
					<Link className="ghost-btn" href="/admin/audit">
						Audit privacy changes
					</Link>
					<button type="button" className="ghost-btn" onClick={() => void load()}>
						Refresh
					</button>
				</>
			}
		>
			{loading && <p className="muted">Loading privacy controls…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Rules" value={stats.total} accent="primary" />
					<AdminStatCard label="Enabled" value={stats.enabled} accent="success" />
					<AdminStatCard label="Deny raw access" value={stats.neverRaw} accent="warning" />
					<AdminStatCard label="Restricted class" value={stats.restricted} accent="warning" />
					<AdminStatCard label="Special category" value={stats.special} accent="danger" />
					<AdminStatCard label="Disabled" value={stats.disabled} accent="primary" />
				</section>
			)}

			<div className="admin-gov-grid">
				<AdminPanel
					title={editingId ? "Edit privacy rule" : "Create privacy rule"}
					description="Map institutional controls onto faculty, department, role, visibility, and consent settings"
				>
					<div className="admin-form-grid">
						<label>
							Rule kind
							<select
								className="topic-input"
								value={form.kind}
								onChange={(e) =>
									applyKind(e.target.value as (typeof RULE_KINDS)[number]["id"])
								}
							>
								{RULE_KINDS.map((k) => (
									<option key={k.id} value={k.id}>
										{k.label}
									</option>
								))}
							</select>
						</label>
						<label>
							Name
							<input
								className="topic-input"
								value={form.name}
								onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
							/>
						</label>
						<label>
							Data visibility class
							<select
								className="topic-input"
								value={form.dataClass}
								onChange={(e) => setForm((f) => ({ ...f, dataClass: e.target.value }))}
							>
								{DATA_CLASSES.map((c) => (
									<option key={c} value={c}>
										{c.replace(/_/g, " ")}
									</option>
								))}
							</select>
						</label>
						<label>
							Scope
							<select
								className="topic-input"
								value={form.scope}
								onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
							>
								{["global", "faculty", "role", "feature"].map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</label>
						<label>
							Admin raw access
							<select
								className="topic-input"
								value={form.adminRawAccess}
								onChange={(e) => setForm((f) => ({ ...f, adminRawAccess: e.target.value }))}
							>
								{["never", "policy_authorised", "incident_only", "always"].map((s) => (
									<option key={s} value={s}>
										{s.replace(/_/g, " ")}
									</option>
								))}
							</select>
						</label>
						<label>
							Priority
							<input
								className="topic-input"
								value={form.priority}
								onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
							/>
						</label>
						<label className="admin-form-span">
							Description
							<input
								className="topic-input"
								value={form.description}
								onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
							/>
						</label>
						<label>
							Faculties (comma-separated)
							<input
								className="topic-input"
								value={form.faculties}
								onChange={(e) => setForm((f) => ({ ...f, faculties: e.target.value }))}
							/>
						</label>
						<label>
							Departments (comma-separated)
							<input
								className="topic-input"
								value={form.departments}
								onChange={(e) => setForm((f) => ({ ...f, departments: e.target.value }))}
							/>
						</label>
						<label>
							Roles (comma-separated)
							<input
								className="topic-input"
								placeholder="lecturer, researcher, student"
								value={form.roles}
								onChange={(e) => setForm((f) => ({ ...f, roles: e.target.value }))}
							/>
						</label>
						<label>
							Features / permissions
							<input
								className="topic-input"
								placeholder="research_workspace, ai_sharing…"
								value={form.features}
								onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
							/>
						</label>
					</div>
					<label className="admin-check">
						<input
							type="checkbox"
							checked={form.allowGovernanceMetadata}
							onChange={(e) =>
								setForm((f) => ({ ...f, allowGovernanceMetadata: e.target.checked }))
							}
						/>
						Allow governance metadata (usage, tokens, disclosures)
					</label>
					<label className="admin-check">
						<input
							type="checkbox"
							checked={form.allowProvenanceReview}
							onChange={(e) =>
								setForm((f) => ({ ...f, allowProvenanceReview: e.target.checked }))
							}
						/>
						Allow provenance review for authorised reviewers
					</label>
					<label className="admin-check">
						<input
							type="checkbox"
							checked={form.redactPiiInLogs}
							onChange={(e) => setForm((f) => ({ ...f, redactPiiInLogs: e.target.checked }))}
						/>
						Redact PII in audit logs (sensitive data control)
					</label>
					<label className="admin-check">
						<input
							type="checkbox"
							checked={form.requireExplicitAuthorisation}
							onChange={(e) =>
								setForm((f) => ({ ...f, requireExplicitAuthorisation: e.target.checked }))
							}
						/>
						Require explicit consent / authorisation for raw access
					</label>
					<div className="admin-row-actions">
						<button type="button" className="primary-btn" disabled={working} onClick={() => void onSave()}>
							{editingId ? "Save changes" : "Create rule"}
						</button>
						{editingId && (
							<button
								type="button"
								className="ghost-btn"
								onClick={() => {
									setEditingId(null);
									setForm(emptyForm);
								}}
							>
								Cancel edit
							</button>
						)}
					</div>
				</AdminPanel>

				<AdminPanel title="Rule categories" description="Filter by control type">
					<div className="admin-filter-row admin-filter-wrap">
						<button
							type="button"
							className={`ghost-btn${!kindFilter ? " admin-filter-active" : ""}`}
							onClick={() => setKindFilter("")}
						>
							All
						</button>
						{RULE_KINDS.map((k) => (
							<button
								key={k.id}
								type="button"
								className={`ghost-btn${kindFilter === k.label ? " admin-filter-active" : ""}`}
								onClick={() => setKindFilter(k.label)}
							>
								{k.label}
							</button>
						))}
					</div>
				</AdminPanel>
			</div>

			<AdminPanel title="Privacy rules" description="Enable, disable, or edit institutional access controls">
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>Priority</th>
								<th>Rule</th>
								<th>Kind</th>
								<th>Visibility</th>
								<th>Faculties / Depts / Roles</th>
								<th>Updated</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{filtered.length === 0 ? (
								<tr>
									<td colSpan={8} className="muted">
										No privacy rules configured yet.
									</td>
								</tr>
							) : (
								filtered.map((setting) => {
									const features = setting.features ?? [];
									const faculties = setting.faculties ?? [];
									const roles = setting.roles ?? [];
									const depts = features
										.filter((f) => f.startsWith("dept:"))
										.map((f) => f.slice(5));
									return (
										<tr
											key={setting.id}
											className={!setting.enabled ? "admin-row-muted" : undefined}
										>
											<td>{setting.priority ?? "—"}</td>
											<td>
												<strong>{setting.name}</strong>
												{setting.description ? (
													<p className="muted">{setting.description}</p>
												) : null}
											</td>
											<td>{kindFromSetting(setting)}</td>
											<td>
												{labelize(setting.dataClass)}
												<p className="muted">raw: {labelize(setting.adminRawAccess, "never")}</p>
											</td>
											<td>
												{faculties.length
													? `Faculties: ${faculties.join(", ")}`
													: "All faculties"}
												{depts.length ? (
													<p className="muted">Depts: {depts.join(", ")}</p>
												) : null}
												{roles.length ? (
													<p className="muted">Roles: {roles.join(", ")}</p>
												) : null}
											</td>
											<td>{formatAdminDate(setting.updatedAt)}</td>
											<td>{setting.enabled ? "Enabled" : "Disabled"}</td>
											<td className="admin-row-actions">
												<button
													type="button"
													className="ghost-btn"
													disabled={working}
													onClick={() => startEdit(setting)}
												>
													Edit
												</button>
												<button
													type="button"
													className="ghost-btn"
													disabled={working}
													onClick={() => void toggle(setting)}
												>
													{setting.enabled ? "Disable" : "Enable"}
												</button>
												<button
													type="button"
													className="ghost-btn"
													disabled={working}
													onClick={() => void onDelete(setting.id)}
												>
													Delete
												</button>
												<Link className="ghost-btn" href="/admin/audit">
													Audit
												</Link>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</AdminPanel>
		</AdminShell>
	);
}
