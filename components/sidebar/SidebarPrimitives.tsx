"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { NavIcon } from "@/components/aula/NavIcon";
import type { AuthUser } from "@/lib/auth";
import { userInitials } from "@/lib/aula-utils";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

import { navIconTone } from "@/lib/colors";

function BrandMark() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<path d="M12 2 2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
			<path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinejoin="round" />
		</svg>
	);
}

export function SidebarBrand({
	href,
	badge,
	onNavigate,
}: {
	href: string;
	badge?: string;
	onNavigate?: () => void;
}) {
	return (
		<div className="sb-header">
			<Link href={href} className="sb-brand" onClick={onNavigate}>
				<span className="sb-brand-mark" aria-hidden>
					<BrandMark />
				</span>
				<span className="sb-brand-text">
					<span className="sb-brand-row">
						<span className="sb-brand-name">{APP_NAME}</span>
						{badge && <span className="sb-brand-badge">{badge}</span>}
					</span>
					<span className="sb-brand-tagline">{APP_TAGLINE}</span>
				</span>
			</Link>
		</div>
	);
}

export function SidebarSection({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="sb-section">
			<p className="sb-section-label">{label}</p>
			{children}
		</div>
	);
}

export function SidebarNavLink({
	href,
	iconId,
	label,
	description,
	badge,
	active,
	onNavigate,
}: {
	href: string;
	iconId: string;
	label: string;
	description?: string;
	badge?: string;
	active?: boolean;
	onNavigate?: () => void;
}) {
	const tone = navIconTone(iconId);

	return (
		<Link
			href={href}
			className={`sb-link${active ? " sb-link-active" : ""}`}
			onClick={onNavigate}
			style={
				{
					"--sb-icon-bg": tone.bg,
					"--sb-icon-fg": tone.fg,
				} as CSSProperties
			}
		>
			<span className="sb-link-icon" aria-hidden>
				<NavIcon id={iconId} size={18} />
			</span>
			<span className="sb-link-text">
				<span className="sb-link-label">{label}</span>
				{description && <span className="sb-link-desc">{description}</span>}
			</span>
			{badge && <span className="sb-link-badge">{badge}</span>}
		</Link>
	);
}

export function SidebarNav({ children }: { children: ReactNode }) {
	return <nav className="sb-nav">{children}</nav>;
}

export function SidebarProfile({
	user,
	onLogout,
	children,
}: {
	user: AuthUser;
	onLogout?: () => void;
	children?: ReactNode;
}) {
	const initials = userInitials(user.name);
	const meta = [user.department, user.institution].filter(Boolean).join(" · ");

	return (
		<div className="sb-footer">
			{children}
			<div className="sb-profile">
				<span className="sb-profile-avatar" aria-hidden>
					{initials}
				</span>
				<div className="sb-profile-info">
					<p className="sb-profile-name">{user.name}</p>
					<p className="sb-profile-email">{user.email}</p>
					{meta && <p className="sb-profile-meta">{meta}</p>}
				</div>
			</div>
			{onLogout && (
				<button type="button" className="sb-signout" onClick={onLogout}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
					Sign out
				</button>
			)}
			<p className="sb-copy">© {new Date().getFullYear()} TrustLed AI Ltd</p>
		</div>
	);
}
