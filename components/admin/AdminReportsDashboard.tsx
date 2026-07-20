"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminPanel, AdminShell, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
	exportGovernanceReportText,
	fetchAdminReport,
	fetchAdminReports,
	generateAdminReport,
} from "@/lib/admin-api";
import type { GovernanceReportAudience, GovernanceReportRecord } from "@/lib/admin-governance";

export function AdminReportsDashboard() {
	const { ready } = useAdminGuard();
	const [reports, setReports] = useState<GovernanceReportRecord[]>([]);
	const [selected, setSelected] = useState<GovernanceReportRecord | null>(null);
	const [audience, setAudience] = useState<GovernanceReportAudience>("both");
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			setReports(await fetchAdminReports());
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	const onGenerate = async () => {
		setWorking(true);
		setError(null);
		try {
			const report = await generateAdminReport({ audience });
			setSelected(report);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const onOpen = async (id: string) => {
		setWorking(true);
		try {
			setSelected(await fetchAdminReport(id));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	return (
		<AdminShell
			title="Governance reports"
			subtitle="Evidence packs formatted for Management and Senate oversight"
			breadcrumb="Admin · Governance"
		>
			{loading && <p className="muted">Loading reports…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			<div className="admin-gov-grid">
				<AdminPanel
					title="Generate report"
					description="Compile adoption, policy, audit, and approval evidence into a leadership pack"
				>
					<label>
						Audience
						<select
							className="topic-input"
							value={audience}
							onChange={(e) => setAudience(e.target.value as GovernanceReportAudience)}
						>
							<option value="management">Management</option>
							<option value="senate">Senate</option>
							<option value="both">Management & Senate</option>
						</select>
					</label>
					<div className="admin-panel-actions-inline">
						<button
							type="button"
							className="primary-btn"
							disabled={working}
							onClick={() => void onGenerate()}
						>
							{working ? "Generating…" : "Generate report"}
						</button>
					</div>
					<p className="muted admin-panel-note">
						Reports draw live analytics, policy posture, flagged audit events, and the approval pipeline
						so oversight is based on evidence rather than anecdote.
					</p>
				</AdminPanel>

				<AdminPanel title="Saved reports" description="Previously generated packs">
					{reports.length === 0 ? (
						<p className="muted">No reports yet.</p>
					) : (
						<ul className="admin-timeline">
							{reports.map((report) => (
								<li key={report.id}>
									<span className="admin-chip">{report.audience}</span>
									<div>
										<button
											type="button"
											className="admin-link-btn"
											onClick={() => void onOpen(report.id)}
										>
											{report.title}
										</button>
										<p className="muted">{formatAdminDate(report.createdAt)}</p>
									</div>
								</li>
							))}
						</ul>
					)}
				</AdminPanel>
			</div>

			{selected && (
				<AdminPanel
					title={selected.title}
					description={`Period ${selected.periodStart.slice(0, 10)} — ${selected.periodEnd.slice(0, 10)} · ${selected.status}`}
					actions={
						<button
							type="button"
							className="ghost-btn"
							onClick={() => exportGovernanceReportText(selected)}
						>
							Export text
						</button>
					}
				>
					<div className="admin-report-body">
						<section>
							<h3>Summary</h3>
							<p>{selected.summary}</p>
						</section>
						{selected.sections.map((section) => (
							<section key={section.heading}>
								<h3>{section.heading}</h3>
								<p>{section.body}</p>
							</section>
						))}
						{selected.generatedByName ? (
							<p className="muted">Prepared by {selected.generatedByName}</p>
						) : null}
					</div>
				</AdminPanel>
			)}
		</AdminShell>
	);
}
