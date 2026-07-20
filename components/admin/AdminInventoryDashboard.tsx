"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminPanel, AdminShell, AdminStatCard, formatAdminDate } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
	createAdminInventorySystem,
	deleteAdminInventorySystem,
	fetchAdminInventory,
	updateAdminInventorySystem,
} from "@/lib/admin-api";
import type { AiSystemRecord, AiSystemStats } from "@/lib/admin-governance";

const emptyForm = {
	name: "",
	vendor: "",
	purpose: "",
	category: "llm",
	deployment: "vendor_saas",
	riskTier: "limited",
	ownerName: "",
	dpiaRequired: false,
};

export function AdminInventoryDashboard() {
	const { ready } = useAdminGuard();
	const [systems, setSystems] = useState<AiSystemRecord[]>([]);
	const [stats, setStats] = useState<AiSystemStats | null>(null);
	const [form, setForm] = useState(emptyForm);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const data = await fetchAdminInventory();
			setSystems(data.systems);
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

	const onCreate = async () => {
		if (!form.name.trim()) {
			setError("Name is required.");
			return;
		}
		setWorking(true);
		setError(null);
		try {
			await createAdminInventorySystem({
				...form,
				dpiaRequired: form.dpiaRequired || form.riskTier === "high",
			});
			setForm(emptyForm);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const setStatus = async (id: string, status: string) => {
		setWorking(true);
		try {
			await updateAdminInventorySystem(id, { status });
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	const setDpia = async (id: string, dpiaStatus: string) => {
		setWorking(true);
		try {
			await updateAdminInventorySystem(id, { dpiaStatus });
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setWorking(false);
		}
	};

	return (
		<AdminShell
			title="AI inventory"
			subtitle="Register of AI systems in the research environment — risk tiers, access, and DPIA status"
			breadcrumb="Admin · Governance"
		>
			{loading && <p className="muted">Loading inventory…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Systems" value={stats.total} accent="primary" />
					<AdminStatCard label="Active" value={stats.active} accent="success" />
					<AdminStatCard label="High / unacceptable" value={stats.highRisk} accent="danger" />
					<AdminStatCard label="Restricted" value={stats.restricted} accent="warning" />
					<AdminStatCard label="DPIA pending" value={stats.dpiaPending} accent="warning" />
				</section>
			)}

			<div className="admin-gov-grid">
				<AdminPanel title="Register system" description="High-risk systems auto-require a DPIA">
					<div className="admin-form-grid">
						<label>
							Name
							<input className="topic-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
						</label>
						<label>
							Vendor
							<input className="topic-input" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} />
						</label>
						<label>
							Category
							<select className="topic-input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
								{["llm", "embedding", "search", "vision", "speech", "analytics", "other"].map((c) => (
									<option key={c} value={c}>{c}</option>
								))}
							</select>
						</label>
						<label>
							Risk tier
							<select className="topic-input" value={form.riskTier} onChange={(e) => setForm((f) => ({ ...f, riskTier: e.target.value }))}>
								{["minimal", "limited", "high", "unacceptable"].map((t) => (
									<option key={t} value={t}>{t}</option>
								))}
							</select>
						</label>
						<label>
							Deployment
							<select className="topic-input" value={form.deployment} onChange={(e) => setForm((f) => ({ ...f, deployment: e.target.value }))}>
								{["internal", "vendor_saas", "open_source", "hybrid"].map((d) => (
									<option key={d} value={d}>{d.replace(/_/g, " ")}</option>
								))}
							</select>
						</label>
						<label>
							Owner
							<input className="topic-input" value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} />
						</label>
						<label className="admin-form-span">
							Purpose
							<input className="topic-input" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} />
						</label>
					</div>
					<button type="button" className="primary-btn" disabled={working} onClick={() => void onCreate()}>
						Add to inventory
					</button>
				</AdminPanel>

				<AdminPanel title="DPIA guidance" description="When a data protection impact assessment is required">
					<ul className="admin-feature-list">
						<li>
							<span>High or unacceptable risk tiers</span>
							<strong>DPIA required</strong>
						</li>
						<li>
							<span>Systems processing personal / health data</span>
							<strong>DPIA required</strong>
						</li>
						<li>
							<span>Minimal / limited with public scholarly data only</span>
							<strong>Usually not required</strong>
						</li>
					</ul>
				</AdminPanel>
			</div>

			<AdminPanel title="Registered systems" description="Approve, restrict, or retire systems; track DPIA completion">
				<div className="admin-table-scroll">
					<table className="admin-simple-table">
						<thead>
							<tr>
								<th>System</th>
								<th>Tier</th>
								<th>Status</th>
								<th>DPIA</th>
								<th>Owner</th>
								<th>Reviewed</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{systems.map((system) => (
								<tr key={system.id} className={system.riskTier === "high" || system.riskTier === "unacceptable" ? "admin-row-flagged" : undefined}>
									<td>
										<strong>{system.name}</strong>
										<p className="muted">
											{system.vendor || "—"} · {system.category} · {system.deployment.replace(/_/g, " ")}
										</p>
										{system.purpose ? <p className="muted">{system.purpose}</p> : null}
									</td>
									<td>
										<span className={`admin-chip admin-chip-${system.riskTier === "high" || system.riskTier === "unacceptable" ? "danger" : "warning"}`}>
											{system.riskTier}
										</span>
									</td>
									<td>
										<span className="admin-chip">{system.status}</span>
									</td>
									<td>
										<span className={`admin-chip admin-chip-status-${system.dpiaStatus}`}>
											{system.dpiaRequired ? system.dpiaStatus.replace(/_/g, " ") : "n/a"}
										</span>
									</td>
									<td>{system.ownerName || "—"}</td>
									<td>{formatAdminDate(system.lastReviewedAt)}</td>
									<td className="admin-row-actions">
										{system.status === "proposed" && (
											<button type="button" className="primary-btn" disabled={working} onClick={() => void setStatus(system.id, "active")}>
												Activate
											</button>
										)}
										{system.status === "active" && (
											<button type="button" className="ghost-btn" disabled={working} onClick={() => void setStatus(system.id, "restricted")}>
												Restrict
											</button>
										)}
										{system.dpiaRequired && system.dpiaStatus !== "complete" && (
											<button type="button" className="ghost-btn" disabled={working} onClick={() => void setDpia(system.id, "complete")}>
												Mark DPIA done
											</button>
										)}
										{system.status !== "retired" && (
											<button type="button" className="ghost-btn" disabled={working} onClick={() => void setStatus(system.id, "retired")}>
												Retire
											</button>
										)}
										<button
											type="button"
											className="ghost-btn"
											disabled={working}
											onClick={() => {
												if (window.confirm("Remove this system?")) void deleteAdminInventorySystem(system.id).then(load);
											}}
										>
											Delete
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</AdminPanel>
		</AdminShell>
	);
}
