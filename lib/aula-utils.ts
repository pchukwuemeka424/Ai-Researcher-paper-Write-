import type { AuthUser } from "@/lib/auth";

export function userInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

export function roleDisplay(role: AuthUser["role"]): string {
	switch (role) {
		case "admin":
			return "Super Administrator";
		case "governance_admin":
			return "Governance Administrator";
		case "faculty_admin":
			return "Faculty Administrator";
		case "viewer":
		case "auditor":
			return "Auditor";
		case "researcher":
			return "Researcher";
		case "student":
			return "Student";
		default:
			return "Lecturer";
	}
}
