"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { createAdminRisk, deleteAdminRisk, fetchAdminRisks, updateAdminRisk } from "@/lib/admin-api";
import type { GovernanceRiskRecord, RiskStats } from "@/lib/admin-governance";

const CATEGORIES = [
	"data_protection",
	"academic_integrity",
	"model_safety",
	"access_control",
	"third_party",
	"operational",
	"legal",
	"reputational",
] as const;

function scoreClass(score: number): string {
	if (score >= 20) return "critical";
	if (score >= 12) return "high";
	if (score >= 6) return "medium";
	return "low";
}

const emptyForm = {
	title: "",
	description: "",
	category: "data_protection",
	likelihood: "3",
	impact: "3",
	residualLikelihood: "2",
	residualImpact: "3",
	ownerName: "",
	faculty: "",
	controls: "",
	treatmentPlan: "",
};

export function AdminRisksDashboard() {
	const { ready } = useAdminGuard();
	const [risks, setRisks] = useState<GovernanceRiskRecord[]>([]);
	const [stats, setStats] = useState<RiskStats | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [statusFilter, setStatusFilter] = useState("");
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminRisks({ status: statusFilter || undefined });
			setRisks(data.risks);
			setStats(data.stats);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, [statusFilter]);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const onCreate = async () => {
		if (!form.title.trim()) {
			setError("Title is required.");
			return;
		}
		setWorking(true);
		setError(null);
		try {
			await createAdminRisk({
				title: form.title,
				description: form.description,
				category: form.category,
				likelihood: Number(form.likelihood),
				impact: Number(form.impact),
				residualLikelihood: Number(form.residualLikelihood),
				residualImpact: Number(form.residualImpact),
				ownerName: form.ownerName,
				faculty: form.faculty,
				controls: form.controls,
				treatmentPlan: form.treatmentPlan,
			});
			setForm(emptyForm);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const setStatus = async (id: string, status: string) => {
		setWorking(true);
		try {
			await updateAdminRisk(id, { status });
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	return (
		<AdminShell
			title="Risk register"
			subtitle="Inherent and residual AI risk across research use — scored for leadership oversight"
			breadcrumb="Admin · Governance"
		>
			{loading && <p className="muted">Loading risks…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Open" value={stats.open} accent="danger" />
					<AdminStatCard label="Mitigating" value={stats.mitigating} accent="warning" />
					<AdminStatCard label="High inherent" value={stats.highInherent} accent="danger" />
					<AdminStatCard label="Avg inherent" value={stats.avgInherent} />
					<AdminStatCard label="Avg residual" value={stats.avgResidual} accent="success" />
				</section>
			)}

			<div className="admin-gov-grid">
				<AdminPanel title="Register risk" description="Likelihood × impact (1–5) produces inherent score">
					<div className="admin-form-grid">
						<label>
							Title
							<input className="topic-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
						</label>
						<label>
							Category
							<select className="topic-input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
								{CATEGORIES.map((c) => (
									<option key={c} value={c}>{c.replace(/_/g, " ")}</option>
								))}
							</select>
						</label>
						<label>
							Likelihood
							<input className="topic-input" type="number" min={1} max={5} value={form.likelihood} onChange={(e) => setForm((f) => ({ ...f, likelihood: e.target.value }))} />
						</label>
						<label>
							Impact
							<input className="topic-input" type="number" min={1} max={5} value={form.impact} onChange={(e) => setForm((f) => ({ ...f, impact: e.target.value }))} />
						</label>
						<label>
							Residual likelihood
							<input className="topic-input" type="number" min={1} max={5} value={form.residualLikelihood} onChange={(e) => setForm((f) => ({ ...f, residualLikelihood: e.target.value }))} />
						</label>
						<label>
							Residual impact
							<input className="topic-input" type="number" min={1} max={5} value={form.residualImpact} onChange={(e) => setForm((f) => ({ ...f, residualImpact: e.target.value }))} />
						</label>
						<label>
							Owner
							<input className="topic-input" value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} />
						</label>
						<label>
							Faculty
							<input className="topic-input" value={form.faculty} onChange={(e) => setForm((f) => ({ ...f, faculty: e.target.value }))} />
						</label>
						<label className="admin-form-span">
							Controls in place
							<input className="topic-input" value={form.controls} onChange={(e) => setForm((f) => ({ ...f, controls: e.target.value }))} />
						</label>
						<label className="admin-form-span">
							Treatment plan
							<input className="topic-input" value={form.treatmentPlan} onChange={(e) => setForm((f) => ({ ...f, treatmentPlan: e.target.value }))} />
						</label>
					</div>
					<button type="button" className="primary-btn" disabled={working} onClick={() => void onCreate()}>
						Add to register
					</button>
				</AdminPanel>

				<AdminPanel title="Filters" description="Focus open vs mitigating risks">
					<div className="admin-filter-row admin-filter-wrap">
						{(["", "open", "mitigating", "accepted", "closed"] as const).map((id) => (
							<button
								key={id || "all"}
								type="button"
								className={`ghost-btn${statusFilter === id ? " admin-filter-active" : ""}`}
								onClick={() => setStatusFilter(id)}
							>
								{id || "All"}
							</button>
						))}
					</div>
				</AdminPanel>
			</div>

			<AdminPanel title="Risks" description="Residual score shows risk after controls">
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>Risk</th>
								<th>Category</th>
								<th>Inherent</th>
								<th>Residual</th>
								<th>Owner</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{risks.map((risk) => (
								<tr key={risk.id}>
									<td>
										<strong>{risk.title}</strong>
										{risk.description ? <p className="muted">{risk.description}</p> : null}
										{risk.controls ? <p className="muted">Controls: {risk.controls}</p> : null}
									</td>
									<td>{risk.category.replace(/_/g, " ")}</td>
									<td>
										<span className={`admin-sev admin-sev-${scoreClass(risk.inherentScore)}`}>
											{risk.inherentScore}
										</span>
										<p className="muted">{risk.likelihood}×{risk.impact}</p>
									</td>
									<td>
										{risk.residualScore != null ? (
											<>
												<span className={`admin-sev admin-sev-${scoreClass(risk.residualScore)}`}>
													{risk.residualScore}
												</span>
												<p className="muted">
													{risk.residualLikelihood}×{risk.residualImpact}
												</p>
											</>
										) : (
											"—"
										)}
									</td>
									<td>{risk.ownerName || "—"}</td>
									<td>
										<span className="admin-chip">{risk.status}</span>
									</td>
									<td className="admin-row-actions">
										{risk.status === "open" && (
											<button type="button" className="ghost-btn" disabled={working} onClick={() => void setStatus(risk.id, "mitigating")}>
												Mitigate
											</button>
										)}
										{(risk.status === "open" || risk.status === "mitigating") && (
											<button type="button" className="ghost-btn" disabled={working} onClick={() => void setStatus(risk.id, "accepted")}>
												Accept
											</button>
										)}
										{risk.status !== "closed" && (
											<button type="button" className="primary-btn" disabled={working} onClick={() => void setStatus(risk.id, "closed")}>
												Close
											</button>
										)}
										<button
											type="button"
											className="ghost-btn"
											disabled={working}
											onClick={() => {
												if (window.confirm("Delete this risk?")) void deleteAdminRisk(risk.id).then(load);
											}}
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
