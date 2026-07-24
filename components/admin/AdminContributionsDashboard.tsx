"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useAdminUserQuery, matchesAdminUserQuery } from "@/hooks/useAdminUserQuery";
import {
	createAdminContribution,
	fetchAdminContributions,
	updateAdminContribution,
} from "@/lib/admin-api";
import type { AiContributionStatementRecord, ContributionStats } from "@/lib/admin-governance";

const OUTPUT_TYPES = ["paper", "outline", "draft", "idea", "note", "dataset", "other"] as const;

const emptyForm = {
	outputRef: "",
	outputTitle: "",
	outputType: "draft",
	ownerName: "",
	ownerEmail: "",
	faculty: "",
	department: "",
	programme: "",
	contributionSummary: "",
	toolsUsed: "drafting, citation support",
	modelNames: "",
	humanEdited: true,
	disclosureComplete: false,
	aiAssisted: true,
};

function statusLabel(row: AiContributionStatementRecord) {
	if (row.verified) return "Verified";
	if (!row.disclosureComplete) return "Incomplete";
	return "Pending verification";
}

function downloadStatementPdf(row: AiContributionStatementRecord) {
	const body = [
		"AI Contribution Statement",
		"========================",
		`Statement ID: ${row.id}`,
		`Research Title: ${row.outputTitle}`,
		`Output Reference: ${row.outputRef}`,
		`Output Type: ${row.outputType}`,
		`Author: ${row.ownerName || "—"}`,
		`Email: ${row.ownerEmail || "—"}`,
		`Faculty: ${row.faculty || "—"}`,
		`Department: ${row.department || "—"}`,
		`Programme: ${row.programme || "—"}`,
		`AI Models Used: ${row.modelNames.join(", ") || "—"}`,
		`AI Tasks Performed: ${row.toolsUsed.join(", ") || "—"}`,
		`Contribution Summary: ${row.contributionSummary || "—"}`,
		`AI Assisted: ${row.aiAssisted ? "Yes" : "No"}`,
		`Human Edited: ${row.humanEdited ? "Yes" : "No"}`,
		`Disclosure Complete: ${row.disclosureComplete ? "Yes" : "No"}`,
		`Status: ${statusLabel(row)}`,
		`Date Generated: ${row.generatedAt}`,
		`Verified At: ${row.verifiedAt ?? "—"}`,
		`Verified By: ${row.verifiedByName || "—"}`,
		`Verification Notes: ${row.verificationNotes || "—"}`,
	].join("\n");
	const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `ai-contribution-${row.id.slice(0, 8)}.txt`;
	link.click();
	URL.revokeObjectURL(url);
}

function exportStatements(rows: AiContributionStatementRecord[]) {
	const headers = [
		"Statement ID",
		"Research Title",
		"Author",
		"Faculty",
		"Department",
		"AI Models Used",
		"AI Tasks Performed",
		"Date Generated",
		"Status",
	];
	const lines = rows.map((row) =>
		[
			row.id,
			row.outputTitle,
			row.ownerName,
			row.faculty ?? "",
			row.department ?? "",
			row.modelNames.join("; "),
			row.toolsUsed.join("; "),
			row.generatedAt,
			statusLabel(row),
		]
			.map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
			.join(","),
	);
	const csv = [headers.join(","), ...lines].join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `ai-contributions-${new Date().toISOString().slice(0, 10)}.csv`;
	link.click();
	URL.revokeObjectURL(url);
}

