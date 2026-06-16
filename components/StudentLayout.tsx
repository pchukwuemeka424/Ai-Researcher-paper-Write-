"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { StudentSidebar } from "@/components/StudentSidebar";
import { StudentTopBar } from "@/components/StudentTopBar";
import { useAuth } from "@/hooks/useAuth";
import { dashboardPathForRole } from "@/lib/dashboard-routes";

type Props = {
	children: ReactNode;
};

export function StudentLayout({ children }: Props) {
	const router = useRouter();
	const pathname = usePathname();
	const { user, loading } = useAuth();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const isFluid = pathname.startsWith("/student/research");

	useEffect(() => {
		if (!loading && !user) router.replace("/login");
		if (!loading && user && user.role !== "student") {
			router.replace(dashboardPathForRole(user.role));
		}
	}, [loading, user, router]);

	useEffect(() => {
		if (!sidebarOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setSidebarOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [sidebarOpen]);

	if (loading || !user || user.role !== "student") {
		return (
			<div className="stu-app">
				<p className="stu-loading">Loading your workspace…</p>
			</div>
		);
	}

	return (
		<div className="stu-app">
			{sidebarOpen && (
				<button
					type="button"
					className="stu-sidebar-backdrop"
					aria-label="Close navigation"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			<StudentSidebar
				id="student-sidebar"
				user={user}
				className={sidebarOpen ? "stu-sidebar-open" : undefined}
				onNavigate={() => setSidebarOpen(false)}
			/>

			<div className="stu-main">
				<StudentTopBar onMenuClick={() => setSidebarOpen(true)} />
				<main className={isFluid ? "stu-content stu-content-fluid" : "stu-content"}>{children}</main>
			</div>
		</div>
	);
}
