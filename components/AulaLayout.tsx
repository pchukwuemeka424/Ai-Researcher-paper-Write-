"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { AulaRightPanel } from "@/components/AulaRightPanel";
import { AulaSidebar } from "@/components/AulaSidebar";
import { AulaTopBar } from "@/components/AulaTopBar";
import { dashboardPathForRole } from "@/lib/dashboard-routes";
import { useAuth } from "@/hooks/useAuth";

type Props = {
	children: ReactNode;
	showRightPanel?: boolean;
	/** Zero-padding full-height content area (chat workspace). */
	fullHeight?: boolean;
};

export function AulaLayout({ children, showRightPanel = true, fullHeight = false }: Props) {
	const router = useRouter();
	const { user, loading } = useAuth();
	const [sidebarOpen, setSidebarOpen] = useState(false);

	useEffect(() => {
		if (!loading && !user) router.replace("/login");
		if (!loading && user?.role === "student") router.replace(dashboardPathForRole("student"));
	}, [loading, user, router]);

	useEffect(() => {
		if (!sidebarOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setSidebarOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [sidebarOpen]);

	if (loading || !user || user.role === "student") {
		return (
			<div className="aula">
				<p className="aula-loading muted">Loading…</p>
			</div>
		);
	}

	return (
		<div className="aula">
			{sidebarOpen && (
				<button
					type="button"
					className="aula-sidebar-backdrop"
					aria-label="Close navigation"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			<AulaSidebar
				id="aula-sidebar"
				user={user}
				className={sidebarOpen ? "aula-sidebar-open" : undefined}
				onNavigate={() => setSidebarOpen(false)}
			/>

			<div className="aula-shell">
				<AulaTopBar onMenuClick={() => setSidebarOpen(true)} />

				<div className="aula-workspace">
					<div className={fullHeight ? "aula-content aula-content-full" : "aula-content"}>{children}</div>
					{showRightPanel && <AulaRightPanel />}
				</div>
			</div>
		</div>
	);
}
