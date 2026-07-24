import Link from "next/link";

import { AuthSplitLayout, type AuthHeroContent } from "@/components/auth/AuthSplitLayout";
import { APP_NAME } from "@/lib/brand";

const SUPER_ADMIN_LOGIN_HERO: AuthHeroContent = {
	eyebrow: "Platform",
	title: "Super administrator",
	lead: `Onboard universities and manage institutional admins across the entire ${APP_NAME} platform.`,
	features: [
		{
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			),
			text: "Onboard and activate universities",
		},
		{
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
					<circle cx="9" cy="7" r="4" />
					<path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			),
			text: "Create university administrators",
		},
		{
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
					<path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			),
			text: "Control platform-wide access",
		},
	],
};

type Props = {
	children: React.ReactNode;
};

export function SuperAdminLoginPageLayout({ children }: Props) {
	return (
		<AuthSplitLayout
			pageClassName="admin-login-page super-admin-login-page"
			title="Super admin sign in"
			subtitle="Platform credentials only. University admins should use the institutional admin login."
			hero={SUPER_ADMIN_LOGIN_HERO}
			heroImage={null}
			badge={
				<span className="admin-login-badge">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
					</svg>
					Platform access
				</span>
			}
			footer={
				<>
					<p>
						University admin?{" "}
						<Link href="/admin/login" className="login-link">
							Institutional sign in
						</Link>
					</p>
					<p className="admin-login-footnote">Authorised platform personnel only. All access is logged.</p>
				</>
			}
		>
			{children}
		</AuthSplitLayout>
	);
}
