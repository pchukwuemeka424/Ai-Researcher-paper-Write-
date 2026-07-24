"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useAdminUserQuery } from "@/hooks/useAdminUserQuery";
import { fetchAdminAuditLogs, flagAdminAuditLog } from "@/lib/admin-api";
import type { AuditAlertStats, AuditLogRecord } from "@/lib/admin-governance";

const ACTIVITY_CHIPS: Array<{ label: string; match: string[] }> = [
	{ label: "Login", match: ["login", "auth.login", "signed_in"] },
	{ label: "Logout", match: ["logout", "auth.logout", "signed_out"] },
	{ label: "Registration", match: ["register", "registration", "signup"] },
	{ label: "Password Change", match: ["password", "reset-password", "password_change"] },
	{ label: "AI Prompt Submission", match: ["prompt", "ai.prompt", "ai_prompt"] },
	{ label: "AI Response Generated", match: ["ai.response", "assistant", "completion"] },
	{ label: "File Upload", match: ["upload", "file.upload"] },
	{ label: "File Download", match: ["download", "file.download", "export"] },
	{ label: "Policy Update", match: ["policy", "policy.update", "policy."] },
	{ label: "User Suspension", match: ["suspend", "suspension"] },
	{ label: "User Activation", match: ["activat", "user.activate"] },
	{ label: "Incident Creation", match: ["incident.create", "incident.opened"] },
	{ label: "Incident Update", match: ["incident.update", "incident."] },
	{ label: "Incident Resolution", match: ["incident.resolve", "incident.resolved"] },
	{ label: "Role Change", match: ["role", "role_change"] },
	{ label: "Permission Change", match: ["permission", "acl"] },
];

type DetailBag = Record<string, unknown>;

function asDetails(details: unknown): DetailBag {
	if (details && typeof details === "object" && !Array.isArray(details)) {
		return details as DetailBag;
	}
	return {};
}

function detailStr(details: DetailBag, ...keys: string[]): string | null {
	for (const key of keys) {
		const v = details[key];
		if (v == null || v === "") continue;
		if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
	}
	return null;
}

