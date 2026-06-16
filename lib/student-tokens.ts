export const STUDENT_TOKEN_ALLOWANCE = 400_000;
export const LECTURER_TOKEN_ALLOWANCE = 1_000_000;

export type StudentTokenQuota = {
	allowance: number;
	used: number;
	remaining: number;
};

export function researchTokenAllowance(role?: string): number | null {
	if (role === "student") return STUDENT_TOKEN_ALLOWANCE;
	if (role === "lecturer" || role === "researcher") return LECTURER_TOKEN_ALLOWANCE;
	return null;
}
