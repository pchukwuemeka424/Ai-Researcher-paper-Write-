"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
	createAdminCompliance,
	deleteAdminCompliance,
	fetchAdminCompliance,
	updateAdminCompliance,
} from "@/lib/admin-api";
import type { ComplianceControlRecord, ComplianceStats } from "@/lib/admin-governance";

const FRAMEWORKS = [
	{ id: "", label: "All frameworks" },
	{ id: "nigeria_ai_act", label: "Nigeria AI Act" },
	{ id: "ndpr", label: "NDPA / NDPR" },
	{ id: "eu_ai_act", label: "EU AI Act" },
	{ id: "institutional", label: "Institutional" },
	{ id: "iso_42001", label: "ISO 42001" },
	{ id: "unesco", label: "UNESCO" },
] as const;

const DOMAINS = [
	"accountability",
	"transparency",
	"human_oversight",
	"privacy",
	"data_governance",
	"security",
	"fairness",
	"accuracy_robustness",
] as const;

const STATUSES = ["not_started", "in_progress", "compliant", "gap", "not_applicable"] as const;

function frameworkLabel(id: string): string {
	const found = FRAMEWORKS.find((f) => f.id === id);
	return found?.label ?? id.replace(/_/g, " ");
}

const emptyForm = {
	code: "",
	title: "",
	description: "",
	framework: "nigeria_ai_act",
	domain: "accountability",
	priority: "medium",
	ownerName: "",
};