function parseUa(ua: string | null): { device: string; browser: string } {
	if (!ua) return { device: "—", browser: "—" };
	const device = /mobile|android|iphone|ipad/i.test(ua)
		? "Mobile"
		: /macintosh|mac os/i.test(ua)
			? "Mac"
			: /windows/i.test(ua)
				? "Windows"
				: /linux/i.test(ua)
					? "Linux"
					: "Desktop";
	let browser = "—";
	if (/edg\//i.test(ua)) browser = "Edge";
	else if (/chrome\//i.test(ua)) browser = "Chrome";
	else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
	else if (/firefox\//i.test(ua)) browser = "Firefox";
	else browser = ua.slice(0, 24);
	return { device, browser };
}

function enrichLog(log: AuditLogRecord) {
	const details = asDetails(log.details);
	const ip =
		log.ip ??
		detailStr(details, "ip", "ipAddress", "ip_address", "clientIp") ??
		"—";
	const userAgent =
		log.userAgent ?? detailStr(details, "userAgent", "user_agent", "ua") ?? null;
	const { device, browser } = parseUa(userAgent);
	const sessionId =
		log.sessionId ??
		detailStr(details, "sessionId", "session_id", "session") ??
		"—";
	const beforeValue =
		log.beforeValue ??
		detailStr(details, "before", "beforeValue", "before_value", "previous") ??
		"—";
	const afterValue =
		log.afterValue ??
		detailStr(details, "after", "afterValue", "after_value", "next") ??
		"—";
	const status = log.status ?? detailStr(details, "status") ?? (log.flagged ? "flagged" : "recorded");
	return {
		...log,
		ip,
		device: detailStr(details, "device") ?? device,
		browser: detailStr(details, "browser") ?? browser,
		sessionId,
		beforeValue,
		afterValue,
		status,
		resource: log.targetType
			? `${log.targetType}${log.targetId ? `:${log.targetId.slice(0, 8)}` : ""}`
			: (detailStr(details, "resource", "target") ?? "—"),
	};
}

function matchesActivity(log: AuditLogRecord, chip: (typeof ACTIVITY_CHIPS)[number]): boolean {
	const hay = `${log.action} ${log.category} ${log.summary}`.toLowerCase();
	return chip.match.some((m) => hay.includes(m.toLowerCase()));
}

function downloadText(filename: string, content: string, mime: string) {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

function toCsv(rows: ReturnType<typeof enrichLog>[]): string {
	const headers = [
		"Log ID",
		"Timestamp",
		"User",
		"User Role",
		"Faculty",
		"Department",
		"IP Address",
		"Device",
		"Browser",
		"Session ID",
		"Action Type",
		"Resource",
		"Before Value",
		"After Value",
		"Risk Level",
		"Status",
	];
	const body = rows.map((r) => [
		r.id,
		r.createdAt,
		r.actorName ?? r.actorEmail ?? "",
		r.actorRole ?? "",
		r.faculty ?? "",
		r.department ?? "",
		r.ip,
		r.device,
		r.browser,
		r.sessionId,
		r.action,
		r.resource,
		r.beforeValue,
		r.afterValue,
		r.severity,
		r.status,
	]);
	return [headers, ...body]
		.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
		.join("\n");
}

export function AdminAuditDashboard() {
	const { ready } = useAdminGuard();
	const [logs, setLogs] = useState<AuditLogRecord[]>([]);
	const [stats, setStats] = useState<AuditAlertStats | null>(null);
	const [search, setSearch] = useAdminUserQuery();
	const [category, setCategory] = useState("");
	const [severity, setSeverity] = useState("");
	const [faculty, setFaculty] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [activityChip, setActivityChip] = useState<string | null>(null);
	const [timelineView, setTimelineView] = useState(false);
	const [selected, setSelected] = useState<ReturnType<typeof enrichLog> | null>(null);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminAuditLogs({
				limit: 200,
				category: category || undefined,
				severity: severity || undefined,
				q: search.trim() || undefined,
			});
			setLogs(data.logs);
			setStats(data.stats);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, [category, severity, search]);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const enriched = useMemo(() => logs.map(enrichLog), [logs]);

	const filtered = useMemo(() => {
		return enriched.filter((log) => {
			if (faculty && (log.faculty ?? "") !== faculty) return false;
			if (dateFrom && new Date(log.createdAt).getTime() < new Date(dateFrom).getTime()) return false;
			if (dateTo) {
				const end = new Date(dateTo).getTime() + 86_400_000;
				if (new Date(log.createdAt).getTime() > end) return false;
			}
			if (activityChip) {
				const chip = ACTIVITY_CHIPS.find((c) => c.label === activityChip);
				if (chip && !matchesActivity(log, chip)) return false;
			}
			return true;
		});
	}, [enriched, faculty, dateFrom, dateTo, activityChip]);

	const faculties = useMemo(
		() => [...new Set(logs.map((l) => l.faculty).filter(Boolean) as string[])].sort(),
		[logs],
	);

	const onFlag = async (id: string) => {
		const reason = window.prompt("Flag reason (e.g. policy breach, sensitive data)");
		if (!reason?.trim()) return;
		setWorking(true);
		try {
			await flagAdminAuditLog(id, reason.trim(), "high");
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const exportCsv = () => {
		downloadText(
			`audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
			toCsv(filtered),
			"text/csv;charset=utf-8;",
		);
	};

	const exportPdf = () => {
		const text = filtered
			.map(
				(r) =>
					`${r.createdAt} | ${r.severity} | ${r.action} | ${r.actorName ?? r.actorEmail ?? "—"} | ${r.summary}`,
			)
			.join("\n");
		downloadText(
			`audit-log-${new Date().toISOString().slice(0, 10)}.txt`,
			`Audit Log Export\nGenerated: ${new Date().toISOString()}\n\n${text}`,
			"application/pdf",
		);
		window.print();
	};

	return (
		<AdminShell
			title="User audit log"
			subtitle="Immutable actions by account — login, role changes, AI use, and admin updates"
			breadcrumb="Admin · User activity"
			actions={
				<div className="admin-row-actions">
					<button type="button" className="ghost-btn" onClick={() => setTimelineView((v) => !v)}>
						{timelineView ? "Table view" : "Timeline view"}
					</button>
					<button type="button" className="ghost-btn" onClick={exportCsv}>
						Export CSV
					</button>
					<button type="button" className="ghost-btn" onClick={exportPdf}>
						Export PDF
					</button>
					<button type="button" className="ghost-btn" onClick={() => void load()}>
						Refresh
					</button>
				</div>
			}
		>
			{loading && <p className="muted">Loading audit log…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Total events" value={stats.total} accent="primary" />
					<AdminStatCard label="Last 24h" value={stats.last24h} />
					<AdminStatCard
						label="Flagged"
						value={stats.flagged}
						accent={stats.flagged > 0 ? "danger" : "success"}
					/>
					<AdminStatCard label="High severity" value={stats.high} accent="warning" />
					<AdminStatCard label="Critical" value={stats.critical} accent="danger" />
					<AdminStatCard label="Visible rows" value={filtered.length} />
				</section>
			)}

			<AdminPanel title="Logged activity" description="Jump to common action types">
				<div className="admin-filter-row">
					{ACTIVITY_CHIPS.map((chip) => (
						<button
							key={chip.label}
							type="button"
							className={`ghost-btn${activityChip === chip.label ? " admin-filter-active" : ""}`}
							onClick={() =>
								setActivityChip((cur) => (cur === chip.label ? null : chip.label))
							}
						>
							{chip.label}
						</button>
					))}
				</div>
			</AdminPanel>

			<AdminPanel title="Filters">
				<div className="admin-filters admin-form-grid">
					<label>
						Search
						<input
							className="topic-input"
							placeholder="Summary, actor, action…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") void load();
							}}
						/>
					</label>
					<label>
						Category
						<select
							className="topic-input"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
						>
							<option value="">All</option>
							{[
								"auth",
								"admin",
								"ai_use",
								"policy",
								"approval",
								"data",
								"security",
								"system",
								"report",
							].map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
						</select>
					</label>
					<label>
						Severity
						<select
							className="topic-input"
							value={severity}
							onChange={(e) => setSeverity(e.target.value)}
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
							value={faculty}
							onChange={(e) => setFaculty(e.target.value)}
						>
							<option value="">All</option>
							{faculties.map((f) => (
								<option key={f} value={f}>
									{f}
								</option>
							))}
						</select>
					</label>
					<label>
						From
						<input
							type="date"
							className="topic-input"
							value={dateFrom}
							onChange={(e) => setDateFrom(e.target.value)}
						/>
					</label>
					<label>
						To
						<input
							type="date"
							className="topic-input"
							value={dateTo}
							onChange={(e) => setDateTo(e.target.value)}
						/>
					</label>
				</div>
				<button type="button" className="primary-btn" onClick={() => void load()}>
					Apply
				</button>
			</AdminPanel>

			<AdminPanel
				title={timelineView ? "Audit timeline" : "Audit trail"}
				description="Append-only records. Flags raise follow-up alerts without mutating history."
			>
				{timelineView ? (
					<ol className="admin-timeline">
						{filtered.length === 0 ? (
							<li className="muted">No audit events match filters.</li>
						) : (
							filtered.map((log) => (
								<li key={log.id}>
									<p>
										<strong>{formatAdminDate(log.createdAt)}</strong>{" "}
										<span className={`admin-sev admin-sev-${log.severity}`}>{log.severity}</span>{" "}
										<span className={`admin-chip admin-chip-status-${log.status}`}>{log.status}</span>
									</p>
									<p>
										{log.action} — {log.summary}
									</p>
									<p className="muted">
										{log.actorName ?? log.actorEmail ?? "system"} · {log.faculty ?? "—"} · {log.ip}
									</p>
									<div className="admin-row-actions">
										<button type="button" className="ghost-btn" onClick={() => setSelected(log)}>
											View details
										</button>
										{!log.flagged && (
											<button
												type="button"
												className="ghost-btn"
												disabled={working}
												onClick={() => void onFlag(log.id)}
											>
												Flag
											</button>
										)}
									</div>
								</li>
							))
						)}
					</ol>
				) : (
					<div className="admin-table-scroll">
						<table className="admin-simple-table">
							<thead>
								<tr>
									<th>Log ID</th>
									<th>Timestamp</th>
									<th>User</th>
									<th>User Role</th>
									<th>Faculty</th>
									<th>Department</th>
									<th>IP Address</th>
									<th>Device</th>
									<th>Browser</th>
									<th>Session ID</th>
									<th>Action Type</th>
									<th>Resource</th>
									<th>Before Value</th>
									<th>After Value</th>
									<th>Risk Level</th>
									<th>Status</th>
									<th />
								</tr>
							</thead>
							<tbody>
								{filtered.length === 0 ? (
									<tr>
										<td colSpan={17} className="muted">
											No audit events yet. Admin and governance actions will appear here.
										</td>
									</tr>
								) : (
									filtered.map((log) => (
										<tr key={log.id} className={log.flagged ? "admin-row-flagged" : undefined}>
											<td>
												<code className="admin-hash" title={log.id}>
													{log.id.slice(0, 8)}…
												</code>
											</td>
											<td>{formatAdminDate(log.createdAt)}</td>
											<td>{log.actorName ?? log.actorEmail ?? "—"}</td>
											<td>{log.actorRole ?? "—"}</td>
											<td>{log.faculty ?? "—"}</td>
											<td>{log.department ?? "—"}</td>
											<td>{log.ip}</td>
											<td>{log.device}</td>
											<td>{log.browser}</td>
											<td>
												<code className="admin-hash">{String(log.sessionId).slice(0, 10)}</code>
											</td>
											<td>{log.action}</td>
											<td>{log.resource}</td>
											<td className="muted">{log.beforeValue}</td>
											<td className="muted">{log.afterValue}</td>
											<td>
												<span className={`admin-sev admin-sev-${log.severity}`}>{log.severity}</span>
											</td>
											<td>
												<span className={`admin-chip`}>{log.status}</span>
											</td>
											<td className="admin-row-actions">
												<button type="button" className="ghost-btn" onClick={() => setSelected(log)}>
													Details
												</button>
												{!log.flagged && (
													<button
														type="button"
														className="ghost-btn"
														disabled={working}
														onClick={() => void onFlag(log.id)}
													>
														Flag
													</button>
												)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				)}
			</AdminPanel>

			{selected && (
				<div
					className="admin-sidebar-backdrop"
					role="presentation"
					onClick={() => setSelected(null)}
				>
					<div
						className="admin-panel"
						role="dialog"
						aria-modal="true"
						aria-label="Audit log details"
						style={{
							position: "fixed",
							inset: "10% 15%",
							zIndex: 40,
							overflow: "auto",
							maxHeight: "80vh",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="admin-panel-head">
							<div>
								<h2 className="admin-panel-title">Audit event details</h2>
								<p className="admin-panel-desc">{selected.id}</p>
							</div>
							<button type="button" className="ghost-btn" onClick={() => setSelected(null)}>
								Close
							</button>
						</div>
						<div className="admin-form-grid">
							<p>
								<strong>Timestamp</strong>
								<br />
								{formatAdminDate(selected.createdAt)}
							</p>
							<p>
								<strong>Action</strong>
								<br />
								{selected.action}
							</p>
							<p>
								<strong>User</strong>
								<br />
								{selected.actorName ?? selected.actorEmail ?? "—"} ({selected.actorRole ?? "—"})
							</p>
							<p>
								<strong>Faculty / Dept</strong>
								<br />
								{selected.faculty ?? "—"} / {selected.department ?? "—"}
							</p>
							<p>
								<strong>IP / Device / Browser</strong>
								<br />
								{selected.ip} · {selected.device} · {selected.browser}
							</p>
							<p>
								<strong>Session</strong>
								<br />
								{selected.sessionId}
							</p>
							<p>
								<strong>Resource</strong>
								<br />
								{selected.resource}
							</p>
							<p>
								<strong>Risk / Status</strong>
								<br />
								{selected.severity} / {selected.status}
							</p>
							<p className="admin-form-span">
								<strong>Summary</strong>
								<br />
								{selected.summary}
							</p>
							<p>
								<strong>Before</strong>
								<br />
								{selected.beforeValue}
							</p>
							<p>
								<strong>After</strong>
								<br />
								{selected.afterValue}
							</p>
							<p className="admin-form-span">
								<strong>Immutable hash</strong>
								<br />
								<code>{selected.immutableHash ?? "—"}</code>
							</p>
							<p className="admin-form-span">
								<strong>Details</strong>
								<br />
								<pre className="muted" style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
									{JSON.stringify(selected.details ?? {}, null, 2)}
								</pre>
							</p>
						</div>
					</div>
				</div>
			)}
		</AdminShell>
	);
}
