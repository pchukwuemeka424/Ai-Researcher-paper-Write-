"use client";

import { SavedResearchPanel } from "@/components/aula/SavedResearchPanel";
import { StudentTokenQuotaBar } from "@/components/StudentTokenQuota";
import {
	SidebarBrand,
	SidebarNav,
	SidebarNavLink,
	SidebarProfile,
	SidebarSection,
} from "@/components/sidebar/SidebarPrimitives";
import { useAuth } from "@/hooks/useAuth";
import type { AuthUser } from "@/lib/auth";
import { STUDENT_NAV_ITEMS } from "@/lib/student-nav";

type Props = {
	user: AuthUser;
	id?: string;
	className?: string;
	onNavigate?: () => void;
};

export function StudentSidebar({ user, id, className, onNavigate }: Props) {
	const { logout } = useAuth();

	return (
		<aside
			id={id}
			className={className ? `stu-sidebar app-sidebar ${className}` : "stu-sidebar app-sidebar"}
			aria-label="Student navigation"
		>
			<SidebarBrand href="/student/dashboard" badge="Student" onNavigate={onNavigate} />

			<div className="sb-scroll">
				<SidebarSection label="Workspace">
					<SidebarNav>
						{STUDENT_NAV_ITEMS.map((item) => (
							<SidebarNavLink
								key={item.id}
								href={item.href}
								iconId={item.id}
								label={item.label}
								description={item.description}
								onNavigate={onNavigate}
							/>
						))}
					</SidebarNav>
				</SidebarSection>

				<SidebarSection label="Library">
					<SidebarNav>
						<SavedResearchPanel variant="student" onNavigate={onNavigate} />
					</SidebarNav>
				</SidebarSection>

				<StudentTokenQuotaBar quota={user.tokenQuota} role={user.role} />
			</div>

			<SidebarProfile user={user} onLogout={logout} />
		</aside>
	);
}