export function AdminComplianceDashboard() {
	const { ready } = useAdminGuard();
	const [controls, setControls] = useState<ComplianceControlRecord[]>([]);
	const [stats, setStats] = useState<ComplianceStats | null>(null);
	const [framework, setFramework] = useState("");
	const [form, setForm] = useState(emptyForm);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminCompliance({ framework: framework || undefined });
			setControls(data.controls);
			setStats(data.stats);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, [framework]);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const onCreate = async () => {
		if (!form.code.trim() || !form.title.trim()) {
			setError("Code and title are required.");
			return;
		}
		setWorking(true);
		setError(null);
		try {
			await createAdminCompliance(form);
			setForm(emptyForm);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const onStatus = async (id: string, status: string) => {
		setWorking(true);
		try {
			const evidence =
				status === "compliant" || status === "gap"
					? window.prompt("Evidence / notes for this assessment") ?? ""
					: undefined;
			await updateAdminCompliance(id, {
				status,
				...(evidence !== undefined ? { evidence } : {}),
			});
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const onDelete = async (id: string) => {
		if (!window.confirm("Delete this compliance control?")) return;
		setWorking(true);
		try {
			await deleteAdminCompliance(id);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	return (
		<AdminShell
			title="Compliance"
			subtitle="Real institutional controls only — add and assess Nigeria AI Act, NDPA, and related frameworks"
			breadcrumb="Admin · Governance"
		>
			{loading && <p className="muted">Loading compliance…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Controls" value={stats.total} accent="primary" />
					<AdminStatCard
						label="Compliance score"
						value={stats.total === 0 ? "—" : `${stats.score}%`}
						accent={stats.gap > 0 ? "warning" : "success"}
						hint={stats.total === 0 ? "No controls yet" : undefined}
					/>
					<AdminStatCard label="Compliant" value={stats.compliant} accent="success" />
					<AdminStatCard label="In progress" value={stats.inProgress} accent="warning" />
					<AdminStatCard label="Gaps" value={stats.gap} accent="danger" />
				</section>
			)}

			<div className="admin-gov-grid">
				<AdminPanel title="Add control" description="Register a real control from your institutional assessment">
					<div className="admin-form-grid">
						<label>
							Code
							<input
								className="topic-input"
								placeholder="e.g. NG-AI-01"
								value={form.code}
								onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
							/>
						</label>
						<label>
							Framework
							<select
								className="topic-input"
								value={form.framework}
								onChange={(e) => setForm((f) => ({ ...f, framework: e.target.value }))}
							>
								{FRAMEWORKS.filter((f) => f.id).map((f) => (
									<option key={f.id} value={f.id}>
										{f.label}
									</option>
								))}
							</select>
						</label>
						<label className="admin-form-span">
							Title
							<input
								className="topic-input"
								value={form.title}
								onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
							/>
						</label>
						<label>
							Domain
							<select
								className="topic-input"
								value={form.domain}
								onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
							>
								{DOMAINS.map((d) => (
									<option key={d} value={d}>
										{d.replace(/_/g, " ")}
									</option>
								))}
							</select>
						</label>
						<label>
							Priority
							<select
								className="topic-input"
								value={form.priority}
								onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
							>
								{["low", "medium", "high", "critical"].map((p) => (
									<option key={p} value={p}>
										{p}
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
							Owner
							<input
								className="topic-input"
								value={form.ownerName}
								onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
							/>
						</label>
					</div>
					<button type="button" className="primary-btn" disabled={working} onClick={() => void onCreate()}>
						Add control
					</button>
				</AdminPanel>

				<AdminPanel
					title="Framework coverage"
					description="Built from controls you have registered — empty until you add them"
				>
					{!stats || Object.keys(stats.byFramework).length === 0 ? (
						<p className="muted admin-panel-note">No compliance controls registered yet.</p>
					) : (
						<ul className="admin-feature-list">
							{Object.entries(stats.byFramework)
								.sort(([a], [b]) => {
									if (a === "nigeria_ai_act") return -1;
									if (b === "nigeria_ai_act") return 1;
									return a.localeCompare(b);
								})
								.map(([fw, row]) => (
									<li key={fw}>
										<span>{frameworkLabel(fw)}</span>
										<strong>
											{row.compliant}/{row.total} compliant
											{row.gap > 0 ? ` · ${row.gap} gap` : ""}
										</strong>
									</li>
								))}
						</ul>
					)}
				</AdminPanel>
			</div>

			<AdminPanel
				title="Controls"
				description="Assess and evidence each control"
				actions={
					<div className="admin-filter-row">
						{FRAMEWORKS.map((fw) => (
							<button
								key={fw.id || "all"}
								type="button"
								className={`ghost-btn${framework === fw.id ? " admin-filter-active" : ""}`}
								onClick={() => setFramework(fw.id)}
							>
								{fw.label}
							</button>
						))}
					</div>
				}
			>
				{controls.length === 0 ? (
					<p className="muted admin-panel-note">
						No controls found. Add Nigeria AI Act or other framework controls above — nothing is
						auto-seeded.
					</p>
				) : (
					<div className="admin-table-scroll">
						<table className="admin-simple-table">
							<thead>
								<tr>
									<th>Code</th>
									<th>Control</th>
									<th>Framework</th>
									<th>Domain</th>
									<th>Priority</th>
									<th>Status</th>
									<th>Assessed</th>
									<th />
								</tr>
							</thead>
							<tbody>
								{controls.map((control) => (
									<tr
										key={control.id}
										className={control.status === "gap" ? "admin-row-flagged" : undefined}
									>
										<td>
											<code>{control.code}</code>
										</td>
										<td>
											<strong>{control.title}</strong>
											{control.description ? <p className="muted">{control.description}</p> : null}
											{control.evidence ? <p className="muted">Evidence: {control.evidence}</p> : null}
										</td>
										<td>{frameworkLabel(control.framework)}</td>
										<td>{control.domain.replace(/_/g, " ")}</td>
										<td>
											<span
												className={`admin-chip admin-chip-${control.priority === "critical" || control.priority === "high" ? "danger" : "warning"}`}
											>
												{control.priority}
											</span>
										</td>
										<td>
											<span className={`admin-chip admin-chip-status-${control.status}`}>
												{control.status.replace(/_/g, " ")}
											</span>
										</td>
										<td>{formatAdminDate(control.lastAssessedAt)}</td>
										<td className="admin-row-actions">
											{STATUSES.filter((s) => s !== control.status).map((s) => (
												<button
													key={s}
													type="button"
													className="ghost-btn"
													disabled={working}
													onClick={() => void onStatus(control.id, s)}
												>
													{s.replace(/_/g, " ")}
												</button>
											))}
											<button
												type="button"
												className="ghost-btn"
												disabled={working}
												onClick={() => void onDelete(control.id)}
											>
												Delete
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</AdminPanel>
		</AdminShell>
	);
}
