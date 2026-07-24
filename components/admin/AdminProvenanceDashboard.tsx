"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useAdminUserQuery, matchesAdminUserQuery } from "@/hooks/useAdminUserQuery";
import {
	createAdminProvenance,
	fetchAdminProvenance,
	updateAdminProvenance,
} from "@/lib/admin-api";
import type { ProvenanceStats, ResearchProvenanceRecord } from "@/lib/admin-governance";

const OUTPUT_TYPES = ["paper", "outline", "draft", "idea", "note", "dataset", "other"] as const;
const STATUSES = ["available", "under_review", "cleared", "escalated"] as const;

const emptyForm = {
	outputRef: "",
	outputTitle: "",
	outputType: "draft",
	ownerName: "",
	ownerEmail: "",
	faculty: "",
	department: "",
	eventAction: "ai_generate",
	eventTool: "GARIL AI",
	eventModel: "",
	eventVersion: "",
	eventSummary: "",
	promptHistory: "",
	aiOutputs: "",
	revisionNote: "",
};

function latestModel(row: ResearchProvenanceRecord) {
	const withModel = [...row.events].reverse().find((e) => e.model);
	return withModel?.model || "—";
}

function exportProvenance(row: ResearchProvenanceRecord) {
	const body = [
		"Research Provenance Record",
		"==========================",
		`Record ID: ${row.id}`,
		`Research Project: ${row.outputTitle}`,
		`Reference: ${row.outputRef}`,
		`Author: ${row.ownerName || "—"}`,
		`Email: ${row.ownerEmail || "—"}`,
		`Faculty: ${row.faculty || "—"}`,
		`Department: ${row.department || "—"}`,
		`Verification Status: ${row.status}`,
		`Privacy Redacted: ${row.privacyRedacted ? "Yes" : "No"}`,
		`Timestamp: ${row.createdAt}`,
		`Reviewed At: ${row.reviewedAt ?? "—"}`,
		`Reviewed By: ${row.reviewedByName || "—"}`,
		`Review Notes: ${row.reviewNotes || "—"}`,
		"",
		"Event Timeline",
		"--------------",
		...row.events.map(
			(e, i) =>
				`${i + 1}. [${e.at}] ${e.action} · ${e.agentOrTool || "—"} · model ${e.model || "—"} · ${e.summary || ""}${e.humanEdited ? " (human edited)" : ""}`,
		),
	].join("\n");
	const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `provenance-${row.id.slice(0, 8)}.txt`;
	link.click();
	URL.revokeObjectURL(url);
}

