"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";
import { ADMIN_LOGIN_PATH, SUPER_ADMIN_HOME_PATH, SUPER_ADMIN_LOGIN_PATH } from "@/lib/admin-nav";
import { isAdminConsoleRole, isSuperAdmin } from "@/lib/admin-roles";

/** Guard for university admin console (`/admin/*`). Super admins are sent to `/super-admin`. */
export function useAdminGuard() {
	const router = useRouter();
	const { user, loading } = useAuth();

	useEffect(() => {
		if (!loading && !user) router.replace(ADMIN_LOGIN_PATH);
	}, [loading, user, router]);

	useEffect(() => {
		if (loading || !user) return;
		if (isSuperAdmin(user.role)) {
			router.replace(SUPER_ADMIN_HOME_PATH);
			return;
		}
		if (!isAdminConsoleRole(user.role)) {
			router.replace(user.role === "student" ? "/student/dashboard" : "/dashboard");
		}
	}, [loading, user, router]);

	const ready =
		!loading &&
		Boolean(user) &&
		isAdminConsoleRole(user?.role) &&
		!isSuperAdmin(user?.role);

	return { user, loading, ready };
}

/** Guard for platform super admin console (`/super-admin/*`). */
export function useSuperAdminGuard() {
	const router = useRouter();
	const { user, loading } = useAuth();

	useEffect(() => {
		if (!loading && !user) router.replace(SUPER_ADMIN_LOGIN_PATH);
	}, [loading, user, router]);

	useEffect(() => {
		if (loading || !user) return;
		if (isSuperAdmin(user.role)) return;
		if (isAdminConsoleRole(user.role)) {
			router.replace("/admin");
			return;
		}
		router.replace(user.role === "student" ? "/student/dashboard" : "/dashboard");
	}, [loading, user, router]);

	const ready = !loading && Boolean(user) && isSuperAdmin(user?.role);

	return { user, loading, ready };
}
