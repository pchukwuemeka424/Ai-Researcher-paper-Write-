"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { NavIcon } from "@/components/aula/NavIcon";
import { AdminRecentSessionsPanel } from "@/components/admin/AdminRecentSessionsPanel";
import { AdminShell, AdminStatCard } from "@/components/admin/AdminShell";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { fetchAdminStats } from "@/lib/admin-api";
import { ADMIN_NAV_GROUPS } from "@/lib/admin-nav";
import { navIconTone } from "@/lib/colors";
import type { DashboardStats } from "@/lib/dashboard";

export function AdminOverviewDashboard() {
	const { ready } = useAdminGuard();
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadStats = useCallback(async () => {
		setError(null);
		try {
			const statsData = await fetchAdminStats();
			setStats(statsData);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (ready) void loadStats();
	}, [loadStats, ready]);

	const quickLinks = ADMIN_NAV_GROUPS.flatMap((group) => group.items).filter(
		(item) => item.id !== "admin-overview",
	);

	return (
		<AdminShell
			title="Overview"
			subtitle="Platform health and recent activity"
			breadcrumb="Admin Console"
		>
			{loading && <p className="muted">Loading overview…</p>}
			{error && <div className="banner banner-error">{error}</div>}

			{stats && (
				<section className="admin-stats">
					<AdminStatCard label="Total accounts" value={stats.userCount} accent="primary" hint="All registered users" />
					<AdminStatCard label="Active accounts" value={stats.activeUsers} accent="success" hint="Currently enabled" />
					<AdminStatCard label="Research sessions" value={stats.sessionCount} accent="primary" />
					<AdminStatCard label="Messages" value={stats.messageCount} hint="User + assistant" />
					<AdminStatCard
						label="Live sessions"
						value={stats.activeSessions}
						accent={stats.activeSessions > 0 ? "warning" : undefined}
						hint="Running or starting"
					/>
				</section>
			)}

			<section className="admin-quick-links">
				{quickLinks.map((item) => {
					const tone = navIconTone(item.iconId);
					return (
						<Link key={item.id} href={item.href} className="admin-quick-link">
							<span
								className="admin-quick-link-icon"
								style={{ background: tone.bg, color: tone.fg }}
								aria-hidden
							>
								<NavIcon id={item.iconId} size={20} />
							</span>
							<span>
								<p className="admin-quick-link-title">{item.label}</p>
								<p className="admin-quick-link-desc">{item.description}</p>
							</span>
						</Link>
					);
				})}
			</section>

			<AdminRecentSessionsPanel limit={8} ready={ready} />
		</AdminShell>
	);
}