export function AdminProvenanceDashboard() {
	const { ready } = useAdminGuard();
	const [records, setRecords] = useState<ResearchProvenanceRecord[]>([]);
	const [stats, setStats] = useState<ProvenanceStats | null>(null);
	const [statusFilter, setStatusFilter] = useState("");
	const [userFilter, setUserFilter] = useAdminUserQuery();
	const [form, setForm] = useState(emptyForm);
	const [selected, setSelected] = useState<ResearchProvenanceRecord | null>(null);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminProvenance({ status: statusFilter || undefined });
			setRecords(data.records);
			setStats(data.stats);
			setSelected((prev) =>
				prev ? (data.records.find((r) => r.id === prev.id) ?? null) : null,
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, [statusFilter]);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const filteredRecords = useMemo(
		() =>
			records.filter((row) =>
				matchesAdminUserQuery(userFilter, [
					row.ownerName,
					row.ownerEmail,
					row.outputTitle,
					row.faculty,
					row.department,
				]),
			),
		[records, userFilter],
	);

	const onCreate = async () => {
		if (!form.outputRef.trim() || !form.outputTitle.trim()) {
			setError("Research project title and reference are required.");
			return;
		}
		setWorking(true);
		setError(null);
		try {
			const modelLabel = [form.eventModel, form.eventVersion].filter(Boolean).join(" ");
			const events = [
				{
					action: form.eventAction,
					agentOrTool: form.eventTool,
					model: modelLabel,
					summary: form.eventSummary || "Initial AI-assisted generation",
					humanEdited: false,
				},
			];
			if (form.promptHistory.trim()) {
				events.push({
					action: "prompt_history",
					agentOrTool: form.eventTool,
					model: modelLabel,
					summary: form.promptHistory.trim(),
					humanEdited: false,
				});
			}
			if (form.aiOutputs.trim()) {
				events.push({
					action: "ai_outputs",
					agentOrTool: form.eventTool,
					model: modelLabel,
					summary: form.aiOutputs.trim(),
					humanEdited: false,
				});
			}
			if (form.revisionNote.trim()) {
				events.push({
					action: "revision",
					agentOrTool: "human",
					model: modelLabel,
					summary: form.revisionNote.trim(),
					humanEdited: true,
				});
			}
			await createAdminProvenance({
				outputRef: form.outputRef,
				outputTitle: form.outputTitle,
				outputType: form.outputType,
				ownerName: form.ownerName,
				ownerEmail: form.ownerEmail,
				faculty: form.faculty,
				department: form.department,
				events,
			});
			setForm(emptyForm);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const review = async (id: string, status: string) => {
		const notes = window.prompt("Review / verification notes") ?? "";
		setWorking(true);
		try {
			const updated = await updateAdminProvenance(id, { status, reviewNotes: notes });
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
			title="User provenance"
			subtitle="Prompt and process history owned by user accounts for integrity review"
			breadcrumb="Admin · User data"
			actions={
				<button type="button" className="ghost-btn" onClick={() => void load()}>
					Refresh
				</button>
			}
		>
			{loading && <p className="muted">Loading provenance records…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Records" value={stats.total} accent="primary" />
					<AdminStatCard label="Under review" value={stats.underReview} accent="warning" />
					<AdminStatCard label="Cleared / verified" value={stats.cleared} accent="success" />
					<AdminStatCard
						label="Escalated"
						value={stats.escalated}
						accent={stats.escalated > 0 ? "danger" : undefined}
					/>
					<AdminStatCard label="Available" value={stats.available} accent="primary" />
				</section>
			)}

			<div className="admin-gov-grid">
				<AdminPanel title="Register provenance" description="Process metadata — prompts and outputs summarised, not raw research">
					<div className="admin-form-grid">
						<label>
							Research project
							<input
								className="topic-input"
								value={form.outputTitle}
								onChange={(e) => setForm((f) => ({ ...f, outputTitle: e.target.value }))}
							/>
						</label>
						<label>
							Project reference
							<input
								className="topic-input"
								value={form.outputRef}
								onChange={(e) => setForm((f) => ({ ...f, outputRef: e.target.value }))}
							/>
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
							AI model
							<input
								className="topic-input"
								value={form.eventModel}
								onChange={(e) => setForm((f) => ({ ...f, eventModel: e.target.value }))}
							/>
						</label>
						<label>
							AI version
							<input
								className="topic-input"
								placeholder="e.g. 2024-06"
								value={form.eventVersion}
								onChange={(e) => setForm((f) => ({ ...f, eventVersion: e.target.value }))}
							/>
						</label>
						<label>
							Tool / agent
							<input
								className="topic-input"
								value={form.eventTool}
								onChange={(e) => setForm((f) => ({ ...f, eventTool: e.target.value }))}
							/>
						</label>
						<label className="admin-form-span">
							Prompt history (summary)
							<input
								className="topic-input"
								value={form.promptHistory}
								onChange={(e) => setForm((f) => ({ ...f, promptHistory: e.target.value }))}
							/>
						</label>
						<label className="admin-form-span">
							AI outputs (summary)
							<input
								className="topic-input"
								value={form.aiOutputs}
								onChange={(e) => setForm((f) => ({ ...f, aiOutputs: e.target.value }))}
							/>
						</label>
						<label className="admin-form-span">
							Revision history note
							<input
								className="topic-input"
								value={form.revisionNote}
								onChange={(e) => setForm((f) => ({ ...f, revisionNote: e.target.value }))}
							/>
						</label>
					</div>
					<button type="button" className="primary-btn" disabled={working} onClick={() => void onCreate()}>
						Save provenance
					</button>
				</AdminPanel>

				<AdminPanel title="Filter" description="Integrity review queue scoped to user owners">
					<div className="admin-filter-row admin-filter-wrap">
						{(["", ...STATUSES] as const).map((id) => (
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
					<label className="field-label" htmlFor="provenance-user-filter">
						Owner user
					</label>
					<input
						id="provenance-user-filter"
						className="topic-input"
						value={userFilter}
						onChange={(e) => setUserFilter(e.target.value)}
						placeholder="Filter by owner name or email…"
					/>
				</AdminPanel>
			</div>

			<div className="admin-gov-grid">
				<AdminPanel
					title="Provenance register"
					description={`${filteredRecords.length.toLocaleString()} of ${records.length.toLocaleString()} records · owned by users`}
				>
					<div className="admin-table-scroll">
						<table className="admin-simple-table">
							<thead>
								<tr>
									<th>Timestamp</th>
									<th>Research project</th>
									<th>Author</th>
									<th>AI model</th>
									<th>Events</th>
									<th>Verification</th>
									<th />
								</tr>
							</thead>
							<tbody>
								{filteredRecords.length === 0 ? (
									<tr>
										<td colSpan={7} className="muted">
											{records.length === 0
												? "No provenance records yet."
												: "No records match this user filter."}
										</td>
									</tr>
								) : (
									filteredRecords.map((row) => (
										<tr
											key={row.id}
											className={selected?.id === row.id ? "admin-row-selected" : undefined}
										>
											<td>{formatAdminDate(row.createdAt)}</td>
											<td>
												<strong>{row.outputTitle}</strong>
												<p className="muted">{row.outputType}</p>
											</td>
											<td>
												{row.ownerName || "—"}
												{row.faculty ? <p className="muted">{row.faculty}</p> : null}
											</td>
											<td>{latestModel(row)}</td>
											<td>{row.events.length}</td>
											<td>
												<span
													className={`admin-chip admin-chip-${
														row.status === "cleared"
															? "permitted"
															: row.status === "escalated"
																? "blocked"
																: "restricted"
													}`}
												>
													{row.status}
												</span>
											</td>
											<td className="admin-row-actions">
												<button
													type="button"
													className="ghost-btn"
													onClick={() => setSelected(row)}
												>
													View timeline
												</button>
												<button
													type="button"
													className="ghost-btn"
													disabled={working}
													onClick={() => void review(row.id, "cleared")}
												>
													Verify
												</button>
												<button
													type="button"
													className="ghost-btn"
													onClick={() => exportProvenance(row)}
												>
													Export
												</button>
												<Link className="ghost-btn" href="/admin/audit">
													Audit trail
												</Link>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</AdminPanel>

				<AdminPanel
					title={selected ? selected.outputTitle : "Provenance timeline"}
					description={
						selected
							? "Prompt history, AI outputs, and revision events"
							: "Select a record to inspect the timeline"
					}
				>
					{!selected && <p className="muted">No record selected.</p>}
					{selected && (
						<>
							<p className="muted">
								Ref {selected.outputRef}
								{selected.privacyRedacted ? " · content redacted" : ""} ·{" "}
								{selected.ownerName || "—"} · model {latestModel(selected)}
							</p>
							<ul className="admin-timeline">
								{selected.events.map((event, idx) => (
									<li key={`${event.at}-${idx}`}>
										<span className="admin-sev admin-sev-info">{idx + 1}</span>
										<div>
											<p>
												{event.action.replace(/_/g, " ")}
												{event.agentOrTool ? ` · ${event.agentOrTool}` : ""}
												{event.model ? ` (${event.model})` : ""}
											</p>
											<p className="muted">
												{formatAdminDate(event.at)}
												{event.summary ? ` — ${event.summary}` : ""}
												{event.humanEdited ? " · human edited" : ""}
											</p>
										</div>
									</li>
								))}
							</ul>
							{selected.reviewNotes ? (
								<p className="muted">Review notes: {selected.reviewNotes}</p>
							) : null}
							<div className="admin-row-actions">
								<button
									type="button"
									className="ghost-btn"
									disabled={working}
									onClick={() => void review(selected.id, "under_review")}
								>
									Mark under review
								</button>
								<button
									type="button"
									className="ghost-btn"
									disabled={working}
									onClick={() => void review(selected.id, "cleared")}
								>
									Verify / clear
								</button>
								<button
									type="button"
									className="ghost-btn"
									disabled={working}
									onClick={() => void review(selected.id, "escalated")}
								>
									Escalate
								</button>
								<button
									type="button"
									className="ghost-btn"
									onClick={() => exportProvenance(selected)}
								>
									Export provenance
								</button>
								<Link className="ghost-btn" href="/admin/audit">
									Audit trail
								</Link>
							</div>
						</>
					)}
				</AdminPanel>
			</div>
		</AdminShell>
	);
}
