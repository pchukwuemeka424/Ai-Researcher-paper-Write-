"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminPanel, AdminShell, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
	exportGovernanceReportText,
	fetchAdminReport,
	fetchAdminReports,
	fetchAdminUsers,
	generateAdminReport,
} from "@/lib/admin-api";
import type { GovernanceReportAudience, GovernanceReportRecord } from "@/lib/admin-governance";
import { USER_ROLE_OPTIONS } from "@/lib/dashboard";

const REPORT_TYPES = [
	"User Activity Report",
	"User Token Usage Report",
	"User Audit Report",
	"Users by Faculty Report",
	"Users by Department Report",
	"User Role Distribution Report",
	"User Alert Report",
	"User Incident Report",
	"User AI Disclosure Report",
	"User Data Retention Report",
	"Institution AI Usage Report",
	"Policy Compliance Report",
] as const;

type ExportFormat = "csv" | "pdf" | "excel";

function downloadBlob(content: string, filename: string, mime: string) {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

function reportToCsv(report: GovernanceReportRecord): string {
	const rows: string[][] = [
		["Title", report.title],
		["Audience", report.audience],
		["Period start", report.periodStart],
		["Period end", report.periodEnd],
		["Status", report.status],
		["Generated", report.createdAt],
		["Prepared by", report.generatedByName ?? ""],
		[],
		["Section", "Body"],
		["Summary", report.summary],
		...report.sections.map((section) => [section.heading, section.body]),
	];
	return rows
		.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
		.join("\n");
}

function exportReport(report: GovernanceReportRecord, format: ExportFormat) {
	const stamp = report.createdAt.slice(0, 10);
	const slug = report.title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 48);

	if (format === "csv") {
		downloadBlob(reportToCsv(report), `${slug || "governance-report"}-${stamp}.csv`, "text/csv;charset=utf-8;");
		return;
	}

	if (format === "excel") {
		downloadBlob(
			reportToCsv(report),
			`${slug || "governance-report"}-${stamp}.xls`,
			"application/vnd.ms-excel;charset=utf-8;",
		);
		return;
	}

	// PDF via printable text window
	const lines = [
		report.title,
		`Audience: ${report.audience}`,
		`Period: ${report.periodStart.slice(0, 10)} — ${report.periodEnd.slice(0, 10)}`,
		`Generated: ${report.createdAt}`,
		"",
		"SUMMARY",
		report.summary,
		"",
		...report.sections.flatMap((section) => [section.heading, section.body, ""]),
	];
	const w = window.open("", "_blank");
	if (!w) {
		downloadBlob(lines.join("\n"), `${slug || "governance-report"}-${stamp}.txt`, "text/plain;charset=utf-8;");
		return;
	}
	w.document.write(
		`<pre style="font-family:Georgia,serif;white-space:pre-wrap;padding:24px;line-height:1.5">${lines
			.join("\n")
			.replace(/</g, "&lt;")}</pre>`,
	);
	w.document.close();
	w.focus();
	w.print();
}

