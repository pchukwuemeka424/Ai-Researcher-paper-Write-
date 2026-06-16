import { UserModel } from "../db/models/User.js";
import { extractBearerToken, verifyAuthToken } from "./auth-token.js";

export class AdminRequiredError extends Error {
	constructor(
		public statusCode: 401 | 403,
		message: string,
	) {
		super(message);
	}
}

export async function requireAdmin(authorization?: string): Promise<string> {
	const token = extractBearerToken(authorization);
	if (!token) throw new AdminRequiredError(401, "Authentication required.");

	const payload = verifyAuthToken(token);
	if (!payload?.sub) throw new AdminRequiredError(401, "Invalid or expired token.");

	const user = await UserModel.findById(payload.sub).select("role").lean();
	if (!user) throw new AdminRequiredError(401, "User not found.");
	if (user.role !== "admin") throw new AdminRequiredError(403, "Admin access required.");

	return payload.sub;
}
