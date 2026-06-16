import { hashPassword } from "../lib/password.js";
import { UserModel } from "../db/models/User.js";
import {
	createUser,
	deleteUser,
	getDashboardStats,
	listRecentSessions,
	listRecentSessionTopics,
	listUsers,
	updateUser,
} from "./dashboard.service.js";

export { getDashboardStats, listRecentSessions, listRecentSessionTopics, listUsers, createUser, updateUser, deleteUser };

export async function resetUserPassword(id: string, password: string) {
	if (password.length < 8) throw new Error("Password must be at least 8 characters.");

	const passwordHash = await hashPassword(password);
	const user = await UserModel.findByIdAndUpdate(id, { passwordHash }, { new: true }).lean();
	if (!user) return null;

	return {
		id: user._id.toString(),
		name: user.name,
		email: user.email,
		role: user.role,
		status: user.status,
		department: user.department ?? null,
		institution: user.institution ?? null,
		lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
		createdAt: user.createdAt.toISOString(),
	};
}

export async function bulkUpdateUserStatus(ids: string[], status: "active" | "inactive") {
	if (ids.length === 0) return { updated: 0 };
	const result = await UserModel.updateMany({ _id: { $in: ids } }, { status });
	return { updated: result.modifiedCount };
}

export async function bulkDeleteUsers(ids: string[]) {
	if (ids.length === 0) return { deleted: 0 };
	const result = await UserModel.deleteMany({ _id: { $in: ids } });
	return { deleted: result.deletedCount };
}
