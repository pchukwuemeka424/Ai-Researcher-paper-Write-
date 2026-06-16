import Link from "next/link";

import { AuthSplitLayout, type AuthHeroContent } from "@/components/auth/AuthSplitLayout";
import { APP_NAME } from "@/lib/brand";

const ADMIN_LOGIN_HERO: AuthHeroContent = {
	eyebrow: "Administration",
	title: "Platform control centre",
	lead: `Manage users, oversee lectures, and monitor research token usage across your ${APP_NAME} deployment.`,
	features: [
		{
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
					<circle cx="9" cy="7" r="4" />
					<path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			),
			text: "Manage users, roles, and access",
		},
		{
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinejoin="round" />
					<path d="M8 7h8M8 11h6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			),
			text: "Oversee all saved course plans",
		},
		{
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
					<path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			),
			text: "Monitor and adjust research token usage",
		},
	],
};

type Props = {
	children: React.ReactNode;
};

export function AdminLoginPageLayout({ children }: Props) {
	return (
		<AuthSplitLayout
			pageClassName="admin-login-page"
			title="Admin sign in"
			subtitle="Use your administrator credentials. Only admin accounts can access the console."
			hero={ADMIN_LOGIN_HERO}
			heroImage={null}
			badge={
				<span className="admin-login-badge">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
					</svg>
					Restricted access
				</span>
			}
			footer={
				<>
					<p>
						Not an admin?{" "}
						<Link href="/login" className="login-link">
							Standard sign in
						</Link>
					</p>
					<p className="admin-login-footnote">Authorised personnel only. All access is logged.</p>
				</>
			}
		>
			{children}
		</AuthSplitLayout>
	);
}
