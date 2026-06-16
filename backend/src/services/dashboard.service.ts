import { hashPassword } from "../lib/password.js";
import { buildTokenQuota } from "../constants/student-tokens.js";
import { MessageModel } from "../db/models/Message.js";
import { SessionModel } from "../db/models/Session.js";
import { enrichSessionsWithOwnership } from "./session-enrichment.service.js";
import { UserModel } from "../db/models/User.js";

export async function getDashboardStats() {
	const [userCount, activeUsers, sessionCount, messageCount, activeSessions] = await Promise.all([
		UserModel.countDocuments(),
		UserModel.countDocuments({ status: "active" }),
		SessionModel.countDocuments(),
		MessageModel.countDocuments({ role: { $in: ["user", "assistant"] } }),
		SessionModel.countDocuments({ state: { $in: ["running", "starting"] } }),
	]);

	return {
		userCount,
		activeUsers,
		sessionCount,
		messageCount,
		activeSessions,
	};
}

export async function listUsers() {
	const users = await UserModel.find().sort({ createdAt: -1 }).lean();
	return users.map((user) => ({
		id: user._id.toString(),
		name: user.name,
		email: user.email,
		role: user.role,
		status: user.status,
		department: user.department ?? null,
		institution: user.institution ?? null,
		lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
		createdAt: user.createdAt.toISOString(),
		tokenQuota: buildTokenQuota(user.role, user.tokensUsed ?? 0),
	}));
}

export async function createUser(input: {
	name: string;
	email: string;
	role?: string;
	status?: string;
	department?: string;
	institution?: string;
	password?: string;
}) {
	if (input.password && input.password.length < 8) {
		throw new Error("Password must be at least 8 characters.");
	}

	const passwordHash = input.password ? await hashPassword(input.password) : undefined;

	const user = await UserModel.create({
		name: input.name.trim(),
		email: input.email.trim().toLowerCase(),
		role: input.role ?? "lecturer",
		status: input.status ?? "active",
		department: input.department?.trim(),
		institution: input.institution?.trim(),
		...(passwordHash ? { passwordHash } : {}),
	});
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
		tokenQuota: buildTokenQuota(user.role, user.tokensUsed ?? 0),
	};
}

export async function updateUser(
	id: string,
	input: Partial<{
		name: string;
		email: string;
		role: string;
		status: string;
		department: string;
		institution: string;
	}>,
) {
	const user = await UserModel.findByIdAndUpdate(
		id,
		{
			...(input.name !== undefined ? { name: input.name.trim() } : {}),
			...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
			...(input.role !== undefined ? { role: input.role } : {}),
			...(input.status !== undefined ? { status: input.status } : {}),
			...(input.department !== undefined ? { department: input.department.trim() } : {}),
			...(input.institution !== undefined ? { institution: input.institution.trim() } : {}),
		},
		{ new: true, runValidators: true },
	).lean();

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
		tokenQuota: buildTokenQuota(user.role, user.tokensUsed ?? 0),
	};
}

export async function deleteUser(id: string) {
	const result = await UserModel.findByIdAndDelete(id);
	return Boolean(result);
}

export async function listRecentSessions(limit = 10) {
	const sessions = await SessionModel.find()
		.select("userId workflow topic model state createdAt updatedAt")
		.sort({ updatedAt: -1 })
		.limit(limit)
		.lean();
	const sessionIds = sessions.map((s) => s._id);

	const messageCounts = await MessageModel.aggregate<{ _id: typeof sessionIds[number]; count: number }>([
		{ $match: { sessionId: { $in: sessionIds }, role: { $in: ["user", "assistant"] } } },
		{ $group: { _id: "$sessionId", count: { $sum: 1 } } },
	]);

	const countMap = new Map(messageCounts.map((row) => [row._id.toString(), row.count]));

	const base = sessions.map((session) => ({
		id: session._id.toString(),
		userId: session.userId?.toString() ?? null,
		workflow: session.workflow ?? null,
		topic: session.topic ?? null,
		model: session.model,
		state: session.state,
		messageCount: countMap.get(session._id.toString()) ?? 0,
		createdAt: session.createdAt.toISOString(),
		updatedAt: session.updatedAt.toISOString(),
	}));

	return enrichSessionsWithOwnership(
		base.map((session) => ({
			...session,
			topic: session.topic?.trim() || session.workflow?.trim() || "General research",
		})),
	);
}

export async function listRecentSessionTopics(limit = 8) {
	const sessions = await SessionModel.find()
		.select("userId topic workflow model state createdAt updatedAt")
		.sort({ updatedAt: -1 })
		.limit(limit)
		.lean();

	const sessionIds = sessions.map((s) => s._id);
	const messageCounts = await MessageModel.aggregate<{ _id: typeof sessionIds[number]; count: number }>([
		{ $match: { sessionId: { $in: sessionIds }, role: { $in: ["user", "assistant"] } } },
		{ $group: { _id: "$sessionId", count: { $sum: 1 } } },
	]);
	const countMap = new Map(messageCounts.map((row) => [row._id.toString(), row.count]));

	const base = sessions.map((session) => {
		const id = session._id.toString();
		return {
			id,
			userId: session.userId?.toString() ?? null,
			topic: session.topic?.trim() || session.workflow?.trim() || "General research",
			workflow: session.workflow ?? null,
			model: session.model,
			state: session.state,
			messageCount: countMap.get(id) ?? 0,
			createdAt: session.createdAt.toISOString(),
			updatedAt: session.updatedAt.toISOString(),
		};
	});

	return enrichSessionsWithOwnership(base);
}
