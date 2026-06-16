"use client";

import { StudentTokenQuotaBar } from "@/components/StudentTokenQuota";
import { SavedLessonsPanel } from "@/components/aula/SavedLessonsPanel";
import { SavedResearchPanel } from "@/components/aula/SavedResearchPanel";
import {
	SidebarBrand,
	SidebarNav,
	SidebarNavLink,
	SidebarProfile,
	SidebarSection,
} from "@/components/sidebar/SidebarPrimitives";
import { useAuth } from "@/hooks/useAuth";
import type { AuthUser } from "@/lib/auth";
import { AULA_ADMIN_ITEM, AULA_NAV_GROUPS, AULA_QUICK_ACCESS, type AulaNavItem } from "@/lib/aula-nav";

type Props = {
	user: AuthUser;
	id?: string;
	className?: string;
	onNavigate?: () => void;
};

function toolDescription(id: string): string | undefined {
	return AULA_QUICK_ACCESS.find((tool) => tool.id === id)?.description;
}

function AulaNavItemLink({ item, onNavigate }: { item: AulaNavItem; onNavigate?: () => void }) {
	return (
		<SidebarNavLink
			href={item.href}
			iconId={item.id}
			label={item.label}
			description={toolDescription(item.id)}
			badge={item.badge}
			onNavigate={onNavigate}
		/>
	);
}

export function AulaSidebar({ user, id, className, onNavigate }: Props) {
	const { logout } = useAuth();
	const groups = [...AULA_NAV_GROUPS];
	if (user.role === "admin") {
		groups[0] = {
			...groups[0]!,
			items: [...groups[0]!.items, AULA_ADMIN_ITEM],
		};
	}

	const roleBadge = user.role === "admin" ? "Admin" : "Lecturer";

	return (
		<aside
			id={id}
			className={className ? `aula-sidebar app-sidebar ${className}` : "aula-sidebar app-sidebar"}
			aria-label="Dashboard navigation"
		>
			<SidebarBrand href="/dashboard" badge={roleBadge} onNavigate={onNavigate} />

			<div className="sb-scroll">
				{groups.map((group) => (
					<SidebarSection key={group.id} label={group.label}>
						<SidebarNav>
							{group.items.map((item) => (
								<AulaNavItemLink key={item.id} item={item} onNavigate={onNavigate} />
							))}
						</SidebarNav>
					</SidebarSection>
				))}

				<SidebarSection label="Library">
					<SidebarNav>
						<SavedLessonsPanel onNavigate={onNavigate} />
						<SavedResearchPanel onNavigate={onNavigate} />
					</SidebarNav>
				</SidebarSection>
			</div>

			<SidebarProfile user={user} onLogout={logout}>
				{user.role === "lecturer" && <StudentTokenQuotaBar quota={user.tokenQuota} role={user.role} />}
			</SidebarProfile>
		</aside>
	);
}
