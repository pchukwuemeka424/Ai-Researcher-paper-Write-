"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminLoginPageLayout } from "@/components/admin/AdminLoginPageLayout";
import { AuthField } from "@/components/auth/AuthField";
import { useAuth } from "@/hooks/useAuth";

export function AdminLoginScreen() {
	const router = useRouter();
	const { user, loading, login, logout } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!loading && user?.role === "admin") router.replace("/admin");
	}, [loading, user, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			const loggedIn = await login({ email, password });
			if (loggedIn.role !== "admin") {
				logout(false);
				throw new Error("This account does not have admin access.");
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
						label="Admin email"
						type="email"
						placeholder="admin@aula.com"
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
