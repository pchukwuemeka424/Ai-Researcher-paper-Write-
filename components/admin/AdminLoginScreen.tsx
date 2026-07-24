"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminLoginPageLayout } from "@/components/admin/AdminLoginPageLayout";
import { AuthField } from "@/components/auth/AuthField";
import { useAuth } from "@/hooks/useAuth";
import { isAdminConsoleRole, isSuperAdmin } from "@/lib/admin-roles";
import { SUPER_ADMIN_HOME_PATH, SUPER_ADMIN_LOGIN_PATH } from "@/lib/admin-nav";

export function AdminLoginScreen() {
	const router = useRouter();
	const { user, loading, login, logout } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (loading || !user) return;
		if (isSuperAdmin(user.role)) {
			router.replace(SUPER_ADMIN_HOME_PATH);
			return;
		}
		if (isAdminConsoleRole(user.role)) router.replace("/admin");
	}, [loading, user, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			const loggedIn = await login({ email, password });
			if (isSuperAdmin(loggedIn.role)) {
				logout(false);
				throw new Error(
					`Super administrators must sign in at ${SUPER_ADMIN_LOGIN_PATH}.`,
				);
			}
			if (!isAdminConsoleRole(loggedIn.role)) {
				logout(false);
				throw new Error("This account does not have university admin access.");
			}
			router.push("/admin");
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<AdminLoginPageLayout>
			<form className="login-form" onSubmit={handleSubmit} noValidate>
				<div className="login-form-fields">
					<AuthField
						id="admin-login-email"
						label="University admin email"
						type="email"
						placeholder="admin@youruniversity.edu.ng"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						autoComplete="email"
						required
					/>

					<AuthField
						id="admin-login-password"
						label="Password"
						type="password"
						placeholder="Enter your password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						autoComplete="current-password"
						required
					/>
				</div>

				{error && (
					<div className="login-alert login-alert-error" role="alert">
						{error}
					</div>
				)}

				<button type="submit" className="login-btn" disabled={submitting || loading}>
					{submitting ? "Signing in…" : "Sign in to admin"}
				</button>
			</form>
		</AdminLoginPageLayout>
	);
}
