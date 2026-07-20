import { createHash } from "node:crypto";

import { AuditLogModel } from "../db/models/AuditLog.js";
import { UserModel } from "../db/models/User.js";
import { orgDimensionsForUser } from "../lib/org-dimensions.js";

export type AuditSeverity = "info" | "low" | "medium" | "high" | "critical";

export type AuditCategory =
	| "auth"
	| "admin"
	| "ai_use"
	| "policy"
	| "approval"
	| "data"
	| "security"
	| "system"
	| "report";

export type RecordAuditInput = {
	action: string;
	category: AuditCategory;
	actorId?: string | null;
	summary: string;
	details?: Record<string, unknown>;
	targetType?: string;
	targetId?: string;
	severity?: AuditSeverity;
	flagged?: boolean;
	flagReason?: string;
	ip?: string;
	userAgent?: string;
	faculty?: string;
	department?: string;
};

export type AuditLogRecord = {
	id: string;
	action: string;
	category: string;
	actorId: string | null;
	actorEmail: string | null;
	actorName: string | null;
	actorRole: string | null;
	targetType: string | null;
	targetId: string | null;
	summary: string;
	details: unknown;
	faculty: string | null;
	department: string | null;
	severity: string;
	flagged: boolean;
	flagReason: string | null;
	alertSent: boolean;
	immutableHash: string | null;
	createdAt: string;
};

function toRecord(doc: {
	_id: { toString(): string };
	action: string;
	category: string;
	actorId?: { toString(): string } | null;
	actorEmail?: string | null;
	actorName?: string | null;
	actorRole?: string | null;
	targetType?: string | null;
	targetId?: string | null;
	summary: string;
	details?: unknown;
	faculty?: string | null;
	department?: string | null;
	severity?: string;
	flagged?: boolean;
	flagReason?: string | null;
	alertSent?: boolean;
	immutableHash?: string | null;
	createdAt: Date;
}): AuditLogRecord {
	return {
		id: doc._id.toString(),
		action: doc.action,
		category: doc.category,
		actorId: doc.actorId?.toString() ?? null,
		actorEmail: doc.actorEmail ?? null,
		actorName: doc.actorName ?? null,
		actorRole: doc.actorRole ?? null,
		targetType: doc.targetType ?? null,
		targetId: doc.targetId ?? null,
		summary: doc.summary,
		details: doc.details ?? null,
		faculty: doc.faculty ?? null,
		department: doc.department ?? null,
		severity: doc.severity ?? "info",
		flagged: Boolean(doc.flagged),
		flagReason: doc.flagReason ?? null,
		alertSent: Boolean(doc.alertSent),
		immutableHash: doc.immutableHash ?? null,
		createdAt: doc.createdAt.toISOString(),
	};
}

function computeHash(payload: Record<string, unknown>): string {
	return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

const SENSITIVE_PATTERNS = [
	/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/, // SSN-like
	/\b(?:\d[ -]*?){13,19}\b/, // card-like
	/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
	/\b(?:password|api[_-]?key|secret|token)\s*[:=]/i,
	/\b(?:patient|medical record|nin|bvn)\b/i,
];

export function detectSensitiveExposure(text: string): string | null {
	for (const pattern of SENSITIVE_PATTERNS) {
		if (pattern.test(text)) {
			return "Possible sensitive-data exposure detected in logged content.";
		}
	}
	return null;
}

export async function recordAuditEvent(input: RecordAuditInput): Promise<AuditLogRecord> {
	let actorEmail: string | undefined;
	let actorName: string | undefined;
	let actorRole: string | undefined;
	let faculty = input.faculty;
	let department = input.department;

	if (input.actorId) {
		const actor = await UserModel.findById(input.actorId)
			.select("name email role department faculty programme cohort createdAt")
			.lean();
		if (actor) {
			actorEmail = actor.email;
			actorName = actor.name;
			actorRole = actor.role;
			const org = orgDimensionsForUser(actor);
			faculty = faculty ?? org.faculty;
			department = department ?? org.department;
		}
	}

	const detailText = JSON.stringify(input.details ?? {});
	const autoFlag = detectSensitiveExposure(`${input.summary} ${detailText}`);
	const flagged = Boolean(input.flagged || autoFlag);
	const severity =
		input.severity ??
		(flagged ? "high" : input.category === "security" || input.category === "policy" ? "medium" : "info");

	const hashPayload = {
		action: input.action,
		category: input.category,
		actorId: input.actorId ?? null,
		summary: input.summary,
		details: input.details ?? null,
		targetType: input.targetType ?? null,
		targetId: input.targetId ?? null,
		ts: Date.now(),
	};

	const doc = await AuditLogModel.create({
		action: input.action,
		category: input.category,
		actorId: input.actorId ?? undefined,
		actorEmail,
		actorName,
		actorRole,
		targetType: input.targetType,
		targetId: input.targetId,
		summary: input.summary,
		details: input.details,
		faculty,
		department,
		ip: input.ip,
		userAgent: input.userAgent,
		severity,
		flagged,
		flagReason: input.flagReason ?? autoFlag ?? undefined,
		alertSent: flagged && (severity === "high" || severity === "critical"),
		immutableHash: computeHash(hashPayload),
	});

	return toRecord(doc.toObject());
}

export async function listAuditLogs(options: {
	limit?: number;
	flaggedOnly?: boolean;
	category?: string;
	severity?: string;
	search?: string;
} = {}): Promise<AuditLogRecord[]> {
	const filter: Record<string, unknown> = {};
	if (options.flaggedOnly) filter.flagged = true;
	if (options.category) filter.category = options.category;
	if (options.severity) filter.severity = options.severity;
	if (options.search?.trim()) {
		const q = options.search.trim();
		filter.$or = [
			{ summary: { $regex: q, $options: "i" } },
			{ action: { $regex: q, $options: "i" } },
			{ actorEmail: { $regex: q, $options: "i" } },
			{ actorName: { $regex: q, $options: "i" } },
			{ flagReason: { $regex: q, $options: "i" } },
		];
	}

	const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
	const rows = await AuditLogModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
	return rows.map(toRecord);
}

export async function getAuditAlertStats() {
	const [total, flagged, critical, high, last24h] = await Promise.all([
		AuditLogModel.countDocuments(),
		AuditLogModel.countDocuments({ flagged: true }),
		AuditLogModel.countDocuments({ severity: "critical" }),
		AuditLogModel.countDocuments({ severity: "high" }),
		AuditLogModel.countDocuments({
			createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
		}),
	]);
	return { total, flagged, critical, high, last24h };
}

export async function flagAuditLog(
	id: string,
	flagReason: string,
	severity: AuditSeverity = "high",
): Promise<AuditLogRecord | null> {
	// Immutability: create a follow-up audit event instead of mutating the original.
	const existing = await AuditLogModel.findById(id).lean();
	if (!existing) return null;
	return recordAuditEvent({
		action: "audit.flag_raised",
		category: "security",
		summary: `Flag raised on audit ${id}: ${flagReason}`,
		details: { sourceAuditId: id, originalAction: existing.action },
		severity,
		flagged: true,
		flagReason,
		targetType: "audit_log",
		targetId: id,
	});
}
