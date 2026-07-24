"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useAdminUserQuery, matchesAdminUserQuery } from "@/hooks/useAdminUserQuery";
import {
	createAdminDeletionRequest,
	createAdminRetentionPolicy,
	deleteAdminRetentionPolicy,
	fetchAdminRetention,
	updateAdminDeletionRequest,
	updateAdminRetentionPolicy,
} from "@/lib/admin-api";
import type {
	DeletionRequestRecord,
	RetentionPolicyRecord,
	RetentionStats,
} from "@/lib/admin-governance";

const CATEGORIES = [
	{ id: "audit_logs", label: "Audit logs" },
	{ id: "ai_conversations", label: "AI conversations" },
	{ id: "research_documents", label: "Research documents" },
	{ id: "uploaded_files", label: "Uploaded files" },
	{ id: "incidents", label: "Incidents" },
	{ id: "governance_reports", label: "Governance reports" },
	{ id: "contribution_statements", label: "Contribution statements" },
] as const;

const emptyPolicy = {
	name: "",
	description: "",
	dataCategory: "audit_logs",
	retainDays: "2555",
	archiveDays: "365",
	actionOnExpiry: "archive",
	regulatoryBasis: "NDPA / institutional policy",
	legalHold: false,
};

const emptyDeletion = {
	subjectName: "",
	subjectEmail: "",
	requestType: "erase",
	scope: "research_documents",
	notes: "",
	dueAt: "",
};

function categoryLabel(id: string) {
	return CATEGORIES.find((c) => c.id === id)?.label ?? id.replace(/_/g, " ");
}

