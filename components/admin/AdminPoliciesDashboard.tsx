"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard } from "@/components/admin/AdminShell";
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

const ROLES = ["lecturer", "researcher", "student", "viewer", "admin"] as const;
const SCOPES: PolicyScope[] = ["feature", "dataset", "tool", "use_case", "content"];
const EFFECTS: PolicyEffect[] = ["permitted", "restricted", "blocked"];

const emptyForm = {
	name: "",
	description: "",
	scope: "feature" as PolicyScope,
	target: "",
	effect: "permitted" as PolicyEffect,
	roles: "" as string,
	faculties: "" as string,
	priority: "100",
};

export function AdminPoliciesDashboard() {
	const { ready } = useAdminGuard();
	const [policies, setPolicies] = useState<GovernancePolicyRecord[]>([]);
	const [stats, setStats] = useState<PolicyStats | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [evalForm, setEvalForm] = useState({
		scope: "feature" as PolicyScope,
		target: "research-ideas",
		role: "student",
		faculty: "",
	});
	const [evalResult, setEvalResult] = useState<PolicyEvaluation | null>(null);
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

	const onCreate = async () => {
		if (!form.name.trim() || !form.target.trim()) {
			setError("Name and target are required.");
			return;
		}
		setWorking(true);
		setError(null);
		try {
			await createAdminPolicy({
				name: form.name,
				description: form.description,
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
			});
			setForm(emptyForm);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const toggleEnabled = async (policy: GovernancePolicyRecord) => {
		setWorking(true);
		try {
			await updateAdminPolicy(policy.id, { enabled: !policy.enabled });
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const onDelete = async (id: string) => {
		if (!window.confirm("Delete this policy?")) return;
		setWorking(true);
		try {
			await deleteAdminPolicy(id);
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

	return (
		<AdminShell
			title="Policy engine"
			subtitle="Define what is permitted, restricted, or blocked by role and faculty"
			breadcrumb="Admin · Governance"
		>
			{loading && <p className="muted">Loading policies…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Total rules" value={stats.total} accent="primary" />
					<AdminStatCard label="Permitted" value={stats.permitted} accent="success" />
					<AdminStatCard label="Restricted" value={stats.restricted} accent="warning" />
					<AdminStatCard label="Blocked" value={stats.blocked} accent="danger" />
				</section>
			)}

			<div className="admin-gov-grid">
				<AdminPanel title="Add policy" description="Institutional rule for AI use">
					<div className="admin-form-grid">
						<label>
							Name
							<input
								className="topic-input"
								value={form.name}
								onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
							/>
						</label>
						<label>
							Target (e.g. research-ideas)
							<input
								className="topic-input"
								value={form.target}
								onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
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
							Effect
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
							Roles (comma-separated, blank = all)
							<input
								className="topic-input"
								placeholder={ROLES.join(", ")}
								value={form.roles}
								onChange={(e) => setForm((f) => ({ ...f, roles: e.target.value }))}
							/>
						</label>
						<label>
							Faculties (comma-separated, blank = all)
							<input
								className="topic-input"
								value={form.faculties}
								onChange={(e) => setForm((f) => ({ ...f, faculties: e.target.value }))}
							/>
						</label>
						<label>
							Priority (lower wins)
							<input
								className="topic-input"
								value={form.priority}
								onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
							/>
						</label>
					</div>
					<button type="button" className="primary-btn" disabled={working} onClick={() => void onCreate()}>
						Create policy
					</button>
				</AdminPanel>

				<AdminPanel title="Evaluate" description="Test how a request would be classified">
					<div className="admin-form-grid">
						<label>
							Scope
							<select
								className="topic-input"
								value={evalForm.scope}
								onChange={(e) =>
									setEvalForm((f) => ({ ...f, scope: e.target.value as PolicyScope }))
								}
							>
								{SCOPES.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</label>
						<label>
							Target
							<input
								className="topic-input"
								value={evalForm.target}
								onChange={(e) => setEvalForm((f) => ({ ...f, target: e.target.value }))}
							/>
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
							Faculty (optional)
							<input
								className="topic-input"
								value={evalForm.faculty}
								onChange={(e) => setEvalForm((f) => ({ ...f, faculty: e.target.value }))}
							/>
						</label>
					</div>
					<button type="button" className="primary-btn" disabled={working} onClick={() => void onEvaluate()}>
						Evaluate
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
				</AdminPanel>
			</div>

			<AdminPanel title="Active policies" description="Ordered by priority">
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>Priority</th>
								<th>Name</th>
								<th>Scope</th>
								<th>Target</th>
								<th>Effect</th>
								<th>Roles</th>
								<th>Faculties</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{policies.map((policy) => (
								<tr key={policy.id} className={!policy.enabled ? "admin-row-muted" : undefined}>
									<td>{policy.priority}</td>
									<td>
										<div>
											<strong>{policy.name}</strong>
											{policy.description ? <p className="muted">{policy.description}</p> : null}
										</div>
									</td>
									<td>{policy.scope}</td>
									<td>
										<code>{policy.target}</code>
									</td>
									<td>
										<span className={`admin-chip admin-chip-${policy.effect}`}>{policy.effect}</span>
									</td>
									<td>{policy.roles.length ? policy.roles.join(", ") : "All"}</td>
									<td>{policy.faculties.length ? policy.faculties.join(", ") : "All"}</td>
									<td>{policy.enabled ? "Enabled" : "Disabled"}</td>
									<td className="admin-row-actions">
										<button
											type="button"
											className="ghost-btn"
											disabled={working}
											onClick={() => void toggleEnabled(policy)}
										>
											{policy.enabled ? "Disable" : "Enable"}
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
							))}
						</tbody>
					</table>
				</div>
			</AdminPanel>
		</AdminShell>
	);
}
