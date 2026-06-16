import type { AuthUser } from "@/lib/auth";

export function isStudent(user: AuthUser | null | undefined): boolean {
	return user?.role === "student";
}

export function dashboardPathForRole(role: AuthUser["role"]): string {
	if (role === "student") return "/student/dashboard";
	return "/dashboard";
}

export function loginPathForRole(_role: AuthUser["role"]): string {
	return "/login";
}

export function researchPathForRole(role: AuthUser["role"]): string {
	if (role === "student") return "/student/research";
	return "/research";
}