export function AdminRetentionDashboard() {
	const { ready } = useAdminGuard();
	const [policies, setPolicies] = useState<RetentionPolicyRecord[]>([]);
	const [deletionRequests, setDeletionRequests] = useState<DeletionRequestRecord[]>([]);
	const [stats, setStats] = useState<RetentionStats | null>(null);
	const [policyForm, setPolicyForm] = useState(emptyPolicy);
	const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
	const [deletionForm, setDeletionForm] = useState(emptyDeletion);
	const [userFilter, setUserFilter] = useAdminUserQuery();
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminRetention();
			setPolicies(data.policies);
			setDeletionRequests(data.deletionRequests);
			setStats(data.stats);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void load();
	}, [load, ready]);

	useEffect(() => {
		if (!userFilter.trim()) return;
		setDeletionForm((prev) =>
			prev.subjectEmail || prev.subjectName
				? prev
				: { ...prev, subjectEmail: userFilter.includes("@") ? userFilter : prev.subjectEmail, subjectName: userFilter.includes("@") ? prev.subjectName : userFilter },
		);
	}, [userFilter]);

	const filteredDeletions = useMemo(
		() =>
			deletionRequests.filter((req) =>
				matchesAdminUserQuery(userFilter, [req.subjectName, req.subjectEmail, req.scope, req.requestType]),
			),
		[deletionRequests, userFilter],
	);

	const onSavePolicy = async () => {
		if (!policyForm.name.trim()) {
			setError("Policy name is required.");
			return;
		}
		setWorking(true);
		setError(null);
		try {
			const payload = {
				...policyForm,
				retainDays: Number.parseInt(policyForm.retainDays, 10) || 365,
				archiveDays: Number.parseInt(policyForm.archiveDays, 10) || 0,
			};
			if (editingPolicyId) {
				await updateAdminRetentionPolicy(editingPolicyId, payload);
			} else {
				await createAdminRetentionPolicy(payload);
			}
			setPolicyForm(emptyPolicy);
			setEditingPolicyId(null);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const startEditPolicy = (policy: RetentionPolicyRecord) => {
		setEditingPolicyId(policy.id);
		setPolicyForm({
			name: policy.name,
			description: policy.description,
			dataCategory: policy.dataCategory,
			retainDays: String(policy.retainDays),
			archiveDays: String(policy.archiveDays),
			actionOnExpiry: policy.actionOnExpiry,
			regulatoryBasis: policy.regulatoryBasis,
			legalHold: policy.legalHold,
		});
	};

	const setExpiryAction = async (policy: RetentionPolicyRecord, actionOnExpiry: string) => {
		setWorking(true);
		try {
			await updateAdminRetentionPolicy(policy.id, { actionOnExpiry });
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const togglePolicy = async (policy: RetentionPolicyRecord) => {
		setWorking(true);
		try {
			await updateAdminRetentionPolicy(policy.id, { enabled: !policy.enabled });
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const toggleHold = async (policy: RetentionPolicyRecord) => {
		setWorking(true);
		try {
			await updateAdminRetentionPolicy(policy.id, {
				legalHold: !policy.legalHold,
				actionOnExpiry: !policy.legalHold ? "legal_hold" : policy.actionOnExpiry,
			});
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const onDeletePolicy = async (id: string) => {
		if (!window.confirm("Permanently delete this retention policy?")) return;
		setWorking(true);
		try {
			await deleteAdminRetentionPolicy(id);
			if (editingPolicyId === id) {
				setEditingPolicyId(null);
				setPolicyForm(emptyPolicy);
			}
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const onCreateDeletion = async () => {
		if (!deletionForm.subjectName.trim() || !deletionForm.subjectEmail.trim()) {
			setError("Subject name and email are required.");
			return;
		}
		setWorking(true);
		setError(null);
		try {
			await createAdminDeletionRequest({
				...deletionForm,
				dueAt: deletionForm.dueAt || undefined,
			});
			setDeletionForm(emptyDeletion);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const advanceDeletion = async (id: string, status: string) => {
		setWorking(true);
		try {
			await updateAdminDeletionRequest(id, {
				status,
				...(status === "completed" ? { completedAt: new Date().toISOString() } : {}),
			});
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	return (
		<AdminShell
			title="User data retention"
			subtitle="Retention policies and subject deletion requests for user-owned data"
			breadcrumb="Admin · User data"
		>
			{loading && <p className="muted">Loading retention controls…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Policies" value={stats.policies} accent="primary" />
					<AdminStatCard label="Enabled" value={stats.enabled} accent="success" />
					<AdminStatCard label="Legal holds" value={stats.legalHolds} accent="warning" />
					<AdminStatCard
						label="Open deletion requests"
						value={stats.deletionOpen}
						accent={stats.deletionOpen > 0 ? "danger" : undefined}
					/>
					<AdminStatCard label="Completed deletions" value={stats.deletionCompleted} accent="success" />
				</section>
			)}

			<div className="admin-gov-grid">
				<AdminPanel
					title={editingPolicyId ? "Edit retention policy" : "Add retention policy"}
					description="Schedule retention, archive, and expiry actions by data category"
				>
					<div className="admin-form-grid">
						<label>
							Name
							<input
								className="topic-input"
								value={policyForm.name}
								onChange={(e) => setPolicyForm((f) => ({ ...f, name: e.target.value }))}
							/>
						</label>
						<label>
							Data category
							<select
								className="topic-input"
								value={policyForm.dataCategory}
								onChange={(e) =>
									setPolicyForm((f) => ({ ...f, dataCategory: e.target.value }))
								}
							>
								{CATEGORIES.map((c) => (
									<option key={c.id} value={c.id}>
										{c.label}
									</option>
								))}
							</select>
						</label>
						<label>
							Retention period (days)
							<input
								className="topic-input"
								value={policyForm.retainDays}
								onChange={(e) => setPolicyForm((f) => ({ ...f, retainDays: e.target.value }))}
							/>
						</label>
						<label>
							Archive period (days)
							<input
								className="topic-input"
								value={policyForm.archiveDays}
								onChange={(e) => setPolicyForm((f) => ({ ...f, archiveDays: e.target.value }))}
							/>
						</label>
						<label>
							On expiry / scheduled deletion
							<select
								className="topic-input"
								value={policyForm.actionOnExpiry}
								onChange={(e) =>
									setPolicyForm((f) => ({ ...f, actionOnExpiry: e.target.value }))
								}
							>
								<option value="archive">Archive data</option>
								<option value="anonymise">Anonymise (restore-safe)</option>
								<option value="delete">Permanent delete</option>
								<option value="legal_hold">Legal hold</option>
							</select>
						</label>
						<label>
							Regulatory basis
							<input
								className="topic-input"
								value={policyForm.regulatoryBasis}
								onChange={(e) =>
									setPolicyForm((f) => ({ ...f, regulatoryBasis: e.target.value }))
								}
							/>
						</label>
						<label className="admin-form-span">
							Description
							<input
								className="topic-input"
								value={policyForm.description}
								onChange={(e) =>
									setPolicyForm((f) => ({ ...f, description: e.target.value }))
								}
							/>
						</label>
					</div>
					<label className="admin-check">
						<input
							type="checkbox"
							checked={policyForm.legalHold}
							onChange={(e) => setPolicyForm((f) => ({ ...f, legalHold: e.target.checked }))}
						/>
						Legal hold (prevent permanent deletion)
					</label>
					<div className="admin-row-actions">
						<button
							type="button"
							className="primary-btn"
							disabled={working}
							onClick={() => void onSavePolicy()}
						>
							{editingPolicyId ? "Save policy" : "Create policy"}
						</button>
						{editingPolicyId && (
							<button
								type="button"
								className="ghost-btn"
								onClick={() => {
									setEditingPolicyId(null);
									setPolicyForm(emptyPolicy);
								}}
							>
								Cancel
							</button>
						)}
					</div>
				</AdminPanel>

				<AdminPanel title="Deletion approval request" description="Subject erasure, export, or restrict with due date">
					<div className="admin-form-grid">
						<label>
							Subject name
							<input
								className="topic-input"
								value={deletionForm.subjectName}
								onChange={(e) =>
									setDeletionForm((f) => ({ ...f, subjectName: e.target.value }))
								}
							/>
						</label>
						<label>
							Subject email
							<input
								className="topic-input"
								value={deletionForm.subjectEmail}
								onChange={(e) =>
									setDeletionForm((f) => ({ ...f, subjectEmail: e.target.value }))
								}
							/>
						</label>
						<label>
							Request type
							<select
								className="topic-input"
								value={deletionForm.requestType}
								onChange={(e) =>
									setDeletionForm((f) => ({ ...f, requestType: e.target.value }))
								}
							>
								<option value="erase">Permanent delete</option>
								<option value="export">Export / restore archive</option>
								<option value="restrict">Restrict / archive</option>
								<option value="rectify">Rectify</option>
							</select>
						</label>
						<label>
							Scope (category)
							<select
								className="topic-input"
								value={deletionForm.scope}
								onChange={(e) => setDeletionForm((f) => ({ ...f, scope: e.target.value }))}
							>
								{CATEGORIES.map((c) => (
									<option key={c.id} value={c.id}>
										{c.label}
									</option>
								))}
							</select>
						</label>
						<label>
							Scheduled due date
							<input
								className="topic-input"
								type="date"
								value={deletionForm.dueAt}
								onChange={(e) => setDeletionForm((f) => ({ ...f, dueAt: e.target.value }))}
							/>
						</label>
						<label className="admin-form-span">
							Notes
							<input
								className="topic-input"
								value={deletionForm.notes}
								onChange={(e) => setDeletionForm((f) => ({ ...f, notes: e.target.value }))}
							/>
						</label>
					</div>
					<button
						type="button"
						className="primary-btn"
						disabled={working}
						onClick={() => void onCreateDeletion()}
					>
						Submit for approval
					</button>
				</AdminPanel>
			</div>

			<AdminPanel title="Retention policies" description="Archive, restore-safe anonymise, permanent delete, and legal hold">
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>Category</th>
								<th>Policy</th>
								<th>Retention</th>
								<th>Archive</th>
								<th>On expiry</th>
								<th>Hold</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{policies.length === 0 ? (
								<tr>
									<td colSpan={8} className="muted">
										No retention policies yet.
									</td>
								</tr>
							) : (
								policies.map((policy) => (
									<tr key={policy.id} className={!policy.enabled ? "admin-row-muted" : undefined}>
										<td>{categoryLabel(policy.dataCategory)}</td>
										<td>
											<strong>{policy.name}</strong>
											{policy.regulatoryBasis ? (
												<p className="muted">{policy.regulatoryBasis}</p>
											) : null}
										</td>
										<td>{policy.retainDays}d</td>
										<td>{policy.archiveDays}d</td>
										<td>{policy.actionOnExpiry.replace(/_/g, " ")}</td>
										<td>{policy.legalHold ? "Yes" : "No"}</td>
										<td>{policy.enabled ? "Enabled" : "Disabled"}</td>
										<td className="admin-row-actions">
											<button
												type="button"
												className="ghost-btn"
												disabled={working}
												onClick={() => startEditPolicy(policy)}
											>
												Edit
											</button>
											<button
												type="button"
												className="ghost-btn"
												disabled={working}
												onClick={() => void setExpiryAction(policy, "archive")}
											>
												Archive
											</button>
											<button
												type="button"
												className="ghost-btn"
												disabled={working}
												onClick={() => void setExpiryAction(policy, "anonymise")}
											>
												Restore-safe
											</button>
											<button
												type="button"
												className="ghost-btn"
												disabled={working || policy.legalHold}
												onClick={() => void setExpiryAction(policy, "delete")}
											>
												Permanent delete
											</button>
											<button
												type="button"
												className="ghost-btn"
												disabled={working}
												onClick={() => void toggleHold(policy)}
											>
												{policy.legalHold ? "Release hold" : "Legal hold"}
											</button>
											<button
												type="button"
												className="ghost-btn"
												disabled={working}
												onClick={() => void togglePolicy(policy)}
											>
												{policy.enabled ? "Disable" : "Enable"}
											</button>
											<button
												type="button"
												className="ghost-btn"
												disabled={working}
												onClick={() => void onDeletePolicy(policy.id)}
											>
												Delete policy
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</AdminPanel>

			<AdminPanel
				title="Deletion approval workflow"
				description={`${filteredDeletions.length.toLocaleString()} of ${deletionRequests.length.toLocaleString()} subject requests`}
			>
				<label className="field-label" htmlFor="retention-user-filter" style={{ margin: "0 1.25rem" }}>
					Subject user
				</label>
				<input
					id="retention-user-filter"
					className="topic-input"
					style={{ margin: "0 1.25rem 1rem", maxWidth: "24rem" }}
					value={userFilter}
					onChange={(e) => setUserFilter(e.target.value)}
					placeholder="Filter by subject name or email…"
				/>
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>Received</th>
								<th>Subject</th>
								<th>Type</th>
								<th>Scope</th>
								<th>Due</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{filteredDeletions.length === 0 ? (
								<tr>
									<td colSpan={7} className="muted">
										{deletionRequests.length === 0
											? "No deletion / export requests."
											: "No requests match this user filter."}
									</td>
								</tr>
							) : (
								filteredDeletions.map((req) => (
									<tr key={req.id}>
										<td>{formatAdminDate(req.createdAt)}</td>
										<td>
											<strong>{req.subjectName}</strong>
											<p className="muted">{req.subjectEmail}</p>
										</td>
										<td>{req.requestType}</td>
										<td>{categoryLabel(req.scope)}</td>
										<td>{req.dueAt ? formatAdminDate(req.dueAt) : "—"}</td>
										<td>{req.status.replace(/_/g, " ")}</td>
										<td className="admin-row-actions">
											{req.status === "received" && (
												<button
													type="button"
													className="ghost-btn"
													disabled={working}
													onClick={() => void advanceDeletion(req.id, "under_review")}
												>
													Review
												</button>
											)}
											{(req.status === "received" || req.status === "under_review") && (
												<button
													type="button"
													className="ghost-btn"
													disabled={working}
													onClick={() => void advanceDeletion(req.id, "approved")}
												>
													Approve
												</button>
											)}
											{req.status === "approved" && (
												<button
													type="button"
													className="ghost-btn"
													disabled={working}
													onClick={() => void advanceDeletion(req.id, "completed")}
												>
													Complete deletion
												</button>
											)}
											{req.status !== "completed" && req.status !== "rejected" && (
												<>
													<button
														type="button"
														className="ghost-btn"
														disabled={working}
														onClick={() => void advanceDeletion(req.id, "on_hold")}
													>
														Hold
													</button>
													<button
														type="button"
														className="ghost-btn"
														disabled={working}
														onClick={() => void advanceDeletion(req.id, "rejected")}
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
