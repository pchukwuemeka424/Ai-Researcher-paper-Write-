"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useAdminUserQuery, matchesAdminUserQuery } from "@/hooks/useAdminUserQuery";
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

const STATUSES = [
	{ value: "", label: "All" },
	{ value: "new", label: "New" },
	{ value: "assigned", label: "Assigned" },
	{ value: "under_investigation", label: "Under investigation" },
	{ value: "waiting_for_response", label: "Waiting for response" },
	{ value: "resolved", label: "Resolved" },
	{ value: "closed", label: "Closed" },
] as const;

const STATUS_LABELS: Record<string, string> = {
	new: "New",
	assigned: "Assigned",
	under_investigation: "Under investigation",
	waiting_for_response: "Waiting for response",
	resolved: "Resolved",
	closed: "Closed",
};

const emptyForm = {
	title: "",
	description: "",
	kind: "policy_breach",
	severity: "medium",
	faculty: "",
	department: "",
	reportedByName: "",
	userInvolvedName: "",
	assigneeName: "",
	impactSummary: "",
	evidence: "",
};

function downloadIncidentReport(item: GovernanceIncidentRecord) {
	const lines = [
		["Field", "Value"],
		["Incident ID", item.id],
		["Title", item.title],
		["Reported By", item.reportedByName || item.reportedByEmail || ""],
		["User Involved", item.userInvolvedName || ""],
		["Faculty", item.faculty ?? ""],
		["Department", item.department ?? ""],
		["Date", item.detectedAt],
		["Severity", item.severity],
		["Category", item.kind],
		["Description", item.description],
		["Evidence", (item.evidence ?? []).join(" | ")],
		["Status", item.status],
		["Assignee", item.assigneeName],
		["Impact", item.impactSummary],
		["Containment", item.containmentActions],
		["Root Cause", item.rootCause],
		["Lessons", item.lessonsLearned],
	];
	const csv = lines
		.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
		.join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `incident-${item.id.slice(-8)}.csv`;
	link.click();
	URL.revokeObjectURL(url);
}

