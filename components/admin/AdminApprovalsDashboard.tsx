"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
	createAdminApproval,
	fetchAdminApprovals,
	reviewAdminApproval,
} from "@/lib/admin-api";
import type {
	ApprovalKind,
	ApprovalRequestRecord,
	ApprovalStats,
} from "@/lib/admin-governance";

const KINDS: ApprovalKind[] = ["tool", "dataset", "use_case", "model", "integration"];

const emptyForm = {
	title: "",
	description: "",
	kind: "tool" as ApprovalKind,
	justification: "",
	riskNotes: "",
};

export function AdminApprovalsDashboard() {
	const { ready } = useAdminGuard();
	const [approvals, setApprovals] = useState<ApprovalRequestRecord[]>([]);
	const [stats, setStats] = useState<ApprovalStats | null>(null);
	const [statusFilter, setStatusFilter] = useState("");
	const [form, setForm] = useState(emptyForm);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminApprovals({
				status: statusFilter || undefined,
			});
			setApprovals(data.approvals);
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
			await createAdminApproval(form);
			setForm(emptyForm);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const onReview = async (
		id: string,
		status: "under_review" | "approved" | "rejected" | "withdrawn",
	) => {
		const reviewNotes =
			status === "approved" || status === "rejected"
				? window.prompt("Review notes (optional)") ?? ""
				: "";
		setWorking(true);
		try {
			await reviewAdminApproval(id, { status, reviewNotes });
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	return (
		<AdminShell
			title="Approvals"
			subtitle="Workflows for new tools, datasets, and use cases entering the environment"
			breadcrumb="Admin · Governance"
		>
			{loading && <p className="muted">Loading approvals…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Pending" value={stats.pending} accent="warning" />
					<AdminStatCard label="Under review" value={stats.underReview} accent="primary" />
					<AdminStatCard label="Approved" value={stats.approved} accent="success" />
					<AdminStatCard label="Rejected" value={stats.rejected} accent="danger" />
				</section>
			)}

			<div className="admin-gov-grid">
				<AdminPanel title="Submit request" description="Register a tool, dataset, or use case for review">
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
							Kind
							<select
								className="topic-input"
								value={form.kind}
								onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as ApprovalKind }))}
							>
								{KINDS.map((k) => (
									<option key={k} value={k}>
										{k.replace("_", " ")}
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
						<label className="admin-form-span">
							Justification
							<textarea
								className="topic-input"
								rows={3}
								value={form.justification}
								onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
							/>
						</label>
						<label className="admin-form-span">
							Risk notes
							<textarea
								className="topic-input"
								rows={2}
								value={form.riskNotes}
								onChange={(e) => setForm((f) => ({ ...f, riskNotes: e.target.value }))}
							/>
						</label>
					</div>
					<button type="button" className="primary-btn" disabled={working} onClick={() => void onCreate()}>
						Submit for approval
					</button>
				</AdminPanel>

				<AdminPanel title="Queue filters" description="Focus the review backlog">
					<div className="admin-filter-row admin-filter-wrap">
						{(
							[
								["", "All"],
								["pending", "Pending"],
								["under_review", "Under review"],
								["approved", "Approved"],
								["rejected", "Rejected"],
							] as const
						).map(([id, label]) => (
							<button
								key={id || "all"}
								type="button"
								className={`ghost-btn${statusFilter === id ? " admin-filter-active" : ""}`}
								onClick={() => setStatusFilter(id)}
							>
								{label}
							</button>
						))}
					</div>
				</AdminPanel>
			</div>

			<AdminPanel title="Approval requests" description="Decide what may enter the institutional AI environment">
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>Submitted</th>
								<th>Kind</th>
								<th>Title</th>
								<th>Requester</th>
								<th>Faculty</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{approvals.length === 0 ? (
								<tr>
									<td colSpan={7} className="muted">
										No approval requests yet.
									</td>
								</tr>
							) : (
								approvals.map((item) => (
									<tr key={item.id}>
										<td>{formatAdminDate(item.createdAt)}</td>
										<td>
											<span className="admin-chip">{item.kind}</span>
										</td>
										<td>
											<div>
												<strong>{item.title}</strong>
												{item.description ? <p className="muted">{item.description}</p> : null}
												{item.justification ? (
													<p className="muted">Why: {item.justification}</p>
												) : null}
											</div>
										</td>
										<td>{item.requesterName ?? item.requesterEmail ?? "—"}</td>
										<td>{item.faculty ?? "—"}</td>
										<td>
											<span className={`admin-chip admin-chip-status-${item.status}`}>
												{item.status.replace("_", " ")}
											</span>
										</td>
										<td className="admin-row-actions">
											{(item.status === "pending" || item.status === "under_review") && (
												<>
													{item.status === "pending" && (
														<button
															type="button"
															className="ghost-btn"
															disabled={working}
															onClick={() => void onReview(item.id, "under_review")}
														>
															Review
														</button>
													)}
													<button
														type="button"
														className="primary-btn"
														disabled={working}
														onClick={() => void onReview(item.id, "approved")}
													>
														Approve
													</button>
													<button
														type="button"
														className="ghost-btn"
														disabled={working}
														onClick={() => void onReview(item.id, "rejected")}
													>
														Reject
													</button>
												</>
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
