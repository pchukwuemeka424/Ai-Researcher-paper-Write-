"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TopbarDecoBubbles } from "@/components/TopbarDecoBubbles";
import { IconLogOut } from "@/components/ui/ButtonIcon";
import { useAuth } from "@/hooks/useAuth";
import { userInitials } from "@/lib/aula-utils";
import { STUDENT_NAV_ITEMS } from "@/lib/student-nav";

type Props = {
	onMenuClick: () => void;
};

function pageTitle(pathname: string): string {
	const match = STUDENT_NAV_ITEMS.find(
		(item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
	);
	return match?.label ?? "Dashboard";
}

export function StudentTopBar({ onMenuClick }: Props) {
	const pathname = usePathname();
	const { user, logout } = useAuth();

	if (!user) return null;

	const initials = userInitials(user.name);
	const title = pageTitle(pathname);

	return (
		<header className="stu-topbar">
			<TopbarDecoBubbles />
			<div className="stu-topbar-start">
				<button type="button" className="stu-topbar-menu" aria-label="Open navigation" onClick={onMenuClick}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
						<path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
					</svg>
				</button>
				<div className="stu-topbar-titles">
					<p className="stu-topbar-eyebrow">Student workspace</p>
					<h1 className="stu-topbar-title">{title}</h1>
				</div>
			</div>

			<div className="stu-topbar-end">
				<LinkButton href="/student/research" label="New research" />

				<div className="stu-topbar-user">
					<div className="stu-topbar-user-text">
						<span className="stu-topbar-user-name">{user.name}</span>
						<span className="stu-topbar-user-meta">
							{user.department ?? "Student"}
							{user.institution ? ` · ${user.institution}` : ""}
						</span>
					</div>
					<span className="stu-topbar-avatar" aria-hidden>
						{initials}
					</span>
				</div>

				<button type="button" className="stu-topbar-signout" onClick={logout}>
					<IconLogOut size={16} />
					Sign out
				</button>
			</div>
		</header>
	);
}

function LinkButton({ href, label }: { href: string; label: string }) {
	return (
		<Link href={href} className="stu-topbar-action">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
				<path d="M12 5v14M5 12h14" strokeLinecap="round" />
			</svg>
			{label}
		</Link>
	);
}
