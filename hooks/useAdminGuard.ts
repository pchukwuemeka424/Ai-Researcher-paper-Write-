"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-nav";

export function useAdminGuard() {
	const router = useRouter();
	const { user, loading } = useAuth();

	useEffect(() => {
		if (!loading && !user) router.replace(ADMIN_LOGIN_PATH);
	}, [loading, user, router]);

	useEffect(() => {
		if (!loading && user && user.role !== "admin") {
			router.replace(user.role === "student" ? "/student/dashboard" : "/dashboard");
		}
	}, [loading, user, router]);

	const ready = !loading && Boolean(user) && user?.role === "admin";

	return { user, loading, ready };
}
