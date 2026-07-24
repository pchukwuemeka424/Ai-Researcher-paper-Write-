import type { StudentTokenQuota } from "@/lib/student-tokens";

export type DashboardStats = {
	userCount: number;
	activeUsers: number;
	sessionCount: number;
	messageCount: number;
	activeSessions: number;
};

export type UserRole =
	| "admin"
	| "governance_admin"
	| "faculty_admin"
	| "lecturer"
	| "researcher"
	| "student"
	| "auditor"
	| "viewer";

export type UserRecord = {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	status: "active" | "inactive" | "suspended";
	department: string | null;
	institution: string | null;
	universityId: string | null;
	faculty: string | null;
	programme: string | null;
	cohort: string | null;
	lastActiveAt: string | null;
	createdAt: string;
	tokenQuota?: StudentTokenQuota | null;
};

export type SessionSummary = {
	id: string;
	workflow: string | null;
	topic: string | null;
	model: string;
	state: string;
	messageCount: number;
	lectureTitle: string | null;
	generatedByName: string | null;
	generatedByEmail: string | null;
	createdAt: string;
	updatedAt: string;
};

/** Lightweight session row for admin overview — metadata only, no message content. */
export type RecentSessionTopic = {
	id: string;
	topic: string;
	workflow: string | null;
	model: string;
	state: string;
	messageCount: number;
	lectureTitle: string | null;
	generatedByName: string | null;
	generatedByEmail: string | null;
	createdAt: string;
	updatedAt: string;
};

export type CreateUserInput = {
	name: string;
	email: string;
	role?: UserRecord["role"];
	status?: UserRecord["status"];
	department?: string;
	institution?: string;
	universityId?: string;
	faculty?: string;
	programme?: string;
	cohort?: string;
	password?: string;
};

export type UpdateUserInput = Partial<CreateUserInput>;

export const USER_ROLE_OPTIONS: Array<{ label: string; value: UserRole }> = [
	{ label: "Super Administrator", value: "admin" },
	{ label: "Governance Administrator", value: "governance_admin" },
	{ label: "Faculty Administrator", value: "faculty_admin" },
	{ label: "Lecturer", value: "lecturer" },
	{ label: "Researcher", value: "researcher" },
	{ label: "Student", value: "student" },
	{ label: "Auditor", value: "auditor" },
];

export function userRoleLabel(role: string): string {
	const found = USER_ROLE_OPTIONS.find((r) => r.value === role);
	if (found) return found.label;
	if (role === "viewer") return "Auditor";
	return role.charAt(0).toUpperCase() + role.slice(1);
}
