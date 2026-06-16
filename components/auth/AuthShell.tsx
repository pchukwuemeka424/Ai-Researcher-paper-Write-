import Link from "next/link";

import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

type Props = {
	mode: "login" | "register" | "admin-login";
	title: string;
	subtitle: string;
	children: React.ReactNode;
	footer: React.ReactNode;
	/** Place the sign-in form on the left (brand panel on the right). */
	formPosition?: "left" | "right";
	/** Full-bleed background image for the brand panel (login hero). */
	heroImage?: string;
};

const FEATURES = [
	"Governed AI for university research",
	"Secure workspace for ideas & papers",
	"Role-based access for staff & students",
];

const ADMIN_FEATURES = [
	"Manage users, roles & access",
	"Oversee all saved lectures",
	"Monitor research token usage",
];

export function AuthShell({
	mode,
	title,
	subtitle,
	children,
	footer,
	formPosition = "right",
	heroImage,
}: Props) {
	const isAdmin = mode === "admin-login";
	const features = isAdmin ? ADMIN_FEATURES : FEATURES;
	const panelEyebrow = isAdmin ? "Administration" : mode === "login" ? "Welcome back" : "Get started";
	const panelTitle = isAdmin
		? "Sign in to the admin console"
		: mode === "login"
			? "Sign in to your workspace"
			: "Create your university account";
	const layoutClass = [
		"auth-layout",
		formPosition === "left" ? "auth-layout-form-left" : "",
		heroImage ? "auth-layout-pro" : "",
	]
		.filter(Boolean)
		.join(" ");

	const brandPanelClass = [
		"auth-panel",
		"auth-panel-brand",
		heroImage ? "auth-panel-brand-hero" : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={`auth-page${heroImage ? " auth-page-pro" : ""}`}>
			<div className={layoutClass}>
				<aside className={brandPanelClass} aria-hidden={false}>
					{heroImage ? (
						<>
							<img className="auth-panel-hero-bg" src={heroImage} alt="" aria-hidden />
							<div className="auth-panel-hero-overlay" aria-hidden />
						</>
					) : null}
					<div className="auth-panel-brand-inner">
						{!heroImage ? (
							<Link href="/" className="auth-brand-link">
								<span className="auth-brand-mark" aria-hidden>
									<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M12 2 2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
										<path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinejoin="round" />
									</svg>
								</span>
								<span className="auth-brand-name">{APP_NAME}</span>
							</Link>
						) : null}

						<div className="auth-panel-copy">
							<p className="auth-panel-eyebrow">{panelEyebrow}</p>
							<h1 className="auth-panel-title">{panelTitle}</h1>
							<p className="auth-panel-lead">{APP_TAGLINE}</p>
						</div>

						<ul className="auth-feature-list">
							{features.map((feature) => (
								<li key={feature}>
									<span className="auth-feature-check" aria-hidden>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
											<path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
									</span>
									{feature}
								</li>
							))}
						</ul>

						<p className="auth-panel-footnote">© {new Date().getFullYear()} TrustLed AI Ltd</p>
					</div>
				</aside>

				<main className="auth-panel auth-panel-form">
					<div className="auth-form-shell">
						{heroImage ? (
							<Link href="/" className="auth-form-brand">
								<span className="auth-brand-mark auth-brand-mark-light" aria-hidden>
									<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M12 2 2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
										<path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinejoin="round" />
									</svg>
								</span>
								<span className="auth-form-brand-name">{APP_NAME}</span>
							</Link>
						) : null}
						<div className="auth-form-head">
							<h2>{title}</h2>
							<p>{subtitle}</p>
						</div>
						{children}
						<p className="auth-form-footer">{footer}</p>
					</div>
				</main>
			</div>
		</div>
	);
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<Link href={href} className="auth-link">
			{children}
		</Link>
	);
}
