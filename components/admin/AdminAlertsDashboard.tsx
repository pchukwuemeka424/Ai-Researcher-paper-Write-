"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useAdminUserQuery, matchesAdminUserQuery } from "@/hooks/useAdminUserQuery";
import { createAdminAlert, fetchAdminAlerts, updateAdminAlert } from "@/lib/admin-api";
import type { AlertStats, GovernanceAlertRecord } from "@/lib/admin-governance";

const ALERT_KINDS = [
	"sensitive_data",
	"policy_violation",
	"excessive_token_usage",
	"unusual_login",
	"multiple_failed_logins",
	"suspicious_ai_prompt",
	"restricted_content",
	"excessive_document_generation",
	"abnormal_user_activity",
	"data_retention_warning",
	"policy_breach",
	"high_risk_activity",
	"unusual_usage",
	"privacy",
	"security",
	"other",
] as const;

const PRIMARY_KINDS = ALERT_KINDS.slice(0, 10);

const STATUSES = [
	"open",
	"acknowledged",
	"investigating",
	"escalated",
	"resolved",
	"closed",
] as const;

const emptyForm = {
	title: "",
	summary: "",
	kind: "policy_violation",
	severity: "high",
	faculty: "",
	actorName: "",
	assigneeName: "",
};

function displayStatus(status: string): string {
	return status === "dismissed" ? "closed" : status;
}

function isOpenLike(status: string): boolean {
	const s = displayStatus(status);
	return s === "open" || s === "acknowledged" || s === "investigating" || s === "escalated";
}

