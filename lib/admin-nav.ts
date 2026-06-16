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
				id: "admin-users",
				label: "Accounts",
				href: "/admin/users",
				iconId: "users",
				description: "Manage users, roles & access",
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
