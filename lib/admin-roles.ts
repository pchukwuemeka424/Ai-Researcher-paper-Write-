/** Roles permitted to access the institutional admin / governance console. */
export const ADMIN_CONSOLE_ROLES = [
	"admin",
	"governance_admin",
	"faculty_admin",
	"auditor",
] as const;

export type AdminConsoleRole = (typeof ADMIN_CONSOLE_ROLES)[number];

export function isAdminConsoleRole(role: string | null | undefined): role is AdminConsoleRole {
	return Boolean(role && (ADMIN_CONSOLE_ROLES as readonly string[]).includes(role));
}

export function isSuperAdmin(role: string | null | undefined): boolean {
	return role === "admin";
}
