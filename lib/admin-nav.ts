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

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
	{
		id: "main",
		label: "Main",
		items: [
			{
				id: "admin-overview",
				label: "Overview",
				href: "/admin",
				iconId: "dashboard",
				description: "Platform metrics & activity",
			},
			{
				id: "admin-governance",
				label: "AI Governance",
				href: "/admin/governance",
				iconId: "governance",
				description: "University-wide AI use in research",
			},
			{
				id: "admin-users",
				label: "Accounts",
				href: "/admin/users",
				iconId: "users",
				description: "Manage users, roles & access",
			},
		],
	},
	{
		id: "governance",
		label: "Governance",
		items: [
			{
				id: "admin-analytics",
				label: "Usage analytics",
				href: "/admin/analytics",
				iconId: "analytics",
				description: "By faculty, department, programme & cohort",
			},
			{
				id: "admin-policies",
				label: "Policy engine",
				href: "/admin/policies",
				iconId: "policy",
				description: "Permit, restrict, or block by role & faculty",
			},
			{
				id: "admin-audit",
				label: "Audit & alerts",
				href: "/admin/audit",
				iconId: "audit",
				description: "Immutable logs, flags & risk alerts",
			},
			{
				id: "admin-approvals",
				label: "Approvals",
				href: "/admin/approvals",
				iconId: "approvals",
				description: "Tools, datasets & use-case workflows",
			},
			{
				id: "admin-risks",
				label: "Risk register",
				href: "/admin/risks",
				iconId: "risk",
				description: "Inherent & residual AI risk scores",
			},
			{
				id: "admin-compliance",
				label: "Compliance",
				href: "/admin/compliance",
				iconId: "compliance",
				description: "Nigeria AI Act, NDPA & institutional controls",
			},
			{
				id: "admin-incidents",
				label: "Incidents",
				href: "/admin/incidents",
				iconId: "incident",
				description: "Policy breaches & sensitive-data events",
			},
			{
				id: "admin-inventory",
				label: "AI inventory",
				href: "/admin/inventory",
				iconId: "inventory",
				description: "Systems register, risk tiers & DPIAs",
			},
			{
				id: "admin-reports",
				label: "Reports",
				href: "/admin/reports",
				iconId: "reports",
				description: "Management & Senate governance packs",
			},
		],
	},
	{
		id: "content",
		label: "Content",
		items: [
			{
				id: "admin-lectures",
				label: "Lectures",
				href: "/admin/lectures",
				iconId: "lesson-planner",
				description: "Course plans & slide decks",
			},
			{
				id: "admin-sessions",
				label: "Sessions",
				href: "/admin/sessions",
				iconId: "sessions",
				description: "Research session activity",
			},
		],
	},
	{
		id: "billing",
		label: "Usage",
		items: [
			{
				id: "admin-tokens",
				label: "Tokens",
				href: "/admin/tokens",
				iconId: "tokens",
				description: "Token quotas & consumption",
			},
		],
	},
	{
		id: "system",
		label: "System",
		items: [
			{
				id: "admin-backup",
				label: "Backup",
				href: "/admin/backup",
				iconId: "database",
				description: "Database tables & backup files",
			},
		],
	},
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

export function adminHrefPath(href: string): string {
	return href.split("#")[0] ?? href;
}

export function isAdminNavActive(pathname: string, href: string): boolean {
	const path = adminHrefPath(href);
	if (path === "/admin") return pathname === "/admin";
	return pathname === path || pathname.startsWith(`${path}/`);
}
