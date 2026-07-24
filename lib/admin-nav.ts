export type AdminNavItem = {
	id: string;
	label: string;
	href: string;
	iconId: string;
	description?: string;
};

export type AdminNavGroup = {
	id: string;
	label: string;
	items: AdminNavItem[];
};

export const ADMIN_LOGIN_PATH = "/admin/login";
export const SUPER_ADMIN_LOGIN_PATH = "/super-admin/login";
export const SUPER_ADMIN_HOME_PATH = "/super-admin";

/** University admin console — scoped to one institution's users. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
	{
		id: "users",
		label: "Users",
		items: [
			{
				id: "admin-overview",
				label: "Users overview",
				href: "/admin",
				iconId: "dashboard",
				description: "Account health, roles & org coverage",
			},
			{
				id: "admin-users",
				label: "Account management",
				href: "/admin/users",
				iconId: "users",
				description: "Create, assign roles, activate & suspend",
			},
		],
	},
	{
		id: "activity",
		label: "User activity",
		items: [
			{
				id: "admin-analytics",
				label: "User activity",
				href: "/admin/analytics",
				iconId: "analytics",
				description: "Usage by user, role, faculty & programme",
			},
			{
				id: "admin-tokens",
				label: "User tokens",
				href: "/admin/tokens",
				iconId: "tokens",
				description: "Per-user quotas, usage & resets",
			},
			{
				id: "admin-audit",
				label: "User audit log",
				href: "/admin/audit",
				iconId: "audit",
				description: "Immutable actions by account",
			},
		],
	},
	{
		id: "safety",
		label: "User safety",
		items: [
			{
				id: "admin-alerts",
				label: "User alerts",
				href: "/admin/alerts",
				iconId: "alert",
				description: "Login, usage & policy alerts per user",
			},
			{
				id: "admin-incidents",
				label: "User incidents",
				href: "/admin/incidents",
				iconId: "incident",
				description: "Investigate incidents involving users",
			},
			{
				id: "admin-policies",
				label: "Role access policies",
				href: "/admin/policies",
				iconId: "policy",
				description: "Policies targeting roles & faculties",
			},
			{
				id: "admin-reports",
				label: "User reports",
				href: "/admin/reports",
				iconId: "reports",
				description: "Activity, token & compliance reports",
			},
		],
	},
	{
		id: "userdata",
		label: "User data",
		items: [
			{
				id: "admin-contributions",
				label: "User AI disclosures",
				href: "/admin/contributions",
				iconId: "contribution",
				description: "AI contribution statements by user",
			},
			{
				id: "admin-provenance",
				label: "User provenance",
				href: "/admin/provenance",
				iconId: "provenance",
				description: "Prompt history owned by users",
			},
			{
				id: "admin-privacy",
				label: "User privacy rules",
				href: "/admin/privacy",
				iconId: "privacy",
				description: "Access & consent by role / faculty",
			},
			{
				id: "admin-retention",
				label: "User data retention",
				href: "/admin/retention",
				iconId: "retention",
				description: "Retention policies & subject deletion",
			},
		],
	},
];

/** Platform super admin console — universities and university admins. */
export const SUPER_ADMIN_NAV_GROUPS: AdminNavGroup[] = [
	{
		id: "platform",
		label: "Platform",
		items: [
			{
				id: "super-overview",
				label: "Platform overview",
				href: "/super-admin",
				iconId: "dashboard",
				description: "Onboarded universities and admin coverage",
			},
			{
				id: "super-universities",
				label: "Universities",
				href: "/super-admin/universities",
				iconId: "dashboard",
				description: "Onboard and activate universities",
			},
			{
				id: "super-admins",
				label: "University admins",
				href: "/super-admin/admins",
				iconId: "users",
				description: "Create and manage university admins",
			},
		],
	},
];

export function adminNavGroupsForRole(role: string | null | undefined): AdminNavGroup[] {
	if (role === "admin") return SUPER_ADMIN_NAV_GROUPS;
	return ADMIN_NAV_GROUPS;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

export function adminHrefPath(href: string): string {
	return href.split("#")[0] ?? href;
}

export function isAdminNavActive(pathname: string, href: string): boolean {
	const path = adminHrefPath(href);
	if (path === "/admin" || path === "/super-admin") return pathname === path;
	return pathname === path || pathname.startsWith(`${path}/`);
}
