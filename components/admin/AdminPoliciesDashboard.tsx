"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
	createAdminPolicy,
	deleteAdminPolicy,
	evaluateAdminPolicy,
	fetchAdminPolicies,
	updateAdminPolicy,
} from "@/lib/admin-api";
import type {
	GovernancePolicyRecord,
	PolicyEffect,
	PolicyEvaluation,
	PolicyScope,
	PolicyStats,
} from "@/lib/admin-governance";

const ROLES = [
	"admin",
	"governance_admin",
	"faculty_admin",
	"lecturer",
	"researcher",
	"student",
	"auditor",
	"viewer",
] as const;
const SCOPES: PolicyScope[] = ["feature", "dataset", "tool", "use_case", "content"];
const EFFECTS: PolicyEffect[] = ["permitted", "restricted", "blocked"];

/** UI policy categories stored as target under use_case / content scope */
const POLICY_CATEGORIES = [
	{ id: "acceptable-ai-use", label: "Acceptable AI use", scope: "use_case" as PolicyScope },
	{ id: "research-ethics", label: "Research ethics", scope: "use_case" as PolicyScope },
	{ id: "data-privacy", label: "Data privacy", scope: "content" as PolicyScope },
	{ id: "academic-integrity", label: "Academic integrity", scope: "use_case" as PolicyScope },
	{ id: "ai-transparency", label: "AI transparency", scope: "use_case" as PolicyScope },
	{ id: "sensitive-data", label: "Sensitive data", scope: "content" as PolicyScope },
	{ id: "token-limits", label: "Token limits", scope: "feature" as PolicyScope },
	{ id: "user-responsibilities", label: "User responsibilities", scope: "use_case" as PolicyScope },
] as const;

const emptyForm = {
	name: "",
	description: "",
	category: "acceptable-ai-use" as (typeof POLICY_CATEGORIES)[number]["id"],
	scope: "use_case" as PolicyScope,
	target: "acceptable-ai-use",
	effect: "restricted" as PolicyEffect,
	roles: "" as string,
	faculties: "" as string,
	departments: "" as string,
	violationRule: "",
	priority: "100",
	enabled: false,
};

function categoryLabel(target: string) {
	return POLICY_CATEGORIES.find((c) => c.id === target)?.label ?? target;
}

function isExpired(policy: GovernancePolicyRecord) {
	return !policy.enabled && policy.effect === "blocked";
}

