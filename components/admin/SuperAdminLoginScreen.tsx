"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SuperAdminLoginPageLayout } from "@/components/admin/SuperAdminLoginPageLayout";
import { AuthField } from "@/components/auth/AuthField";
import { useAuth } from "@/hooks/useAuth";
import { SUPER_ADMIN_HOME_PATH } from "@/lib/admin-nav";
import { isSuperAdmin } from "@/lib/admin-roles";

export function SuperAdminLoginScreen() {
	const router = useRouter();
	const { user, loading, login, logout } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!loading && user && isSuperAdmin(user.role)) {
			router.replace(SUPER_ADMIN_HOME_PATH);
		}
	}, [loading, user, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			const loggedIn = await login({ email, password });
			if (!isSuperAdmin(loggedIn.role)) {
				logout(false);
				throw new Error(
					"This account is not a super administrator. Use /admin/login for university admins.",
				);
			}
			router.push(SUPER_ADMIN_HOME_PATH);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<SuperAdminLoginPageLayout>
			<form className="login-form" onSubmit={handleSubmit} noValidate>
				<div className="login-form-fields">
					<AuthField
						id="super-admin-login-email"
						label="Super admin email"
						type="email"
						placeholder="admin@aula.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						autoComplete="email"
						required
					/>

					<AuthField
						id="super-admin-login-password"
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
					{submitting ? "Signing in…" : "Sign in to platform"}
				</button>
			</form>
		</SuperAdminLoginPageLayout>
	);
}
