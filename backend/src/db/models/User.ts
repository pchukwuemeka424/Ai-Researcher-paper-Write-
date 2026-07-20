import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const userSchema = new Schema(
	{
		name: { type: String, required: true, trim: true },
		email: { type: String, required: true, unique: true, trim: true, lowercase: true },
		passwordHash: { type: String, select: false },
		department: { type: String, trim: true },
		institution: { type: String, trim: true },
		/** Optional structured org dimensions for governance analytics */
		faculty: { type: String, trim: true },
		programme: { type: String, trim: true },
		cohort: { type: String, trim: true },
		role: {
			type: String,
			enum: ["lecturer", "admin", "viewer", "researcher", "student"],
			default: "lecturer",
		},
		status: { type: String, enum: ["active", "inactive"], default: "active" },
		lastActiveAt: { type: Date },
		tokensUsed: { type: Number, default: 0, min: 0 },
	},
	{ timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };

export const UserModel = model("User", userSchema);