export function AdminIncidentsDashboard() {
	const { ready } = useAdminGuard();
	const [incidents, setIncidents] = useState<GovernanceIncidentRecord[]>([]);
	const [stats, setStats] = useState<IncidentStats | null>(null);
	const [statusFilter, setStatusFilter] = useState("");
	const [userFilter, setUserFilter] = useAdminUserQuery();
	const [form, setForm] = useState(emptyForm);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);

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

	const filteredIncidents = useMemo(() => {
		return incidents.filter((item) =>
			matchesAdminUserQuery(userFilter, [
				item.title,
				item.userInvolvedName,
				item.reportedByName,
				item.reportedByEmail,
				item.assigneeName,
				item.faculty,
				item.department,
			]),
		);
	}, [incidents, userFilter]);

	const onCreate = async () => {
		if (!form.title.trim()) {
			setError("Title is required.");
			return;
		}
		setWorking(true);
		setError(null);
		try {
			await createAdminIncident({
				...form,
				evidence: form.evidence.trim() || undefined,
			});
			setForm(emptyForm);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const patch = async (id: string, input: Record<string, unknown>) => {
		setWorking(true);
		setError(null);
		try {
			await updateAdminIncident(id, input);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const addComment = async (item: GovernanceIncidentRecord) => {
		const note = window.prompt("Add comment")?.trim();
		if (!note) return;
		await patch(item.id, { timelineNote: note });
	};

	const uploadEvidence = async (item: GovernanceIncidentRecord) => {
		const note = window.prompt("Evidence notes / text (file upload can be recorded as a note)")?.trim();
		if (!note) return;
		const evidence = [...(item.evidence ?? []), note];
		await patch(item.id, { evidence, timelineNote: `Evidence added: ${note}` });
	};

	const assignInvestigator = async (item: GovernanceIncidentRecord) => {
		const name = window.prompt("Investigator name", item.assigneeName)?.trim();
		if (!name) return;
		await patch(item.id, {
			assigneeName: name,
			status: item.status === "new" ? "assigned" : item.status,
			timelineNote: `Assigned investigator: ${name}`,
		});
	};

	const changeSeverity = async (item: GovernanceIncidentRecord) => {
		const severity = window.prompt("Severity (low, medium, high, critical)", item.severity)?.trim();
		if (!severity) return;
		if (!["low", "medium", "high", "critical"].includes(severity)) {
			setError("Severity must be low, medium, high, or critical.");
			return;
		}
		await patch(item.id, { severity, timelineNote: `Severity → ${severity}` });
	};

	const updateStatus = async (item: GovernanceIncidentRecord) => {
		const status = window
			.prompt(
				"Status (new, assigned, under_investigation, waiting_for_response, resolved, closed)",
				item.status,
			)
			?.trim();
		if (!status) return;
		const notes =
			status === "resolved" || status === "closed"
				? window.prompt("Resolution / close-out notes") ?? ""
				: "";
		await patch(item.id, {
			status,
			...(notes ? { rootCause: notes, timelineNote: notes } : {}),
		});
	};

	const statusCounts = useMemo(
		() => ({
			new: stats?.new ?? stats?.open ?? 0,
			assigned: stats?.assigned ?? 0,
			investigating: stats?.underInvestigation ?? stats?.investigating ?? 0,
			waiting: stats?.waitingForResponse ?? stats?.contained ?? 0,
		}),
		[stats],
	);

	return (
		<AdminShell
			title="User incidents"
			subtitle="Investigate and close incidents involving accounts, with full action history"
			breadcrumb="Admin · User safety"
			actions={
				<button type="button" className="ghost-btn" onClick={() => void load()}>
					Refresh
				</button>
			}
		>
			{loading && <p className="muted">Loading incidents…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Active" value={stats.active} accent="warning" />
					<AdminStatCard label="New" value={statusCounts.new} accent="danger" />
					<AdminStatCard label="Under investigation" value={statusCounts.investigating} accent="primary" />
					<AdminStatCard label="Waiting for response" value={statusCounts.waiting} />
					<AdminStatCard label="Critical (active)" value={stats.critical} accent="danger" />
					<AdminStatCard label="High (active)" value={stats.high} accent="warning" />
				</section>
			)}

			<div className="admin-gov-grid">
				<AdminPanel title="Open incident" description="Creates a flagged audit alert automatically">
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
								{KINDS.map((k) => (
									<option key={k} value={k}>
										{k.replace(/_/g, " ")}
									</option>
								))}
							</select>
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
							Department
							<input
								className="topic-input"
								value={form.department}
								onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
							/>
						</label>
						<label>
							Reported by
							<input
								className="topic-input"
								value={form.reportedByName}
								onChange={(e) => setForm((f) => ({ ...f, reportedByName: e.target.value }))}
							/>
						</label>
						<label>
							User involved
							<input
								className="topic-input"
								value={form.userInvolvedName}
								onChange={(e) => setForm((f) => ({ ...f, userInvolvedName: e.target.value }))}
							/>
						</label>
						<label>
							Assignee / investigator
							<input
								className="topic-input"
								value={form.assigneeName}
								onChange={(e) => setForm((f) => ({ ...f, assigneeName: e.target.value }))}
							/>
						</label>
						<label className="admin-form-span">
							Impact summary
							<input
								className="topic-input"
								value={form.impactSummary}
								onChange={(e) => setForm((f) => ({ ...f, impactSummary: e.target.value }))}
							/>
						</label>
						<label className="admin-form-span">
							Description
							<textarea
								className="topic-input"
								rows={3}
								value={form.description}
								onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
							/>
						</label>
						<label className="admin-form-span">
							Evidence (notes / text)
							<textarea
								className="topic-input"
								rows={2}
								value={form.evidence}
								onChange={(e) => setForm((f) => ({ ...f, evidence: e.target.value }))}
								placeholder="Links, hashes, or descriptive notes"
							/>
						</label>
					</div>
					<button type="button" className="primary-btn" disabled={working} onClick={() => void onCreate()}>
						Open incident
					</button>
				</AdminPanel>

				<AdminPanel title="Workflow filter" description="Filter by lifecycle stage or involved user">
					<div className="admin-filters admin-filter-wrap">
						{STATUSES.map((s) => (
							<button
								key={s.value || "all"}
								type="button"
								className={`ghost-btn${statusFilter === s.value ? " admin-filter-active" : ""}`}
								onClick={() => setStatusFilter(s.value)}
							>
								{s.label}
							</button>
						))}
					</div>
					<label className="field-label" htmlFor="incident-user-filter" style={{ marginTop: "0.75rem" }}>
						User involved
					</label>
					<input
						id="incident-user-filter"
						className="topic-input"
						value={userFilter}
						onChange={(e) => setUserFilter(e.target.value)}
						placeholder="Filter by user name or email…"
					/>
				</AdminPanel>
			</div>

			<AdminPanel
				title="Incident log"
				description={`${filteredIncidents.length.toLocaleString()} of ${incidents.length.toLocaleString()} incidents · scoped to users`}
			>
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>Incident ID</th>
								<th>Date</th>
								<th>Severity</th>
								<th>Category</th>
								<th>Reported by</th>
								<th>User involved</th>
								<th>Faculty</th>
								<th>Department</th>
								<th>Status</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{filteredIncidents.length === 0 ? (
								<tr>
									<td colSpan={10} className="muted">
										{incidents.length === 0
											? "No incidents recorded."
											: "No incidents match this user filter."}
									</td>
								</tr>
							) : (
								filteredIncidents.map((item) => (
									<Fragment key={item.id}>
										<tr
											className={
												item.severity === "critical" || item.severity === "high"
													? "admin-row-flagged"
													: undefined
											}
										>
											<td>
												<button
													type="button"
													className="admin-link-btn"
													onClick={() =>
														setExpandedId((id) => (id === item.id ? null : item.id))
													}
												>
													{item.id.slice(-8)}
												</button>
											</td>
											<td>{formatAdminDate(item.detectedAt)}</td>
											<td>
												<span className={`admin-sev admin-sev-${item.severity}`}>
													{item.severity}
												</span>
											</td>
											<td>{item.kind.replace(/_/g, " ")}</td>
											<td>{item.reportedByName || item.reportedByEmail || "—"}</td>
											<td>{item.userInvolvedName || "—"}</td>
											<td>{item.faculty ?? "—"}</td>
											<td>{item.department ?? "—"}</td>
											<td>
												<span className="admin-chip">
													{STATUS_LABELS[item.status] ?? item.status}
												</span>
											</td>
											<td>
												<div className="admin-row-actions">
													<button
														type="button"
														className="ghost-btn"
														disabled={working}
														onClick={() => void addComment(item)}
													>
														Add comment
													</button>
													<button
														type="button"
														className="ghost-btn"
														disabled={working}
														onClick={() => void uploadEvidence(item)}
													>
														Upload evidence
													</button>
													<button
														type="button"
														className="ghost-btn"
														disabled={working}
														onClick={() => void assignInvestigator(item)}
													>
														Assign investigator
													</button>
													<button
														type="button"
														className="ghost-btn"
														disabled={working}
														onClick={() => void changeSeverity(item)}
													>
														Change severity
													</button>
													<button
														type="button"
														className="ghost-btn"
														disabled={working}
														onClick={() => void updateStatus(item)}
													>
														Update status
													</button>
													<button
														type="button"
														className="primary-btn"
														onClick={() => downloadIncidentReport(item)}
													>
														Export report
													</button>
												</div>
											</td>
										</tr>
										{expandedId === item.id && (
											<tr>
												<td colSpan={10}>
													<strong>{item.title}</strong>
													<p>{item.description || "No description."}</p>
													{item.impactSummary ? (
														<p className="muted">Impact: {item.impactSummary}</p>
													) : null}
													{item.evidence?.length ? (
														<p className="muted">Evidence: {item.evidence.join(" · ")}</p>
													) : (
														<p className="muted">No evidence attached.</p>
													)}
													{item.assigneeName ? (
														<p className="muted">Investigator: {item.assigneeName}</p>
													) : null}
													{item.timeline?.length ? (
														<p className="muted">
															History:{" "}
															{item.timeline
																.slice(-5)
																.map(
																	(entry) =>
																		`${entry.action}${entry.note ? ` (${entry.note})` : ""}`,
																)
																.join(" → ")}
														</p>
													) : null}
												</td>
											</tr>
										)}
									</Fragment>
								))
							)}
						</tbody>
					</table>
				</div>
			</AdminPanel>
		</AdminShell>
	);
}