export function AdminAlertsDashboard() {
	const { ready } = useAdminGuard();
	const [alerts, setAlerts] = useState<GovernanceAlertRecord[]>([]);
	const [stats, setStats] = useState<AlertStats | null>(null);
	const [statusFilter, setStatusFilter] = useState("");
	const [kindFilter, setKindFilter] = useState("");
	const [severityFilter, setSeverityFilter] = useState("");
	const [facultyFilter, setFacultyFilter] = useState("");
	const [search, setSearch] = useAdminUserQuery();
	const [form, setForm] = useState(emptyForm);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminAlerts({
				status: statusFilter || undefined,
				severity: severityFilter || undefined,
				kind: kindFilter || undefined,
			});
			setAlerts(data.alerts);
			setStats(data.stats);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, [statusFilter, severityFilter, kindFilter]);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const faculties = useMemo(
		() => [...new Set(alerts.map((a) => a.faculty).filter(Boolean) as string[])].sort(),
		[alerts],
	);

	const filtered = useMemo(() => {
		return alerts.filter((a) => {
			if (facultyFilter && (a.faculty ?? "") !== facultyFilter) return false;
			if (statusFilter === "closed" && displayStatus(a.status) !== "closed") return false;
			return matchesAdminUserQuery(search, [
				a.title,
				a.summary,
				a.actorName,
				a.actorEmail,
				a.kind,
				a.id,
			]);
		});
	}, [alerts, facultyFilter, search, statusFilter]);

	const onCreate = async () => {
		if (!form.title.trim() || !form.summary.trim()) {
			setError("Title and summary are required.");
			return;
		}
		setWorking(true);
		setError(null);
		try {
			await createAdminAlert({
				title: form.title,
				summary: form.summary,
				kind: form.kind,
				severity: form.severity,
				faculty: form.faculty || undefined,
				actorName: form.actorName || undefined,
				assigneeName: form.assigneeName || undefined,
			});
			setForm(emptyForm);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const advance = async (
		id: string,
		status: string,
		extra?: { assigneeName?: string; responseNotes?: string },
	) => {
		setWorking(true);
		setError(null);
		try {
			await updateAdminAlert(id, {
				status,
				...(extra?.assigneeName !== undefined ? { assigneeName: extra.assigneeName } : {}),
				...(extra?.responseNotes !== undefined ? { responseNotes: extra.responseNotes } : {}),
			});
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const onAssign = async (alert: GovernanceAlertRecord) => {
		const name = window.prompt("Assign administrator name", alert.assigneeName ?? "") ?? "";
		if (!name.trim()) return;
		setWorking(true);
		try {
			await updateAdminAlert(alert.id, { assigneeName: name.trim() });
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const onResolveOrClose = async (id: string, status: "resolved" | "closed") => {
		const notes = window.prompt("Response notes for close-out") ?? "";
		await advance(id, status, { responseNotes: notes });
	};

	return (
		<AdminShell
			title="User alerts"
			subtitle="Login anomalies, token spikes, and policy alerts tied to accounts"
			breadcrumb="Admin · User safety"
			actions={
				<button type="button" className="ghost-btn" onClick={() => void load()}>
					Refresh
				</button>
			}
		>
			{loading && <p className="muted">Loading alerts…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard
						label="Active"
						value={stats.active}
						accent={stats.active > 0 ? "danger" : "success"}
					/>
					<AdminStatCard label="Open" value={stats.open} accent="warning" />
					<AdminStatCard label="Acknowledged" value={stats.acknowledged} />
					<AdminStatCard label="Investigating" value={stats.investigating} accent="primary" />
					<AdminStatCard label="Escalated" value={stats.escalated ?? 0} accent="danger" />
					<AdminStatCard label="Critical" value={stats.critical} accent="danger" />
					<AdminStatCard label="High" value={stats.high} accent="warning" />
					<AdminStatCard label="Last 24h" value={stats.last24h} accent="primary" />
				</section>
			)}

			<div className="admin-gov-grid">
				<AdminPanel title="Create alert" description="Manual governance alert with investigation context">
					<div className="admin-form-grid">
						<label>
							Title
							<input
								className="topic-input"
								value={form.title}
								onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
							/>
						</label>
						<label>
							Category
							<select
								className="topic-input"
								value={form.kind}
								onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
							>
								{PRIMARY_KINDS.map((k) => (
									<option key={k} value={k}>
										{k}
									</option>
								))}
								<optgroup label="Legacy">
									{ALERT_KINDS.slice(10).map((k) => (
										<option key={k} value={k}>
											{k}
										</option>
									))}
								</optgroup>
							</select>
						</label>
						<label className="admin-form-span">
							Description
							<input
								className="topic-input"
								value={form.summary}
								onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
							/>
						</label>
						<label>
							Severity
							<select
								className="topic-input"
								value={form.severity}
								onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
							>
								{["low", "medium", "high", "critical"].map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</label>
						<label>
							Faculty
							<input
								className="topic-input"
								value={form.faculty}
								onChange={(e) => setForm((f) => ({ ...f, faculty: e.target.value }))}
							/>
						</label>
						<label>
							User
							<input
								className="topic-input"
								value={form.actorName}
								onChange={(e) => setForm((f) => ({ ...f, actorName: e.target.value }))}
								placeholder="Affected user name"
							/>
						</label>
						<label>
							Assigned administrator
							<input
								className="topic-input"
								value={form.assigneeName}
								onChange={(e) => setForm((f) => ({ ...f, assigneeName: e.target.value }))}
							/>
						</label>
					</div>
					<button type="button" className="primary-btn" disabled={working} onClick={() => void onCreate()}>
						Create alert
					</button>
				</AdminPanel>

				<AdminPanel title="Filters" description="Focus the response queue">
					<div className="admin-filters admin-form-grid">
						<label>
							Search
							<input
								className="topic-input"
								placeholder="ID, title, user…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</label>
						<label>
							Status
							<select
								className="topic-input"
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
							>
								<option value="">All</option>
								{STATUSES.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</label>
						<label>
							Category
							<select
								className="topic-input"
								value={kindFilter}
								onChange={(e) => setKindFilter(e.target.value)}
							>
								<option value="">All</option>
								{ALERT_KINDS.map((k) => (
									<option key={k} value={k}>
										{k}
									</option>
								))}
							</select>
						</label>
						<label>
							Severity
							<select
								className="topic-input"
								value={severityFilter}
								onChange={(e) => setSeverityFilter(e.target.value)}
							>
								<option value="">All</option>
								{["low", "medium", "high", "critical"].map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</label>
						<label>
							Faculty
							<select
								className="topic-input"
								value={facultyFilter}
								onChange={(e) => setFacultyFilter(e.target.value)}
							>
								<option value="">All</option>
								{faculties.map((f) => (
									<option key={f} value={f}>
										{f}
									</option>
								))}
							</select>
						</label>
					</div>
				</AdminPanel>
			</div>

			<AdminPanel title="Alert queue" description="Acknowledge, assign, investigate, escalate, resolve, close">
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>Alert ID</th>
								<th>Severity</th>
								<th>Category</th>
								<th>User</th>
								<th>Faculty</th>
								<th>Date</th>
								<th>Description</th>
								<th>Status</th>
								<th>Assigned Administrator</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{filtered.length === 0 ? (
								<tr>
									<td colSpan={10} className="muted">
										No alerts in this view.
									</td>
								</tr>
							) : (
								filtered.map((alert) => {
									const status = displayStatus(alert.status);
									return (
										<tr key={alert.id}>
											<td>
												<code className="admin-hash" title={alert.id}>
													{alert.id.slice(0, 8)}…
												</code>
											</td>
											<td>
												<span className={`admin-sev admin-sev-${alert.severity}`}>
													{alert.severity}
												</span>
											</td>
											<td>{alert.kind}</td>
											<td>
												{alert.actorName || "—"}
												{alert.actorEmail ? <p className="muted">{alert.actorEmail}</p> : null}
											</td>
											<td>{alert.faculty ?? "—"}</td>
											<td>{formatAdminDate(alert.createdAt)}</td>
											<td>
												<strong>{alert.title}</strong>
												<p className="muted">{alert.summary}</p>
											</td>
											<td>
												<span className={`admin-chip admin-chip-status-${status}`}>{status}</span>
											</td>
											<td>{alert.assigneeName || "—"}</td>
											<td className="admin-row-actions">
												{status === "open" && (
													<button
														type="button"
														className="ghost-btn"
														disabled={working}
														onClick={() => void advance(alert.id, "acknowledged")}
													>
														Acknowledge
													</button>
												)}
												<button
													type="button"
													className="ghost-btn"
													disabled={working}
													onClick={() => void onAssign(alert)}
												>
													Assign
												</button>
												{isOpenLike(status) && status !== "investigating" && (
													<button
														type="button"
														className="ghost-btn"
														disabled={working}
														onClick={() => void advance(alert.id, "investigating")}
													>
														Investigate
													</button>
												)}
												{isOpenLike(status) && (
													<>
														<button
															type="button"
															className="ghost-btn"
															disabled={working}
															onClick={() => void advance(alert.id, "escalated")}
														>
															Escalate
														</button>
														<button
															type="button"
															className="ghost-btn"
															disabled={working}
															onClick={() => void onResolveOrClose(alert.id, "resolved")}
														>
															Resolve
														</button>
														<button
															type="button"
															className="ghost-btn"
															disabled={working}
															onClick={() => void onResolveOrClose(alert.id, "closed")}
														>
															Close
														</button>
													</>
												)}
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