export function AdminReportsDashboard() {
	const { ready } = useAdminGuard();
	const [reports, setReports] = useState<GovernanceReportRecord[]>([]);
	const [selected, setSelected] = useState<GovernanceReportRecord | null>(null);
	const [reportType, setReportType] = useState<string>(REPORT_TYPES[0]);
	const [format, setFormat] = useState<ExportFormat>("csv");
	const [audience, setAudience] = useState<GovernanceReportAudience>("both");
	const [periodStart, setPeriodStart] = useState("");
	const [periodEnd, setPeriodEnd] = useState("");
	const [faculty, setFaculty] = useState("");
	const [department, setDepartment] = useState("");
	const [programme, setProgramme] = useState("");
	const [userRole, setUserRole] = useState("");
	const [faculties, setFaculties] = useState<string[]>([]);
	const [departments, setDepartments] = useState<string[]>([]);
	const [programmes, setProgrammes] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const [list, users] = await Promise.all([fetchAdminReports(), fetchAdminUsers()]);
			setReports(list);
			setFaculties(
				[...new Set(users.map((u) => u.faculty).filter(Boolean) as string[])].sort(),
			);
			setDepartments(
				[...new Set(users.map((u) => u.department).filter(Boolean) as string[])].sort(),
			);
			setProgrammes(
				[...new Set(users.map((u) => u.programme).filter(Boolean) as string[])].sort(),
			);
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
			const report = await generateAdminReport({
				audience,
				reportType,
				format,
				periodStart: periodStart || undefined,
				periodEnd: periodEnd || undefined,
				faculty: faculty || undefined,
				department: department || undefined,
				programme: programme || undefined,
				userRole: userRole || undefined,
			});
			setSelected(report);
			exportReport(report, format);
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

	const filterSummary = useMemo(() => {
		const bits = [
			periodStart || periodEnd
				? `Dates ${periodStart || "…"} → ${periodEnd || "…"}`
				: null,
			faculty || null,
			department || null,
			programme || null,
			userRole || null,
		].filter(Boolean);
		return bits.length ? bits.join(" · ") : "No filters applied";
	}, [periodStart, periodEnd, faculty, department, programme, userRole]);

	return (
		<AdminShell
			title="User reports"
			subtitle="Generate activity, token, audit, and compliance packs scoped by role and organisation"
			breadcrumb="Admin · User safety"
		>
			{loading && <p className="muted">Loading reports…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			<div className="admin-gov-grid">
				<AdminPanel
					title="Generate report"
					description="Select a report type and export format, then apply optional organisational filters"
				>
					<div className="admin-form-grid">
						<label>
							Report type
							<select
								className="topic-input"
								value={reportType}
								onChange={(e) => setReportType(e.target.value)}
							>
								{REPORT_TYPES.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
						</label>
						<label>
							Export format
							<select
								className="topic-input"
								value={format}
								onChange={(e) => setFormat(e.target.value as ExportFormat)}
							>
								<option value="csv">CSV</option>
								<option value="excel">Excel (.xls)</option>
								<option value="pdf">PDF (print)</option>
							</select>
						</label>
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
						<label>
							Date from
							<input
								type="date"
								className="topic-input"
								value={periodStart}
								onChange={(e) => setPeriodStart(e.target.value)}
							/>
						</label>
						<label>
							Date to
							<input
								type="date"
								className="topic-input"
								value={periodEnd}
								onChange={(e) => setPeriodEnd(e.target.value)}
							/>
						</label>
						<label>
							Faculty
							<select
								className="topic-input"
								value={faculty}
								onChange={(e) => setFaculty(e.target.value)}
							>
								<option value="">All faculties</option>
								{faculties.map((f) => (
									<option key={f} value={f}>
										{f}
									</option>
								))}
							</select>
						</label>
						<label>
							Department
							<select
								className="topic-input"
								value={department}
								onChange={(e) => setDepartment(e.target.value)}
							>
								<option value="">All departments</option>
								{departments.map((d) => (
									<option key={d} value={d}>
										{d}
									</option>
								))}
							</select>
						</label>
						<label>
							Programme
							<select
								className="topic-input"
								value={programme}
								onChange={(e) => setProgramme(e.target.value)}
							>
								<option value="">All programmes</option>
								{programmes.map((p) => (
									<option key={p} value={p}>
										{p}
									</option>
								))}
							</select>
						</label>
						<label>
							User role
							<select
								className="topic-input"
								value={userRole}
								onChange={(e) => setUserRole(e.target.value)}
							>
								<option value="">All roles</option>
								{USER_ROLE_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</label>
					</div>
					<p className="muted admin-panel-note">{filterSummary}</p>
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
						<>
							<button
								type="button"
								className="ghost-btn"
								onClick={() => exportReport(selected, "csv")}
							>
								Export CSV
							</button>
							<button
								type="button"
								className="ghost-btn"
								onClick={() => exportReport(selected, "excel")}
							>
								Export Excel
							</button>
							<button
								type="button"
								className="ghost-btn"
								onClick={() => exportReport(selected, "pdf")}
							>
								Export PDF
							</button>
							<button
								type="button"
								className="ghost-btn"
								onClick={() => exportGovernanceReportText(selected)}
							>
								Export text
							</button>
						</>
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
