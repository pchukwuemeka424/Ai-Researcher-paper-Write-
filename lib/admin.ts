import type { StudentTokenQuota } from "@/lib/student-tokens";

export type AdminLectureRecord = {
	id: string;
	userId: string | null;
	title: string;
	department: string;
	level: string;
	outline: string;
	presentation: {
		title: string;
		slides: { title: string; explanation: string; bullets: string[]; imageUrl?: string | null }[];
	} | null;
	createdAt: string;
	updatedAt: string;
	ownerName: string | null;
	ownerEmail: string | null;
	slideCount: number;
};

export type LectureAdminStats = {
	total: number;
	withPresentation: number;
	withoutPresentation: number;
};

export type AdminTokenRecord = {
	id: string;
	name: string;
	email: string;
	role: string;
	faculty?: string | null;
	department?: string | null;
	programme?: string | null;
	tokenQuota: StudentTokenQuota | null;
};

export type TokenAdminStats = {
	userCount: number;
	studentsWithQuota: number;
	lecturersWithQuota: number;
	totalTokensUsed: number;
	dailyTokensApprox?: number;
	weeklyTokensApprox?: number;
	monthlyTokensApprox?: number;
	estimatedCost?: number;
};

export type UpdateTokenInput = { reset?: boolean; tokensUsed?: number };

export type AdminBackupTable = {
	key: string;
	label: string;
	collection: string;
	count: number;
};

export type AdminBackupFile = {
	filename: string;
	size: number;
	createdAt: string;
	tableCount: number | null;
	documentCount: number | null;
};
