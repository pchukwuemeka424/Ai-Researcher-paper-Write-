"use client";

import { useEffect, useState, type ReactNode } from "react";

import { SuperAdminSidebar } from "@/components/admin/SuperAdminSidebar";
import {
	AdminPanel,
	AdminStatCard,
	formatAdminDate,
	formatAdminRelative,
} from "@/components/admin/AdminShell";
import { useSuperAdminGuard } from "@/hooks/useAdminGuard";

type Props = {
	title: string;
	subtitle?: string;
	breadcrumb?: string;
	actions?: ReactNode;
	children: ReactNode;
};

export function SuperAdminShell({ title, subtitle, breadcrumb, actions, children }: Props) {
	const { user, loading, ready } = useSuperAdminGuard();
	const [sidebarOpen, setSidebarOpen] = useState(false);

	useEffect(() => {
		if (!sidebarOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setSidebarOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [sidebarOpen]);

	if (loading || !ready) {
		return (
			<div className="admin">
				<p className="admin-loading muted">Loading super admin…</p>
			</div>
		);
	}

	return (
		<div className="admin admin-super">
			{sidebarOpen && (
				<button
					type="button"
					className="admin-sidebar-backdrop"
					aria-label="Close navigation"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			<SuperAdminSidebar
				className={sidebarOpen ? "admin-sidebar-open" : undefined}
				onNavigate={() => setSidebarOpen(false)}
			/>

			<div className="admin-shell">
				<header className="admin-topbar">
					<div className="admin-topbar-start">
						<button
							type="button"
							className="admin-menu-btn"
							aria-label="Open navigation"
							aria-expanded={sidebarOpen}
							aria-controls="super-admin-sidebar"
							onClick={() => setSidebarOpen(true)}
						>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
								<path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
							</svg>
						</button>
						<div className="admin-topbar-titles">
							{breadcrumb && <p className="admin-breadcrumb">{breadcrumb}</p>}
							<h1 className="admin-page-title">{title}</h1>
							{subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
						</div>
					</div>
					<div className="admin-topbar-end">
						{user && (
							<span className="admin-user-pill" title={user.email}>
								<span className="admin-user-pill-dot" aria-hidden />
								{user.name}
							</span>
						)}
						{actions}
					</div>
				</header>

				<main className="admin-content">{children}</main>
			</div>
		</div>
	);
}

export { AdminPanel, AdminStatCard, formatAdminDate, formatAdminRelative };