export function AdminContributionsDashboard() {
	const { ready } = useAdminGuard();
	const [statements, setStatements] = useState<AiContributionStatementRecord[]>([]);
	const [stats, setStats] = useState<ContributionStats | null>(null);
	const [pendingOnly, setPendingOnly] = useState(false);
	const [userFilter, setUserFilter] = useAdminUserQuery();
	const [selected, setSelected] = useState<AiContributionStatementRecord | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminContributions({
				verified: pendingOnly ? false : undefined,
			});
			setStatements(data.statements);
			setStats(data.stats);
			setSelected((prev) =>
				prev ? (data.statements.find((s) => s.id === prev.id) ?? null) : null,
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, [pendingOnly]);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const filteredStatements = useMemo(
		() =>
			statements.filter((row) =>
				matchesAdminUserQuery(userFilter, [
					row.ownerName,
					row.ownerEmail,
					row.outputTitle,
					row.faculty,
					row.department,
				]),
			),
		[statements, userFilter],
	);

	const onCreate = async () => {
		if (!form.outputRef.trim() || !form.outputTitle.trim()) {
			setError("Research title and output reference are required.");
			return;
		}
		setWorking(true);
		setError(null);
		try {
			await createAdminContribution({
				...form,
				toolsUsed: form.toolsUsed
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean),
				modelNames: form.modelNames
					.split(",")
					.map((m) => m.trim())
					.filter(Boolean),
			});
			setForm(emptyForm);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const verify = async (id: string, verified: boolean) => {
		const notes = verified ? (window.prompt("Verification notes (optional)") ?? "") : "";
		setWorking(true);
		try {
			const updated = await updateAdminContribution(id, {
				verified,
				disclosureComplete: verified ? true : undefined,
				verificationNotes: notes || undefined,
			});
			setSelected(updated);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	return (
		<AdminShell
			title="User AI disclosures"
			subtitle="AI contribution statements owned by user accounts — verify and export disclosure metadata"
			breadcrumb="Admin · User data"
			actions={
				<>
					<button
						type="button"
						className="ghost-btn"
						disabled={!statements.length}
						onClick={() => exportStatements(statements)}
					>
						Export
					</button>
					<button type="button" className="ghost-btn" onClick={() => void load()}>
						Refresh
					</button>
				</>
			}
		>
			{loading && <p className="muted">Loading contribution statements…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Total statements" value={stats.total} accent="primary" />
					<AdminStatCard label="Verified" value={stats.verified} accent="success" />
					<AdminStatCard
						label="Pending verification"
						value={stats.pendingVerification}
						accent={stats.pendingVerification > 0 ? "warning" : "success"}
					/>
					<AdminStatCard
						label="Incomplete disclosure"
						value={stats.incomplete}
						accent={stats.incomplete > 0 ? "danger" : undefined}
					/>
					<AdminStatCard label="AI assisted" value={stats.aiAssisted} accent="primary" />
				</section>
			)}

			<div className="admin-gov-grid">
				<AdminPanel title="Record statement" description="Capture disclosure metadata for a research output">
					<div className="admin-form-grid">
						<label>
							Research title
							<input
								className="topic-input"
								value={form.outputTitle}
								onChange={(e) => setForm((f) => ({ ...f, outputTitle: e.target.value }))}
							/>
						</label>
						<label>
							Output reference / Statement key
							<input
								className="topic-input"
								placeholder="project or draft id"
								value={form.outputRef}
								onChange={(e) => setForm((f) => ({ ...f, outputRef: e.target.value }))}
							/>
						</label>
						<label>
							Output type
							<select
								className="topic-input"
								value={form.outputType}
								onChange={(e) => setForm((f) => ({ ...f, outputType: e.target.value }))}
							>
								{OUTPUT_TYPES.map((t) => (
									<option key={t} value={t}>
										{t}
									</option>
								))}
							</select>
						</label>
						<label>
							Author
							<input
								className="topic-input"
								value={form.ownerName}
								onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
							/>
						</label>
						<label>
							Author email
							<input
								className="topic-input"
								value={form.ownerEmail}
								onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
							/>
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
							Programme
							<input
								className="topic-input"
								value={form.programme}
								onChange={(e) => setForm((f) => ({ ...f, programme: e.target.value }))}
							/>
						</label>
						<label>
							AI models used
							<input
								className="topic-input"
								placeholder="comma-separated"
								value={form.modelNames}
								onChange={(e) => setForm((f) => ({ ...f, modelNames: e.target.value }))}
							/>
						</label>
						<label>
							AI tasks performed
							<input
								className="topic-input"
								placeholder="drafting, summarising, citation…"
								value={form.toolsUsed}
								onChange={(e) => setForm((f) => ({ ...f, toolsUsed: e.target.value }))}
							/>
						</label>
						<label className="admin-form-span">
							Contribution summary (no research content)
							<input
								className="topic-input"
								value={form.contributionSummary}
								onChange={(e) =>
									setForm((f) => ({ ...f, contributionSummary: e.target.value }))
								}
							/>
						</label>
					</div>
					<label className="admin-check">
						<input
							type="checkbox"
							checked={form.aiAssisted}
							onChange={(e) => setForm((f) => ({ ...f, aiAssisted: e.target.checked }))}
						/>
						AI assisted
					</label>
					<label className="admin-check">
						<input
							type="checkbox"
							checked={form.humanEdited}
							onChange={(e) => setForm((f) => ({ ...f, humanEdited: e.target.checked }))}
						/>
						Human-edited after generation
					</label>
					<label className="admin-check">
						<input
							type="checkbox"
							checked={form.disclosureComplete}
							onChange={(e) =>
								setForm((f) => ({ ...f, disclosureComplete: e.target.checked }))
							}
						/>
						Disclosure marked complete
					</label>
					<button type="button" className="primary-btn" disabled={working} onClick={() => void onCreate()}>
						Save statement
					</button>
				</AdminPanel>

				<AdminPanel title="Verification queue" description="Filter by user account and verification status">
					<label className="admin-check">
						<input
							type="checkbox"
							checked={pendingOnly}
							onChange={(e) => setPendingOnly(e.target.checked)}
						/>
						Show unverified only
					</label>
					<label className="field-label" htmlFor="contribution-user-filter">
						Owner user
					</label>
					<input
						id="contribution-user-filter"
						className="topic-input"
						value={userFilter}
						onChange={(e) => setUserFilter(e.target.value)}
						placeholder="Filter by owner name or email…"
					/>
					{selected ? (
						<div className="admin-detail-block">
							<p>
								<strong>Statement ID</strong>
							</p>
							<p className="muted">
								<code>{selected.id}</code>
							</p>
							<p>
								<strong>{selected.outputTitle}</strong>
							</p>
							<p className="muted">
								{selected.ownerName || "—"} · {selected.faculty || "No faculty"} ·{" "}
								{selected.department || "No department"}
							</p>
							<p className="muted">
								Models: {selected.modelNames.join(", ") || "—"}
								<br />
								Tasks: {selected.toolsUsed.join(", ") || "—"}
								<br />
								Generated: {formatAdminDate(selected.generatedAt)} · {statusLabel(selected)}
							</p>
							<div className="admin-row-actions">
								<button
									type="button"
									className="ghost-btn"
									onClick={() => downloadStatementPdf(selected)}
								>
									Download PDF
								</button>
								{!selected.verified ? (
									<button
										type="button"
										className="ghost-btn"
										disabled={working}
										onClick={() => void verify(selected.id, true)}
									>
										Verify
									</button>
								) : (
									<button
										type="button"
										className="ghost-btn"
										disabled={working}
										onClick={() => void verify(selected.id, false)}
									>
										Unverify
									</button>
								)}
								<Link className="ghost-btn" href="/admin/audit">
									Audit history
								</Link>
							</div>
						</div>
					) : (
						<p className="muted">Select a statement to view details.</p>
					)}
				</AdminPanel>
			</div>

			<AdminPanel
				title="Contribution records"
				description={`${filteredStatements.length.toLocaleString()} of ${statements.length.toLocaleString()} statements · owned by users`}
			>
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>Statement ID</th>
								<th>Research title</th>
								<th>Author</th>
								<th>Faculty / Dept</th>
								<th>AI models</th>
								<th>AI tasks</th>
								<th>Generated</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{filteredStatements.length === 0 ? (
								<tr>
									<td colSpan={9} className="muted">
										{statements.length === 0
											? "No contribution statements yet."
											: "No statements match this user filter."}
									</td>
								</tr>
							) : (
								filteredStatements.map((row) => (
									<tr
										key={row.id}
										className={selected?.id === row.id ? "admin-row-selected" : undefined}
									>
										<td>
											<code title={row.id}>{row.id.slice(0, 8)}…</code>
										</td>
										<td>
											<strong>{row.outputTitle}</strong>
											<p className="muted">{row.outputType}</p>
										</td>
										<td>{row.ownerName || "—"}</td>
										<td>
											{row.faculty || "—"}
											{row.department ? <p className="muted">{row.department}</p> : null}
										</td>
										<td>{row.modelNames.join(", ") || "—"}</td>
										<td>{row.toolsUsed.join(", ") || "—"}</td>
										<td>{formatAdminDate(row.generatedAt)}</td>
										<td>
											<span
												className={`admin-chip admin-chip-${row.verified ? "permitted" : "restricted"}`}
											>
												{statusLabel(row)}
											</span>
										</td>
										<td className="admin-row-actions">
											<button
												type="button"
												className="ghost-btn"
												onClick={() => setSelected(row)}
											>
												View
											</button>
											{!row.verified && (
												<button
													type="button"
													className="ghost-btn"
													disabled={working}
													onClick={() => void verify(row.id, true)}
												>
													Verify
												</button>
											)}
											<button
												type="button"
												className="ghost-btn"
												onClick={() => downloadStatementPdf(row)}
											>
												Download PDF
											</button>
											<button
												type="button"
												className="ghost-btn"
												onClick={() => exportStatements([row])}
											>
												Export
											</button>
											<Link className="ghost-btn" href="/admin/audit">
												Audit history
											</Link>
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
