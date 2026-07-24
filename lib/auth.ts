import type { StudentTokenQuota } from "@/lib/student-tokens";

export type AuthUser = {
	id: string;
	name: string;
	email: string;
	role:
		| "lecturer"
		| "admin"
		| "viewer"
		| "researcher"
		| "student"
		| "governance_admin"
		| "faculty_admin"
		| "auditor";
	status: "active" | "inactive";
	department: string | null;
	institution: string | null;
	universityId: string | null;
	lastActiveAt: string | null;
	createdAt: string;
	tokenQuota?: StudentTokenQuota;
};

export type RegisterInput = {
	name: string;
	email: string;
	password: string;
	department: string;
	institution?: string;
	catalogueId?: string;
};

export type StudentRegisterInput = RegisterInput;

export type LoginInput = {
	email: string;
	password: string;
};

export type AuthResponse = {
	token: string;
	user: AuthUser;
};

const TOKEN_KEY = "feynman_auth_token";
const USER_ID_KEY = "feynman_auth_user_id";

export function getStoredToken(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
	localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(USER_ID_KEY);
}

export function getStoredUserId(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(USER_ID_KEY);
}

export function setStoredUserId(userId: string): void {
	localStorage.setItem(USER_ID_KEY, userId);
}

export function authHeaders(): HeadersInit {
	const token = getStoredToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}
