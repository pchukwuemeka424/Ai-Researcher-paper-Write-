import { buildTokenQuota, type StudentTokenQuota } from "../constants/student-tokens.js";
import { UserModel } from "../db/models/User.js";

export type AdminTokenRecord = {
	id: string;
	name: string;
	email: string;
	role: string;
	tokenQuota: StudentTokenQuota | null;
};

export type TokenAdminStats = {
	userCount: number;
	studentsWithQuota: number;
	lecturersWithQuota: number;
	totalTokensUsed: number;
};

function toAdminTokenRecord(user: {
	_id: { toString(): string };
	name: string;
	email: string;
	role: string;
	tokensUsed?: number;
}): AdminTokenRecord {
	return {
		id: user._id.toString(),
		name: user.name,
		email: user.email,
		role: user.role,
		tokenQuota: buildTokenQuota(user.role, user.tokensUsed ?? 0),
	};
}

export async function listUsersTokenQuotas(): Promise<AdminTokenRecord[]> {
	const users = await UserModel.find()
		.select("name email role tokensUsed")
		.sort({ name: 1 })
		.lean();
	return users.map(toAdminTokenRecord);
}

export async function resetUserTokens(userId: string): Promise<AdminTokenRecord | null> {
	const user = await UserModel.findByIdAndUpdate(userId, { tokensUsed: 0 }, { new: true })
		.select("name email role tokensUsed")
		.lean();
	if (!user) return null;
	return toAdminTokenRecord(user);
}

export async function setUserTokensUsed(
	userId: string,
	tokensUsed: number,
): Promise<AdminTokenRecord | null> {
	const used = Math.max(0, Math.round(tokensUsed));
	const user = await UserModel.findByIdAndUpdate(userId, { tokensUsed: used }, { new: true })
		.select("name email role tokensUsed")
		.lean();
	if (!user) return null;
	return toAdminTokenRecord(user);
}

export async function bulkResetUserTokens(userIds: string[]): Promise<{ reset: number }> {
	if (userIds.length === 0) return { reset: 0 };
	const result = await UserModel.updateMany({ _id: { $in: userIds } }, { tokensUsed: 0 });
	return { reset: result.modifiedCount };
}

export async function getTokenAdminStats(): Promise<TokenAdminStats> {
	const users = await UserModel.find().select("role tokensUsed").lean();
	let totalTokensUsed = 0;
	let studentsWithQuota = 0;
	let lecturersWithQuota = 0;

	for (const user of users) {
		totalTokensUsed += user.tokensUsed ?? 0;
		if (user.role === "student") studentsWithQuota++;
		if (user.role === "lecturer" || user.role === "researcher") lecturersWithQuota++;
	}

	return {
		userCount: users.length,
		studentsWithQuota,
		lecturersWithQuota,
		totalTokensUsed,
	};
}
