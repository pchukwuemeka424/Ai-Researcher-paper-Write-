import { UserModel, type UserDocument } from "../db/models/User.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signAuthToken } from "../lib/auth-token.js";
import { buildTokenQuota, type StudentTokenQuota } from "../constants/student-tokens.js";

export type PublicUser = {
	id: string;
	name: string;
	email: string;
	role: string;
	status: string;
	department: string | null;
	institution: string | null;
	lastActiveAt: string | null;
	createdAt: string;
	tokenQuota?: StudentTokenQuota;
};

function toPublicUser(user: UserDocument | Record<string, unknown>): PublicUser {
	const doc = user as UserDocument & { createdAt: Date; lastActiveAt?: Date; tokensUsed?: number };
	const publicUser: PublicUser = {
		id: doc._id.toString(),
		name: doc.name,
		email: doc.email,
		role: doc.role,
		status: doc.status,
		department: doc.department ?? null,
		institution: doc.institution ?? null,
		lastActiveAt: doc.lastActiveAt?.toISOString() ?? null,
		createdAt: doc.createdAt.toISOString(),
	};
	const tokenQuota = buildTokenQuota(doc.role, doc.tokensUsed ?? 0);
	if (tokenQuota) {
		publicUser.tokenQuota = tokenQuota;
	}
	return publicUser;
}

function validateEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function registerStudent(input: {
	name: string;
	email: string;
	password: string;
	department: string;
	institution?: string;
}) {
	const name = input.name.trim();
	const email = input.email.trim().toLowerCase();
	const department = input.department.trim();
	const institution = input.institution?.trim() ?? "";

	if (name.length < 2) throw new Error("Please enter your full name.");
	if (!validateEmail(email)) throw new Error("Please enter a valid university email.");
	if (input.password.length < 8) throw new Error("Password must be at least 8 characters.");
	if (department.length < 2) throw new Error("Please enter your program or department.");

	const existing = await UserModel.findOne({ email }).select("+passwordHash");
	if (existing?.passwordHash) {
		throw new Error("An account with this email already exists.");
	}

	const passwordHash = await hashPassword(input.password);

	const user = existing
		? await UserModel.findByIdAndUpdate(
				existing._id,
				{
					name,
					passwordHash,
					department,
					institution: institution || undefined,
					role: "student",
					status: "active",
					lastActiveAt: new Date(),
				},
				{ new: true },
			)
		: await UserModel.create({
				name,
				email,
				passwordHash,
				department,
				institution: institution || undefined,
				role: "student",
				status: "active",
				lastActiveAt: new Date(),
			});

	if (!user) throw new Error("Registration failed.");

	const token = signAuthToken({
		sub: user._id.toString(),
		email: user.email,
		role: user.role,
	});

	return { token, user: toPublicUser(user) };
}

export async function registerLecturer(input: {
	name: string;
	email: string;
	password: string;
	department: string;
	institution?: string;
}) {
	const name = input.name.trim();
	const email = input.email.trim().toLowerCase();
	const department = input.department.trim();
	const institution = input.institution?.trim() ?? "";

	if (name.length < 2) throw new Error("Please enter your full name.");
	if (!validateEmail(email)) throw new Error("Please enter a valid university email.");
	if (input.password.length < 8) throw new Error("Password must be at least 8 characters.");
	if (department.length < 2) throw new Error("Please enter your department or faculty.");

	const existing = await UserModel.findOne({ email }).select("+passwordHash");
	if (existing?.passwordHash) {
		throw new Error("An account with this email already exists.");
	}

	const passwordHash = await hashPassword(input.password);

	const user = existing
		? await UserModel.findByIdAndUpdate(
				existing._id,
				{
					name,
					passwordHash,
					department,
					institution: institution || undefined,
					role: "lecturer",
					status: "active",
					lastActiveAt: new Date(),
				},
				{ new: true },
			)
		: await UserModel.create({
				name,
				email,
				passwordHash,
				department,
				institution: institution || undefined,
				role: "lecturer",
				status: "active",
				lastActiveAt: new Date(),
			});

	if (!user) throw new Error("Registration failed.");

	const token = signAuthToken({
		sub: user._id.toString(),
		email: user.email,
		role: user.role,
	});

	return { token, user: toPublicUser(user) };
}

export async function loginUser(input: { email: string; password: string }) {
	const email = input.email.trim().toLowerCase();
	const user = await UserModel.findOne({ email }).select("+passwordHash");
	if (!user?.passwordHash) {
		throw new Error("Invalid email or password.");
	}

	const valid = await verifyPassword(input.password, user.passwordHash);
	if (!valid) throw new Error("Invalid email or password.");
	if (user.status !== "active") {
		throw new Error("Your account is inactive. Contact your administrator.");
	}

	user.lastActiveAt = new Date();
	await user.save();

	const token = signAuthToken({
		sub: user._id.toString(),
		email: user.email,
		role: user.role,
	});

	return { token, user: toPublicUser(user) };
}

export async function getUserById(id: string): Promise<PublicUser | null> {
	const user = await UserModel.findById(id);
	if (!user) return null;
	return toPublicUser(user);
}