export function AdminPoliciesDashboard() {
	const { ready } = useAdminGuard();
	const [policies, setPolicies] = useState<GovernancePolicyRecord[]>([]);
	const [stats, setStats] = useState<PolicyStats | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [categoryFilter, setCategoryFilter] = useState("");
	const [evalForm, setEvalForm] = useState({
		scope: "use_case" as PolicyScope,
		target: "acceptable-ai-use",
		role: "student",
		faculty: "",
	});
	const [evalResult, setEvalResult] = useState<PolicyEvaluation | null>(null);
	const [history, setHistory] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminPolicies();
			setPolicies(data.policies);
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

	const monitoring = useMemo(() => {
		const active = policies.filter((p) => p.enabled).length;
		const expired = policies.filter(isExpired).length;
		const archived = policies.filter((p) => !p.enabled).length;
		const violations = policies.filter((p) => p.effect === "blocked" || p.effect === "restricted");
		const total = policies.length || 1;
		const complianceRate = Math.round(
			(policies.filter((p) => p.enabled && p.effect === "permitted").length / total) * 100,
		);
		const acceptance = Math.round((active / total) * 100);
		return { active, expired, archived, violations, complianceRate, acceptance };
	}, [policies]);

	const applyCategory = (categoryId: (typeof POLICY_CATEGORIES)[number]["id"]) => {
		const cat = POLICY_CATEGORIES.find((c) => c.id === categoryId)!;
		setForm((f) => ({
			...f,
			category: categoryId,
			scope: cat.scope,
			target: cat.id,
			name: f.name || cat.label,
		}));
		setEvalForm((f) => ({ ...f, scope: cat.scope, target: cat.id }));
	};

	const descriptionWithMeta = (base: string, departments: string, violationRule: string) => {
		const parts = [base.trim()];
		if (departments.trim()) parts.push(`[departments: ${departments.trim()}]`);
		if (violationRule.trim()) parts.push(`[violation: ${violationRule.trim()}]`);
		return parts.filter(Boolean).join(" ");
	};

	const parseMeta = (description: string) => {
		const deptMatch = description.match(/\[departments:\s*([^\]]+)\]/i);
		const violMatch = description.match(/\[violation:\s*([^\]]+)\]/i);
		const cleaned = description
			.replace(/\[departments:\s*[^\]]+\]/gi, "")
			.replace(/\[violation:\s*[^\]]+\]/gi, "")
			.trim();
		return {
			description: cleaned,
			departments: deptMatch?.[1]?.trim() ?? "",
			violationRule: violMatch?.[1]?.trim() ?? "",
		};
	};

	const startEdit = (policy: GovernancePolicyRecord) => {
		const meta = parseMeta(policy.description);
		const cat =
			POLICY_CATEGORIES.find((c) => c.id === policy.target)?.id ?? "acceptable-ai-use";
		setEditingId(policy.id);
		setForm({
			name: policy.name,
			description: meta.description,
			category: cat,
			scope: policy.scope,
			target: policy.target,
			effect: policy.effect,
			roles: policy.roles.join(", "),
			faculties: policy.faculties.join(", "),
			departments: meta.departments,
			violationRule: meta.violationRule,
			priority: String(policy.priority),
			enabled: policy.enabled,
		});
	};

	const pushHistory = (msg: string) => {
		setHistory((h) => [`${new Date().toLocaleString()} — ${msg}`, ...h].slice(0, 12));
	};

	const onSave = async (publish = false) => {
		if (!form.name.trim() || !form.target.trim()) {
			setError("Name and category/target are required.");
			return;
		}
		setWorking(true);
		setError(null);
		try {
			const payload = {
				name: form.name,
				description: descriptionWithMeta(form.description, form.departments, form.violationRule),
				scope: form.scope,
				target: form.target,
				effect: form.effect,
				roles: form.roles
					.split(",")
					.map((r) => r.trim())
					.filter(Boolean),
				faculties: form.faculties
					.split(",")
					.map((f) => f.trim())
					.filter(Boolean),
				priority: Number.parseInt(form.priority, 10) || 100,
				enabled: publish ? true : form.enabled,
			};
			if (editingId) {
				await updateAdminPolicy(editingId, payload);
				pushHistory(`${publish ? "Published" : "Updated"} “${form.name}” (v priority ${payload.priority})`);
			} else {
				await createAdminPolicy(payload);
				pushHistory(`${publish ? "Created & published" : "Created draft"} “${form.name}”`);
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

	const publish = async (policy: GovernancePolicyRecord) => {
		setWorking(true);
		try {
			await updateAdminPolicy(policy.id, { enabled: true });
			pushHistory(`Published “${policy.name}”`);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const archive = async (policy: GovernancePolicyRecord) => {
		setWorking(true);
		try {
			await updateAdminPolicy(policy.id, { enabled: false });
			pushHistory(`Archived “${policy.name}”`);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const bumpVersion = async (policy: GovernancePolicyRecord) => {
		const next = Math.max(1, policy.priority - 1);
		setWorking(true);
		try {
			await updateAdminPolicy(policy.id, { priority: next });
			pushHistory(`Version bump for “${policy.name}” → priority ${next}`);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const approveDraft = async (policy: GovernancePolicyRecord) => {
		setWorking(true);
		try {
			await updateAdminPolicy(policy.id, { enabled: true, effect: policy.effect });
			pushHistory(`Approval workflow completed for “${policy.name}”`);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const onDelete = async (id: string) => {
		if (!window.confirm("Delete this policy permanently?")) return;
		setWorking(true);
		try {
			const name = policies.find((p) => p.id === id)?.name ?? id;
			await deleteAdminPolicy(id);
			pushHistory(`Deleted “${name}”`);
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

	const onEvaluate = async () => {
		setWorking(true);
		setError(null);
		try {
			setEvalResult(
				await evaluateAdminPolicy({
					scope: evalForm.scope,
					target: evalForm.target,
					role: evalForm.role,
					faculty: evalForm.faculty || undefined,
				}),
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const filtered = categoryFilter
		? policies.filter((p) => p.target === categoryFilter)
		: policies;

	const violationsByPolicy = useMemo(() => {
		const map = new Map<string, number>();
		for (const p of policies) {
			if (p.effect === "blocked" || p.effect === "restricted") {
				map.set(p.name, (map.get(p.name) ?? 0) + 1);
			}
		}
		return [...map.entries()];
	}, [policies]);

	return (
		<AdminShell
			title="Role access policies"
			subtitle="Policies that target user roles, faculties, and organisational units"
			breadcrumb="Admin · User safety"
			actions={
				<>
					<Link className="ghost-btn" href="/admin/audit">
						Policy history (audit)
					</Link>
					<button type="button" className="ghost-btn" onClick={() => void load()}>
						Refresh
					</button>
				</>
			}
		>
			{loading && <p className="muted">Loading policies…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Active policies" value={monitoring.active} accent="success" />
					<AdminStatCard label="Expired / archived" value={monitoring.archived} accent="warning" />
					<AdminStatCard
						label="Compliance rate"
						value={`${monitoring.complianceRate}%`}
						accent="primary"
					/>
					<AdminStatCard
						label="Acceptance stats"
						value={`${monitoring.acceptance}%`}
						accent="primary"
					/>
					<AdminStatCard label="Blocked rules" value={stats.blocked} accent="danger" />
					<AdminStatCard label="Restricted rules" value={stats.restricted} accent="warning" />
				</section>
			)}

			<div className="admin-gov-grid">
				<AdminPanel
					title={editingId ? "Edit policy" : "Create policy"}
					description="Categories map to scope/target; publish enables the rule after approval"
				>
					<div className="admin-form-grid">
						<label>
							Category
							<select
								className="topic-input"
								value={form.category}
								onChange={(e) =>
									applyCategory(e.target.value as (typeof POLICY_CATEGORIES)[number]["id"])
								}
							>
								{POLICY_CATEGORIES.map((c) => (
									<option key={c.id} value={c.id}>
										{c.label}
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
							Scope
							<select
								className="topic-input"
								value={form.scope}
								onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as PolicyScope }))}
							>
								{SCOPES.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</label>
						<label>
							Effect / violation severity
							<select
								className="topic-input"
								value={form.effect}
								onChange={(e) => setForm((f) => ({ ...f, effect: e.target.value as PolicyEffect }))}
							>
								{EFFECTS.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
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
							Assign faculties
							<input
								className="topic-input"
								placeholder="comma-separated, blank = all"
								value={form.faculties}
								onChange={(e) => setForm((f) => ({ ...f, faculties: e.target.value }))}
							/>
						</label>
						<label>
							Assign departments
							<input
								className="topic-input"
								placeholder="comma-separated"
								value={form.departments}
								onChange={(e) => setForm((f) => ({ ...f, departments: e.target.value }))}
							/>
						</label>
						<label>
							Roles
							<input
								className="topic-input"
								placeholder={ROLES.join(", ")}
								value={form.roles}
								onChange={(e) => setForm((f) => ({ ...f, roles: e.target.value }))}
							/>
						</label>
						<label>
							Policy violation rule
							<input
								className="topic-input"
								placeholder="e.g. escalate to incident + notify faculty"
								value={form.violationRule}
								onChange={(e) => setForm((f) => ({ ...f, violationRule: e.target.value }))}
							/>
						</label>
						<label>
							Version priority (lower wins)
							<input
								className="topic-input"
								value={form.priority}
								onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
							/>
						</label>
					</div>
					<div className="admin-row-actions">
						<button
							type="button"
							className="ghost-btn"
							disabled={working}
							onClick={() => void onSave(false)}
						>
							{editingId ? "Save draft" : "Create draft"}
						</button>
						<button
							type="button"
							className="primary-btn"
							disabled={working}
							onClick={() => void onSave(true)}
						>
							{editingId ? "Save & publish" : "Create & publish"}
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
								Cancel
							</button>
						)}
					</div>
				</AdminPanel>

				<AdminPanel title="Evaluate & monitor" description="Test classification and review compliance signals">
					<div className="admin-form-grid">
						<label>
							Category / target
							<select
								className="topic-input"
								value={evalForm.target}
								onChange={(e) => {
									const cat = POLICY_CATEGORIES.find((c) => c.id === e.target.value);
									setEvalForm((f) => ({
										...f,
										target: e.target.value,
										scope: cat?.scope ?? f.scope,
									}));
								}}
							>
								{POLICY_CATEGORIES.map((c) => (
									<option key={c.id} value={c.id}>
										{c.label}
									</option>
								))}
							</select>
						</label>
						<label>
							Role
							<select
								className="topic-input"
								value={evalForm.role}
								onChange={(e) => setEvalForm((f) => ({ ...f, role: e.target.value }))}
							>
								{ROLES.map((r) => (
									<option key={r} value={r}>
										{r}
									</option>
								))}
							</select>
						</label>
						<label>
							Faculty
							<input
								className="topic-input"
								value={evalForm.faculty}
								onChange={(e) => setEvalForm((f) => ({ ...f, faculty: e.target.value }))}
							/>
						</label>
					</div>
					<button type="button" className="primary-btn" disabled={working} onClick={() => void onEvaluate()}>
						Evaluate policy
					</button>
					{evalResult && (
						<div className={`admin-eval-result admin-eval-${evalResult.effect}`}>
							<p>
								<strong>{evalResult.effect}</strong>
								{evalResult.matchedPolicyName ? ` — ${evalResult.matchedPolicyName}` : ""}
							</p>
							<p className="muted">{evalResult.reason}</p>
						</div>
					)}
					{violationsByPolicy.length > 0 && (
						<div className="admin-detail-block">
							<p>
								<strong>Violations by policy</strong>
							</p>
							<ul>
								{violationsByPolicy.map(([name, count]) => (
									<li key={name} className="muted">
										{name}: {count} restrictive rule{count === 1 ? "" : "s"}
									</li>
								))}
							</ul>
						</div>
					)}
					{history.length > 0 && (
						<div className="admin-detail-block">
							<p>
								<strong>Session policy history</strong>
							</p>
							<ul className="admin-timeline">
								{history.map((entry) => (
									<li key={entry}>
										<span className="admin-sev admin-sev-info">•</span>
										<div>
											<p className="muted">{entry}</p>
										</div>
									</li>
								))}
							</ul>
						</div>
					)}
				</AdminPanel>
			</div>

			<AdminPanel title="Policies" description="Filter by category — publish, archive, version, approve">
				<div className="admin-filter-row admin-filter-wrap">
					<button
						type="button"
						className={`ghost-btn${!categoryFilter ? " admin-filter-active" : ""}`}
						onClick={() => setCategoryFilter("")}
					>
						All
					</button>
					{POLICY_CATEGORIES.map((c) => (
						<button
							key={c.id}
							type="button"
							className={`ghost-btn${categoryFilter === c.id ? " admin-filter-active" : ""}`}
							onClick={() => setCategoryFilter(c.id)}
						>
							{c.label}
						</button>
					))}
				</div>
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>Version</th>
								<th>Name</th>
								<th>Category</th>
								<th>Effect</th>
								<th>Faculties</th>
								<th>Updated</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{filtered.length === 0 ? (
								<tr>
									<td colSpan={8} className="muted">
										No policies yet.
									</td>
								</tr>
							) : (
								filtered.map((policy) => {
									const meta = parseMeta(policy.description);
									return (
										<tr
											key={policy.id}
											className={!policy.enabled ? "admin-row-muted" : undefined}
										>
											<td>p{policy.priority}</td>
											<td>
												<strong>{policy.name}</strong>
												{meta.description ? <p className="muted">{meta.description}</p> : null}
												{meta.violationRule ? (
													<p className="muted">Violation: {meta.violationRule}</p>
												) : null}
											</td>
											<td>{categoryLabel(policy.target)}</td>
											<td>
												<span className={`admin-chip admin-chip-${policy.effect}`}>
													{policy.effect}
												</span>
											</td>
											<td>
												{policy.faculties.length ? policy.faculties.join(", ") : "All"}
												{meta.departments ? (
													<p className="muted">Depts: {meta.departments}</p>
												) : null}
											</td>
											<td>{formatAdminDate(policy.updatedAt)}</td>
											<td>
												{policy.enabled
													? "Published"
													: isExpired(policy)
														? "Expired"
														: "Draft / archived"}
											</td>
											<td className="admin-row-actions">
												<button
													type="button"
													className="ghost-btn"
													disabled={working}
													onClick={() => startEdit(policy)}
												>
													Edit
												</button>
												{!policy.enabled && (
													<>
														<button
															type="button"
															className="ghost-btn"
															disabled={working}
															onClick={() => void approveDraft(policy)}
														>
															Approve
														</button>
														<button
															type="button"
															className="ghost-btn"
															disabled={working}
															onClick={() => void publish(policy)}
														>
															Publish
														</button>
													</>
												)}
												{policy.enabled && (
													<button
														type="button"
														className="ghost-btn"
														disabled={working}
														onClick={() => void archive(policy)}
													>
														Archive
													</button>
												)}
												<button
													type="button"
													className="ghost-btn"
													disabled={working}
													onClick={() => void bumpVersion(policy)}
												>
													Version+
												</button>
												<button
													type="button"
													className="ghost-btn"
													disabled={working}
													onClick={() => void onDelete(policy.id)}
												>
													Delete
												</button>
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
