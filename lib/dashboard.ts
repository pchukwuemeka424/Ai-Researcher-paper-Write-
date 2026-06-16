import type { StudentTokenQuota } from "@/lib/student-tokens";

export type DashboardStats = {
	userCount: number;
	activeUsers: number;
	sessionCount: number;
	messageCount: number;
	activeSessions: number;
};

export type UserRecord = {
	id: string;
	name: string;
	email: string;
	role: "lecturer" | "admin" | "viewer" | "researcher" | "student";
	status: "active" | "inactive";
	department: string | null;
	institution: string | null;
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
	password?: string;
};

export type UpdateUserInput = Partial<CreateUserInput>;
