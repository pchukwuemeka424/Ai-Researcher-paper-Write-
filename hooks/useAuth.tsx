"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { apiUrl } from "@/lib/api";
import {
	authHeaders,
	clearStoredToken,
	getStoredToken,
	setStoredToken,
	setStoredUserId,
	type AuthResponse,
	type AuthUser,
	type LoginInput,
	type RegisterInput,
	type StudentRegisterInput,
} from "@/lib/auth";
import type { StudentTokenQuota } from "@/lib/student-tokens";

type AuthContextValue = {
	user: AuthUser | null;
	loading: boolean;
	login: (input: LoginInput) => Promise<AuthUser>;
	register: (input: RegisterInput) => Promise<AuthUser>;
	registerStudent: (input: StudentRegisterInput) => Promise<AuthUser>;
	/** Clears the session and navigates to `redirectTo` (default `/login`). Pass `false` to stay on the current page. */
	logout: (redirectTo?: string | false) => void;
	refreshUser: () => Promise<void>;
	setTokenQuota: (quota: StudentTokenQuota) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);

	const refreshUser = useCallback(async () => {
		const token = getStoredToken();
		if (!token) {
			setUser(null);
			return;
		}

		try {
			const res = await fetch(apiUrl("/api/auth/me"), { headers: authHeaders() });
			if (!res.ok) {
				clearStoredToken();
				setUser(null);
				return;
			}

			const data = (await res.json()) as { user: AuthUser };
			setStoredUserId(data.user.id);
			setUser(data.user);
		} catch {
			setUser(null);
		}
	}, []);

	useEffect(() => {
		void refreshUser().finally(() => setLoading(false));
	}, [refreshUser]);

	const login = useCallback(async (input: LoginInput) => {
		const res = await fetch(apiUrl("/api/auth/login"), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});
		const data = (await res.json()) as AuthResponse & { error?: string };
		if (!res.ok) throw new Error(data.error ?? "Login failed.");
		setStoredToken(data.token);
		setStoredUserId(data.user.id);
		setUser(data.user);
		return data.user;
	}, []);

	const register = useCallback(async (input: RegisterInput) => {
		const res = await fetch(apiUrl("/api/auth/register"), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});
		const data = (await res.json()) as AuthResponse & { error?: string };
		if (!res.ok) throw new Error(data.error ?? "Registration failed.");
		setStoredToken(data.token);
		setStoredUserId(data.user.id);
		setUser(data.user);
		return data.user;
	}, []);

	const registerStudent = useCallback(async (input: StudentRegisterInput) => {
		const res = await fetch(apiUrl("/api/auth/register-student"), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});
		const data = (await res.json()) as AuthResponse & { error?: string };
		if (!res.ok) throw new Error(data.error ?? "Registration failed.");
		setStoredToken(data.token);
		setStoredUserId(data.user.id);
		setUser(data.user);
		return data.user;
	}, []);

	const logout = useCallback((redirectTo?: string | false) => {
		clearStoredToken();
		setUser(null);
		// Call sites may use onClick={logout}; React then passes a SyntheticEvent.
		// Only treat real string | false as a redirect override.
		const dest =
			redirectTo === false ? false : typeof redirectTo === "string" ? redirectTo : "/login";
		if (dest === false) return;
		// Hard navigate so protected shells never stick on a blank "Loading…" state
		// after the session is cleared (App Router soft replace can fail mid-unmount).
		window.location.assign(dest);
	}, []);

	const setTokenQuota = useCallback((quota: StudentTokenQuota) => {
		setUser((prev) => (prev ? { ...prev, tokenQuota: quota } : null));
	}, []);

	const value = useMemo(
		() => ({ user, loading, login, register, registerStudent, logout, refreshUser, setTokenQuota }),
		[user, loading, login, register, registerStudent, logout, refreshUser, setTokenQuota],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider.");
	return ctx;
}
