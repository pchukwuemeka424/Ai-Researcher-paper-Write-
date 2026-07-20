"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { createAdminIncident, fetchAdminIncidents, updateAdminIncident } from "@/lib/admin-api";
import type { GovernanceIncidentRecord, IncidentStats } from "@/lib/admin-governance";

const KINDS = [
	"policy_breach",
	"sensitive_data",
	"unauthorized_use",
	"model_failure",
	"third_party",
	"academic_misconduct",
	"other",
] as const;

const emptyForm = {
	title: "",
	description: "",
	kind: "policy_breach",
	severity: "medium",
	faculty: "",
	impactSummary: "",
	assigneeName: "",
};

export function AdminIncidentsDashboard() {
	const { ready } = useAdminGuard();
	const [incidents, setIncidents] = useState<GovernanceIncidentRecord[]>([]);
	const [stats, setStats] = useState<IncidentStats | null>(null);
	const [statusFilter, setStatusFilter] = useState("");
	const [form, setForm] = useState(emptyForm);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminIncidents({ status: statusFilter || undefined });
			setIncidents(data.incidents);
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
			await createAdminIncident(form);
			setForm(emptyForm);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const advance = async (id: string, status: string) => {
		const notes =
			status === "contained" || status === "resolved"
				? window.prompt(status === "contained" ? "Containment actions" : "Root cause / resolution notes") ?? ""
				: "";
		setWorking(true);
		try {
			await updateAdminIncident(id, {
				status,
				...(status === "contained" ? { containmentActions: notes } : {}),
				...(status === "resolved" ? { rootCause: notes } : {}),
			});
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	return (
		<AdminShell
			title="Incidents"
			subtitle="Lifecycle for policy breaches, sensitive-data exposure, and other AI risk events"
			breadcrumb="Admin · Governance"
		>
			{loading && <p className="muted">Loading incidents…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Active" value={stats.active} accent="warning" />
					<AdminStatCard label="Open" value={stats.open} accent="danger" />
					<AdminStatCard label="Investigating" value={stats.investigating} accent="primary" />
					<AdminStatCard label="Critical (active)" value={stats.critical} accent="danger" />
					<AdminStatCard label="High (active)" value={stats.high} accent="warning" />
				</section>
			)}

			<div className="admin-gov-grid">
				<AdminPanel title="Open incident" description="Creates a flagged audit alert automatically">
					<div className="admin-form-grid">
						<label>
							Title
							<input className="topic-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
						</label>
						<label>
							Kind
							<select className="topic-input" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
								{KINDS.map((k) => (
									<option key={k} value={k}>{k.replace(/_/g, " ")}</option>
								))}
							</select>
						</label>
						<label>
							Severity
							<select className="topic-input" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
								{["low", "medium", "high", "critical"].map((s) => (
									<option key={s} value={s}>{s}</option>
								))}
							</select>
						</label>
						<label>
							Faculty
							<input className="topic-input" value={form.faculty} onChange={(e) => setForm((f) => ({ ...f, faculty: e.target.value }))} />
						</label>
						<label>
							Assignee
							<input className="topic-input" value={form.assigneeName} onChange={(e) => setForm((f) => ({ ...f, assigneeName: e.target.value }))} />
						</label>
						<label className="admin-form-span">
							Impact summary
							<input className="topic-input" value={form.impactSummary} onChange={(e) => setForm((f) => ({ ...f, impactSummary: e.target.value }))} />
						</label>
						<label className="admin-form-span">
							Description
							<textarea className="topic-input" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
						</label>
					</div>
					<button type="button" className="primary-btn" disabled={working} onClick={() => void onCreate()}>
						Open incident
					</button>
				</AdminPanel>

				<AdminPanel title="Queue" description="Filter by lifecycle stage">
					<div className="admin-filter-row admin-filter-wrap">
						{(["", "open", "investigating", "contained", "resolved", "closed"] as const).map((id) => (
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

			<AdminPanel title="Incident log" description="Investigate → contain → resolve → close">
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>Detected</th>
								<th>Severity</th>
								<th>Incident</th>
								<th>Faculty</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{incidents.length === 0 ? (
								<tr>
									<td colSpan={6} className="muted">No incidents recorded.</td>
								</tr>
							) : (
								incidents.map((item) => (
									<tr key={item.id} className={item.severity === "critical" || item.severity === "high" ? "admin-row-flagged" : undefined}>
										<td>{formatAdminDate(item.detectedAt)}</td>
										<td>
											<span className={`admin-sev admin-sev-${item.severity}`}>{item.severity}</span>
										</td>
										<td>
											<strong>{item.title}</strong>
											<p className="muted">{item.kind.replace(/_/g, " ")}</p>
											{item.impactSummary ? <p className="muted">{item.impactSummary}</p> : null}
											{item.containmentActions ? <p className="muted">Containment: {item.containmentActions}</p> : null}
										</td>
										<td>{item.faculty ?? "—"}</td>
										<td>
											<span className="admin-chip">{item.status}</span>
										</td>
										<td className="admin-row-actions">
											{item.status === "open" && (
												<button type="button" className="ghost-btn" disabled={working} onClick={() => void advance(item.id, "investigating")}>
													Investigate
												</button>
											)}
											{(item.status === "open" || item.status === "investigating") && (
												<button type="button" className="ghost-btn" disabled={working} onClick={() => void advance(item.id, "contained")}>
													Contain
												</button>
											)}
											{item.status !== "resolved" && item.status !== "closed" && (
												<button type="button" className="primary-btn" disabled={working} onClick={() => void advance(item.id, "resolved")}>
													Resolve
												</button>
											)}
											{item.status === "resolved" && (
												<button type="button" className="ghost-btn" disabled={working} onClick={() => void advance(item.id, "closed")}>
													Close
												</button>
											)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</AdminPanel>
		</AdminShell>
	);
}
