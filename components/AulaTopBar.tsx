"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavIcon } from "@/components/aula/NavIcon";
import { IconPlus } from "@/components/lesson-planner/LessonPlannerIcons";
import { AULA_TOPBAR_NAV, aulaTopbarContext, isAulaTopbarItemActive, type AulaTopbarNavItem } from "@/lib/aula-nav";

type Props = {
	onMenuClick: () => void;
};

function TopbarNavLink({ item }: { item: AulaTopbarNavItem }) {
	const pathname = usePathname() ?? "";
	const active = isAulaTopbarItemActive(pathname, item);

	return (
		<Link
			href={item.href}
			className={`aula-topbar-nav-link${active ? " aula-topbar-nav-link-active" : ""}`}
			aria-current={active ? "page" : undefined}
		>
			<span className="aula-topbar-nav-icon" aria-hidden>
				<NavIcon id={item.id} size={15} />
			</span>
			{item.label}
		</Link>
	);
}

export function AulaTopBar({ onMenuClick }: Props) {
	const pathname = usePathname() ?? "";
	const { title, tagline, cta } = aulaTopbarContext(pathname);

	return (
		<header className="aula-topbar">
			<button type="button" className="aula-menu-btn" aria-label="Open navigation" onClick={onMenuClick}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
					<path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
				</svg>
			</button>

			<div className="aula-topbar-body">
				<div className="aula-topbar-brand">
					<div className="aula-topbar-brand-text">
						<p className="aula-topbar-title">{title}</p>
						<p className="aula-topbar-tagline">{tagline}</p>
					</div>
				</div>

				<nav className="aula-topbar-nav" aria-label="Workspace">
					{AULA_TOPBAR_NAV.map((item) => (
						<TopbarNavLink key={item.id} item={item} />
					))}
				</nav>
			</div>

			<Link href={cta.href} className="aula-topbar-cta">
				<IconPlus size={16} />
				{cta.label}
			</Link>
		</header>
	);
}
