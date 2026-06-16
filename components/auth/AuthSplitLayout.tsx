import Link from "next/link";

import { APP_NAME } from "@/lib/brand";

type HeroFeature = {
	icon: React.ReactNode;
	text: string;
};

export type AuthHeroContent = {
	eyebrow: string;
	title: string;
	lead: string;
	features: HeroFeature[];
};

const LOGIN_HERO: AuthHeroContent = {
	eyebrow: "Research excellence",
	title: "Built for Nigeria's higher education",
	lead: `${APP_NAME} helps students and lecturers write research papers, build literature reviews, verify citations, and deliver publication-ready work — from undergraduate projects to postgraduate theses.`,
	features: [
		{
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" strokeLinecap="round" />
				</svg>
			),
			text: "Search arXiv, Semantic Scholar, and Crossref in one place",
		},
		{
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
					<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			),
			text: "AI-synthesized literature reviews with grounded citations",
		},
		{
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
					<path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			),
			text: "Citation verification you can trust",
		},
	],
};

export const REGISTER_HERO: AuthHeroContent = {
	eyebrow: "Get started free",
	title: "Your governed research workspace awaits",
	lead: `Create your ${APP_NAME} account to access tools shaped for Nigerian universities, polytechnics, and colleges of education — whether you are writing a first-year project or supervising postgraduate research.`,
	features: [
		{
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeLinejoin="round" />
					<path d="M6 12v5c3 3 9 3 12 0v-5" strokeLinejoin="round" />
				</svg>
			),
			text: "Student accounts for papers, reviews, and thesis support",
		},
		{
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="M3 21h18M5 21V7l8-4v18M13 21V3l6 3v15" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			),
			text: "Lecturer accounts for lecture planning and research oversight",
		},
		{
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
					<path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			),
			text: "Institution-linked profiles with governed, citation-ready AI",
		},
	],
};

type Props = {
	title: string;
	subtitle: string;
	children: React.ReactNode;
	footer: React.ReactNode;
	wide?: boolean;
	hero?: AuthHeroContent;
	/** Root page class (defaults to `login-page`). */
	pageClassName?: string;
	/** Hero background image. Pass `null` for gradient-only hero. */
	heroImage?: string | null;
	/** Optional badge shown above the form title. */
	badge?: React.ReactNode;
};

const DEFAULT_HERO_IMAGE = "/images/auth-scholar-research.png";

export function AuthSplitLayout({
	title,
	subtitle,
	children,
	footer,
	wide,
	hero = LOGIN_HERO,
	pageClassName = "login-page",
	heroImage = DEFAULT_HERO_IMAGE,
	badge,
}: Props) {
	return (
		<div className={pageClassName}>
			<div className="login-layout">
				<main className={`login-form-panel${wide ? " login-form-panel-wide" : ""}`}>
					<div className={`login-form-inner${wide ? " login-form-inner-wide" : ""}`}>
						<Link href="/" className="login-brand">
							<span className="login-brand-icon" aria-hidden>
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
									<path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeLinejoin="round" />
									<path d="M6 12v5c3 3 9 3 12 0v-5" strokeLinejoin="round" />
								</svg>
							</span>
							<span className="login-brand-name">{APP_NAME}</span>
						</Link>

						<div className="login-form-card">
							<div className="login-form-head">
								{badge}
								<h1>{title}</h1>
								<p>{subtitle}</p>
							</div>

							{children}
						</div>

						<div className="login-form-links">{footer}</div>
					</div>
				</main>

				<aside className="login-hero-panel" aria-label="Platform overview">
					{heroImage ? (
						<img className="login-hero-bg" src={heroImage} alt="" aria-hidden />
					) : null}
					<div className="login-hero-overlay" aria-hidden />

					<div className="login-hero-inner">
						<p className="login-hero-eyebrow">{hero.eyebrow}</p>
						<h2 className="login-hero-title">{hero.title}</h2>
						<p className="login-hero-lead">{hero.lead}</p>

						<ul className="login-hero-features">
							{hero.features.map((feature) => (
								<li key={feature.text}>
									<span className="login-hero-feature-icon" aria-hidden>
										{feature.icon}
									</span>
									{feature.text}
								</li>
							))}
						</ul>
					</div>
				</aside>
			</div>
		</div>
	);
}
