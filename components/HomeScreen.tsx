"use client";

import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";
import { APP_NAME } from "@/lib/brand";

const INSTITUTIONS = [
	{ label: "Universities", icon: "building" },
	{ label: "Colleges of Education", icon: "book" },
	{ label: "Polytechnics", icon: "landmark" },
	{ label: "Lecturers", icon: "presentation" },
] as const;

const WORKFLOWS = [
	"Literature Review",
	"Research Paper",
	"Citation Audit",
	"Study Comparison",
	"Research Gap",
	"Thesis",
	"Proposal",
] as const;

const PLATFORM_FEATURES = [
	{
		title: "Deep Research",
		description: "Search arXiv, Semantic Scholar, and Crossref simultaneously.",
		icon: "search",
	},
	{
		title: "Literature Reviews",
		description: "AI-synthesized reviews with grounded citations.",
		icon: "file",
	},
	{
		title: "Citation Verification",
		description: "Trust layer that validates every reference.",
		icon: "shield",
	},
	{
		title: "Research Memory",
		description: "Long-term continuity across sessions.",
		icon: "brain",
	},
	{
		title: "Multi-Agent Workflows",
		description: "Specialized agents orchestrated intelligently.",
		icon: "sparkles",
	},
	{
		title: "Source-Grounded Writing",
		description: "Never hallucinate — only verified evidence.",
		icon: "check",
	},
] as const;

const LECTURER_POINTS = [
	"Integrated lecture planner for course preparation",
	"Research paper and project writing support for students",
	"Citation verification for thesis and dissertation work",
] as const;

const FAQS = [
	{
		question: `Does ${APP_NAME} require GPU infrastructure?`,
		answer: "No. The platform is CPU-friendly and uses cloud APIs for all AI operations.",
	},
	{
		question: "Which citation styles are supported?",
		answer: "APA, MLA, IEEE, and Harvard formats with automatic bibliography generation.",
	},
	{
		question: "Can universities deploy this?",
		answer: "Yes. The lightweight architecture runs without Docker and scales with your institution.",
	},
] as const;

const HERO_STATS = [
	{ value: "Papers", label: "Research writing" },
	{ value: "Projects", label: "Student support" },
	{ value: "100%", label: "Citation verification" },
] as const;

function FeatureIcon({ name }: { name: string }) {
	const props = {
		width: 28,
		height: 28,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 1.8,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		"aria-hidden": true,
	};

	switch (name) {
		case "search":
			return (
				<svg {...props}>
					<circle cx="11" cy="11" r="7" />
					<path d="m21 21-4.3-4.3" />
				</svg>
			);
		case "file":
			return (
				<svg {...props}>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
				</svg>
			);
		case "shield":
			return (
				<svg {...props}>
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
				</svg>
			);
		case "brain":
			return (
				<svg {...props}>
					<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
					<path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
				</svg>
			);
		case "sparkles":
			return (
				<svg {...props}>
					<path d="m12 3-1.9 5.8H4.4L10 13.2 8.1 19 12 15.4 15.9 19 14 13.2l5.6-4.4h-6.1L12 3Z" />
				</svg>
			);
		default:
			return (
				<svg {...props}>
					<path d="M20 6 9 17l-5-5" />
				</svg>
			);
	}
}

function InstitutionIcon({ name }: { name: string }) {
	const props = {
		width: 14,
		height: 14,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 1.8,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		"aria-hidden": true,
	};

	switch (name) {
		case "book":
			return (
				<svg {...props}>
					<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
					<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
				</svg>
			);
		case "landmark":
			return (
				<svg {...props}>
					<path d="M3 21h18" />
					<path d="M6 21V7l6-4 6 4v14" />
					<path d="M10 21v-4h4v4" />
				</svg>
			);
		case "presentation":
			return (
				<svg {...props}>
					<path d="M2 3h20" />
					<path d="M12 3v18" />
					<path d="m7 8 5-5 5 5" />
				</svg>
			);
		default:
			return (
				<svg {...props}>
					<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
					<path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
					<path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
					<path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
				</svg>
			);
	}
}

