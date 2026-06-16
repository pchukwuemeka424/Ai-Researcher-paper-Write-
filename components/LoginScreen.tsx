"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthField } from "@/components/auth/AuthField";
import { LoginPageLayout } from "@/components/login/LoginPageLayout";
import { useAuth } from "@/hooks/useAuth";
import { dashboardPathForRole } from "@/lib/dashboard-routes";

export function LoginScreen() {
	const router = useRouter();
	const { user, loading, login } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!loading && user) router.replace(dashboardPathForRole(user.role));
	}, [loading, user, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			const loggedIn = await login({ email, password });
			router.push(dashboardPathForRole(loggedIn.role));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<LoginPageLayout>
			<form className="login-form" onSubmit={handleSubmit} noValidate>
				<div className="login-form-fields">
					<AuthField
						id="login-email"
						label="Email"
						type="email"
						placeholder="name@university.edu"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						autoComplete="email"
						required
					/>

					<AuthField
						id="login-password"
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
					{submitting ? "Signing in…" : "Sign in"}
				</button>
			</form>
		</LoginPageLayout>
	);
}
