"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { fetchGovernanceDashboard } from "@/lib/admin-api";
import type { GovernanceDashboard } from "@/lib/admin-governance";

export function AdminGovernanceDashboard() {
	const { ready } = useAdminGuard();
	const [data, setData] = useState<GovernanceDashboard | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			setData(await fetchGovernanceDashboard());
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	return (
		<AdminShell
			title="AI Governance"
			subtitle="Single institutional view of AI use in research across the university"
			breadcrumb="Admin · Governance"
			actions={
				<button type="button" className="ghost-btn" onClick={() => void load()}>
					Refresh
				</button>
			}
		>
			{loading && <p className="muted">Loading governance overview…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{data && (
				<>
					<section className="admin-stats">
						<AdminStatCard
							label="Active accounts"
							value={data.aiUsage.totals.activeUsers}
							accent="primary"
							hint={`${data.aiUsage.totals.users} total`}
						/>
						<AdminStatCard
							label="Compliance score"
							value={`${data.compliance.score}%`}
							accent={data.compliance.gap > 0 ? "warning" : "success"}
							hint={`${data.compliance.gap} gaps`}
						/>
						<AdminStatCard
							label="Open risks"
							value={data.risks.open + data.risks.mitigating}
							accent={data.risks.highInherent > 0 ? "danger" : "warning"}
							hint={`${data.risks.highInherent} high inherent`}
						/>
						<AdminStatCard
							label="Active incidents"
							value={data.incidents.active}
							accent={data.incidents.active > 0 ? "danger" : "success"}
							hint={`${data.incidents.critical} critical`}
						/>
						<AdminStatCard
							label="High-risk systems"
							value={data.inventory.highRisk}
							accent={data.inventory.highRisk > 0 ? "warning" : undefined}
							hint={`${data.inventory.dpiaPending} DPIA pending`}
						/>
					</section>

					<div className="admin-gov-grid">
						<AdminPanel
							title="Top open risks"
							description="Highest inherent scores needing treatment"
							actions={
								<Link href="/admin/risks" className="ghost-btn">
									Risk register
								</Link>
							}
						>
							{data.topRisks.length === 0 ? (
								<p className="muted">No open risks.</p>
							) : (
								<ul className="admin-timeline">
									{data.topRisks.map((risk) => (
										<li key={risk.id}>
											<span className="admin-sev admin-sev-high">{risk.inherentScore}</span>
											<div>
												<p>{risk.title}</p>
												<p className="muted">
													{risk.category.replace(/_/g, " ")}
													{risk.residualScore != null ? ` · residual ${risk.residualScore}` : ""}
												</p>
											</div>
										</li>
									))}
								</ul>
							)}
						</AdminPanel>

						<AdminPanel
							title="Compliance posture"
							description="Nigeria AI Act / NAIS, NDPA, institutional, EU AI Act, ISO 42001, UNESCO"
							actions={
								<Link href="/admin/compliance" className="ghost-btn">
									Controls
								</Link>
							}
						>
							<div className="admin-policy-chips">
								<span className="admin-chip admin-chip-success">
									{data.compliance.compliant} compliant
								</span>
								<span className="admin-chip admin-chip-warning">
									{data.compliance.inProgress} in progress
								</span>
								<span className="admin-chip admin-chip-danger">
									{data.compliance.gap} gaps
								</span>
							</div>
							<p className="muted admin-panel-note">
								Score {data.compliance.score}% · {data.compliance.criticalGaps} critical/high gaps
							</p>
						</AdminPanel>

						<AdminPanel
							title="Active incidents"
							description="Policy breaches and sensitive-data events"
							actions={
								<Link href="/admin/incidents" className="ghost-btn">
									Manage
								</Link>
							}
						>
							{data.activeIncidents.length === 0 ? (
								<p className="muted">No open incidents.</p>
							) : (
								<ul className="admin-timeline">
									{data.activeIncidents.map((item) => (
										<li key={item.id}>
											<span className={`admin-sev admin-sev-${item.severity}`}>{item.severity}</span>
											<div>
												<p>{item.title}</p>
												<p className="muted">
													{item.kind.replace(/_/g, " ")} · {formatAdminDate(item.detectedAt)}
												</p>
											</div>
										</li>
									))}
								</ul>
							)}
						</AdminPanel>

						<AdminPanel
							title="High-risk AI systems"
							description="Inventory entries requiring oversight / DPIA"
							actions={
								<Link href="/admin/inventory" className="ghost-btn">
									Inventory
								</Link>
							}
						>
							{data.highRiskSystems.length === 0 ? (
								<p className="muted">No high-risk systems registered.</p>
							) : (
								<ul className="admin-timeline">
									{data.highRiskSystems.map((system) => (
										<li key={system.id}>
											<span className="admin-chip admin-chip-danger">{system.riskTier}</span>
											<div>
												<p>{system.name}</p>
												<p className="muted">
													DPIA: {system.dpiaStatus.replace(/_/g, " ")} · {system.status}
												</p>
											</div>
										</li>
									))}
								</ul>
							)}
						</AdminPanel>

						<AdminPanel
							title="AI use by faculty"
							description="Adoption and intensity across faculties"
							actions={
								<Link href="/admin/analytics" className="ghost-btn">
									Full analytics
								</Link>
							}
						>
							{data.aiUsage.byFaculty.length === 0 ? (
								<p className="muted">No faculty activity yet.</p>
							) : (
								<table className="admin-simple-table">
									<thead>
										<tr>
											<th>Faculty</th>
											<th>Users</th>
											<th>Sessions</th>
											<th>Tokens</th>
											<th>Intensity</th>
										</tr>
									</thead>
									<tbody>
										{data.aiUsage.byFaculty.map((row) => (
											<tr key={row.key}>
												<td>{row.label}</td>
												<td>{row.activeUsers}</td>
												<td>{row.sessions}</td>
												<td>{row.tokensUsed.toLocaleString()}</td>
												<td>{row.intensity}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</AdminPanel>

						<AdminPanel
							title="Policy posture"
							description="Institutional permit / restrict / block rules"
							actions={
								<Link href="/admin/policies" className="ghost-btn">
									Manage
								</Link>
							}
						>
							<div className="admin-policy-chips">
								<span className="admin-chip admin-chip-success">
									{data.policies.permitted} permitted
								</span>
								<span className="admin-chip admin-chip-warning">
									{data.policies.restricted} restricted
								</span>
								<span className="admin-chip admin-chip-danger">
									{data.policies.blocked} blocked
								</span>
							</div>
							<p className="muted admin-panel-note">
								{data.policies.total} rules in force
								{data.policies.disabled > 0 ? ` (${data.policies.disabled} disabled)` : ""}.
							</p>
						</AdminPanel>

						<AdminPanel
							title="Risk flags & alerts"
							description="Sensitive-data exposure and policy-breach signals"
							actions={
								<Link href="/admin/audit" className="ghost-btn">
									Audit log
								</Link>
							}
						>
							{data.recentFlags.length === 0 ? (
								<p className="muted">No flagged events.</p>
							) : (
								<ul className="admin-timeline">
									{data.recentFlags.map((log) => (
										<li key={log.id}>
											<span className={`admin-sev admin-sev-${log.severity}`}>{log.severity}</span>
											<div>
												<p>{log.summary}</p>
												<p className="muted">{formatAdminDate(log.createdAt)}</p>
											</div>
										</li>
									))}
								</ul>
							)}
						</AdminPanel>

						<AdminPanel
							title="Approval queue"
							description="New tools, datasets, and use cases"
							actions={
								<Link href="/admin/approvals" className="ghost-btn">
									Review
								</Link>
							}
						>
							{data.pendingApprovals.length === 0 ? (
								<p className="muted">No pending approvals.</p>
							) : (
								<ul className="admin-timeline">
									{data.pendingApprovals.map((item) => (
										<li key={item.id}>
											<span className="admin-chip">{item.kind}</span>
											<div>
												<p>{item.title}</p>
												<p className="muted">
													{item.faculty ?? "—"} · {item.requesterName ?? item.requesterEmail}
												</p>
											</div>
										</li>
									))}
								</ul>
							)}
						</AdminPanel>
					</div>
				</>
			)}
		</AdminShell>
	);
}
