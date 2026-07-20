"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { fetchAdminAuditLogs, flagAdminAuditLog } from "@/lib/admin-api";
import type { AuditAlertStats, AuditLogRecord } from "@/lib/admin-governance";

export function AdminAuditDashboard() {
	const { ready } = useAdminGuard();
	const [logs, setLogs] = useState<AuditLogRecord[]>([]);
	const [stats, setStats] = useState<AuditAlertStats | null>(null);
	const [flaggedOnly, setFlaggedOnly] = useState(false);
	const [category, setCategory] = useState("");
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminAuditLogs({
				limit: 150,
				flagged: flaggedOnly,
				category: category || undefined,
				q: search.trim() || undefined,
			});
			setLogs(data.logs);
			setStats(data.stats);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, [category, flaggedOnly, search]);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

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

	return (
		<AdminShell
			title="Audit & alerts"
			subtitle="Immutable activity log with flags for risky AI and admin behaviour"
			breadcrumb="Admin · Governance"
			actions={
				<button type="button" className="ghost-btn" onClick={() => void load()}>
					Refresh
				</button>
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
				</section>
			)}

			<AdminPanel
				title="Audit trail"
				description="Append-only records. Flags raise follow-up alert events without mutating history."
				actions={
					<div className="admin-filter-row">
						<input
							className="topic-input"
							placeholder="Search summary, actor…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") void load();
							}}
						/>
						<select
							className="topic-input"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
						>
							<option value="">All categories</option>
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
						<button
							type="button"
							className={`ghost-btn${flaggedOnly ? " admin-filter-active" : ""}`}
							onClick={() => setFlaggedOnly((v) => !v)}
						>
							Flagged only
						</button>
						<button type="button" className="primary-btn" onClick={() => void load()}>
							Apply
						</button>
					</div>
				}
			>
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>When</th>
								<th>Severity</th>
								<th>Category</th>
								<th>Summary</th>
								<th>Actor</th>
								<th>Faculty</th>
								<th>Hash</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{logs.length === 0 ? (
								<tr>
									<td colSpan={8} className="muted">
										No audit events yet. Admin and governance actions will appear here.
									</td>
								</tr>
							) : (
								logs.map((log) => (
									<tr key={log.id} className={log.flagged ? "admin-row-flagged" : undefined}>
										<td>{formatAdminDate(log.createdAt)}</td>
										<td>
											<span className={`admin-sev admin-sev-${log.severity}`}>{log.severity}</span>
										</td>
										<td>{log.category}</td>
										<td>
											<div>
												<p>{log.summary}</p>
												{log.flagReason ? (
													<p className="muted">Flag: {log.flagReason}</p>
												) : null}
											</div>
										</td>
										<td>
											{log.actorName ?? log.actorEmail ?? "—"}
											{log.actorRole ? <p className="muted">{log.actorRole}</p> : null}
										</td>
										<td>{log.faculty ?? "—"}</td>
										<td>
											<code className="admin-hash" title={log.immutableHash ?? undefined}>
												{log.immutableHash ? `${log.immutableHash.slice(0, 10)}…` : "—"}
											</code>
										</td>
										<td>
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
			</AdminPanel>
		</AdminShell>
	);
}