export function HomeScreen() {
	const { user, loading, logout } = useAuth();

	return (
		<div className="home-page">
			<header className="home-header">
				<div className="home-header-inner">
					<Link href="/" className="home-logo">
						<span className="home-logo-icon" aria-hidden>
							<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
								<path d="M22 10v6M2 10l10-5 10 5-10 5z" />
								<path d="M6 12v5c3 3 9 3 12 0v-5" />
							</svg>
						</span>
						<span className="home-logo-text">{APP_NAME}</span>
					</Link>

					<nav className="home-header-actions" aria-label="Account">
						{loading ? (
							<span className="home-header-muted">Loading…</span>
						) : user ? (
							<>
								<span className="home-header-muted">{user.name}</span>
								<Link href="/dashboard" className="ghost-btn">
									Dashboard
								</Link>
								<button type="button" className="ghost-btn" onClick={logout}>
									Sign out
								</button>
							</>
						) : (
							<>
								<Link href="/login" className="home-header-link">
									Sign in
								</Link>
								<Link href="/register" className="primary-btn home-header-cta">
									Get Started
								</Link>
							</>
						)}
					</nav>
				</div>
			</header>

			<section className="home-hero-banner">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img className="home-hero-bg" src="/images/hero-researcher.png" alt="" aria-hidden />
				<div className="home-hero-overlay" aria-hidden />
				<div className="home-hero-content">
					<div className="home-hero-inner">
						<div className="home-institution-tags">
							{INSTITUTIONS.map((item) => (
								<span key={item.label} className="home-institution-tag">
									<InstitutionIcon name={item.icon} />
									{item.label}
								</span>
							))}
						</div>

						<h1 className="home-hero-title">
							{user ? (
								<>Welcome back, {user.name.split(" ")[0]}</>
							) : (
								<>
									Research Excellence for
									<br />
									Nigeria&apos;s Higher Education
								</>
							)}
						</h1>

						<p className="home-hero-lead">
							{user
								? "Pick up where you left off — open your workspace, continue research sessions, and manage student projects."
								: `${APP_NAME} helps Nigerian students and lecturers write research papers and complete academic projects. From undergraduate assignments to postgraduate theses, plan lectures, build literature reviews, verify citations, and deliver publication-ready work.`}
						</p>

						<div className="home-hero-actions">
							<Link href={user ? "/dashboard" : "/register"} className="primary-btn home-hero-cta">
								{user ? "Open workspace" : "Start Your Research"}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
									<path d="M5 12h14M12 5l7 7-7 7" />
								</svg>
							</Link>
							{!user && (
								<Link href="/login" className="home-hero-cta-outline">
									Sign In to Your Institution
								</Link>
							)}
						</div>

						<div className="home-hero-stats">
							{HERO_STATS.map((stat) => (
								<div key={stat.label} className="home-hero-stat">
									<p className="home-hero-stat-value">{stat.value}</p>
									<p className="home-hero-stat-label">{stat.label}</p>
								</div>
							))}
						</div>

						<div className="home-nuc-box">
							<p className="home-nuc-box-title">Built for NUC aligned institutions</p>
							<p className="home-nuc-box-text">
								Research papers, student projects, lectures, thesis, and dissertation support nationwide
							</p>
						</div>
					</div>
				</div>
			</section>

			<section className="home-section home-section-alt" id="workflows">
				<div className="home-section-inner home-split">
					<div className="home-split-copy">
						<h2 className="home-section-title">7 Research Workflows</h2>
						<p className="home-section-lead">
							From literature reviews to thesis proposals, {APP_NAME} guides Nigerian students through every
							stage of academic research with structured, evidence-grounded workflows.
						</p>
						<div className="home-workflow-tags">
							{WORKFLOWS.map((workflow) => (
								<span key={workflow} className="home-workflow-tag">
									{workflow}
								</span>
							))}
						</div>
					</div>
					<div className="home-media-frame">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src="/images/feature-workflows.png" alt="Nigerian university students working on research papers and academic projects" />
					</div>
				</div>
			</section>

			<section className="home-section">
				<div className="home-section-inner home-split home-split-reverse">
					<div className="home-media-frame">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src="/images/feature-portal.png" alt="Nigerian lecturer teaching and planning lectures in a classroom" />
					</div>
					<div className="home-split-copy">
						<h2 className="home-section-title">For Lecturers &amp; Students</h2>
						<p className="home-section-lead">
							Plan lectures, supervise student projects, and support research across universities, colleges of
							education, and polytechnics. {APP_NAME} helps lecturers prepare course content while students write
							stronger papers and complete projects with verified sources.
						</p>
						<ul className="home-checklist">
							{LECTURER_POINTS.map((point) => (
								<li key={point} className="home-checklist-item">
									<span className="home-checklist-icon" aria-hidden>
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M20 6 9 17l-5-5" />
										</svg>
									</span>
									{point}
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>

			<section className="home-section home-section-alt" id="features">
				<div className="home-section-inner">
					<div className="home-features-header">
						<div>
							<h2 className="home-section-title">Platform Features</h2>
							<p className="home-section-lead">
								Powerful AI tools built for rigorous academic standards at Nigerian institutions.
							</p>
						</div>
						<div className="home-media-frame home-media-frame-wide">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src="/images/feature-agent.png" alt="Nigerian postgraduate researchers reviewing academic literature in a university library" />
						</div>
					</div>

					<div className="home-features-grid">
						{PLATFORM_FEATURES.map((feature) => (
							<article key={feature.title} className="home-feature-tile">
								<span className="home-feature-tile-icon" aria-hidden>
									<FeatureIcon name={feature.icon} />
								</span>
								<h3>{feature.title}</h3>
								<p>{feature.description}</p>
							</article>
						))}
					</div>
				</div>
			</section>

			<section className="home-section home-faq-section" id="faq">
				<div className="home-section-inner home-faq">
					<h2 className="home-section-title home-faq-title">FAQ</h2>
					<div className="home-faq-list">
						{FAQS.map((faq) => (
							<details key={faq.question} className="home-faq-item">
								<summary>{faq.question}</summary>
								<p>{faq.answer}</p>
							</details>
						))}
					</div>
				</div>
			</section>

			<footer className="home-footer-simple">
				<p>© {new Date().getFullYear()} {APP_NAME}. Built for academic research.</p>
			</footer>
		</div>
	);
}
