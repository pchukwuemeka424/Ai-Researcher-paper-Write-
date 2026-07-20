import { AiSystemInventoryModel } from "../db/models/AiSystemInventory.js";
import { ResearchIdeaSessionModel } from "../db/models/ResearchIdeaSession.js";
import { ResearchProjectModel } from "../db/models/ResearchProject.js";
import { SessionModel } from "../db/models/Session.js";
import { recordAuditEvent } from "./admin-audit.service.js";

export type AiSystemCategory = "llm" | "embedding" | "search" | "vision" | "speech" | "analytics" | "other";
export type AiSystemDeployment = "internal" | "vendor_saas" | "open_source" | "hybrid";
export type AiRiskTier = "minimal" | "limited" | "high" | "unacceptable";
export type AiSystemStatus = "proposed" | "approved" | "active" | "restricted" | "retired";
export type DpiaStatus = "not_required" | "pending" | "in_progress" | "complete" | "overdue";

export type AiSystemRecord = {
	id: string;
	name: string;
	vendor: string;
	purpose: string;
	category: AiSystemCategory;
	deployment: AiSystemDeployment;
	riskTier: AiRiskTier;
	status: AiSystemStatus;
	dataClasses: string[];
	facultiesAllowed: string[];
	rolesAllowed: string[];
	ownerName: string;
	dpiaRequired: boolean;
	dpiaStatus: DpiaStatus;
	dpiaNotes: string;
	lastReviewedAt: string | null;
	nextReviewAt: string | null;
	approvalRequestId: string | null;
	notes: string;
	createdAt: string;
	updatedAt: string;
};

function toRecord(doc: {
	_id: { toString(): string };
	name: string;
	vendor?: string | null;
	purpose?: string | null;
	category: string;
	deployment: string;
	riskTier: string;
	status: string;
	dataClasses?: string[] | null;
	facultiesAllowed?: string[] | null;
	rolesAllowed?: string[] | null;
	ownerName?: string | null;
	dpiaRequired?: boolean;
	dpiaStatus?: string;
	dpiaNotes?: string | null;
	lastReviewedAt?: Date | null;
	nextReviewAt?: Date | null;
	approvalRequestId?: string | null;
	notes?: string | null;
	createdAt: Date;
	updatedAt: Date;
}): AiSystemRecord {
	return {
		id: doc._id.toString(),
		name: doc.name,
		vendor: doc.vendor ?? "",
		purpose: doc.purpose ?? "",
		category: doc.category as AiSystemCategory,
		deployment: doc.deployment as AiSystemDeployment,
		riskTier: doc.riskTier as AiRiskTier,
		status: doc.status as AiSystemStatus,
		dataClasses: doc.dataClasses ?? [],
		facultiesAllowed: doc.facultiesAllowed ?? [],
		rolesAllowed: doc.rolesAllowed ?? [],
		ownerName: doc.ownerName ?? "",
		dpiaRequired: Boolean(doc.dpiaRequired),
		dpiaStatus: (doc.dpiaStatus as DpiaStatus) ?? "not_required",
		dpiaNotes: doc.dpiaNotes ?? "",
		lastReviewedAt: doc.lastReviewedAt?.toISOString() ?? null,
		nextReviewAt: doc.nextReviewAt?.toISOString() ?? null,
		approvalRequestId: doc.approvalRequestId ?? null,
		notes: doc.notes ?? "",
		createdAt: doc.createdAt.toISOString(),
		updatedAt: doc.updatedAt.toISOString(),
	};
}

/**
 * Upsert inventory rows from live platform usage (sessions + research features).
 * Only creates entries that have real activity; never invents demo systems.
 */
export async function syncInventoryFromUsage(): Promise<void> {
	const [modelUsage, ideaCount, projectCount, sessionCount] = await Promise.all([
		SessionModel.aggregate<{ _id: string; count: number }>([
			{ $match: { model: { $exists: true, $nin: [null, ""] } } },
			{ $group: { _id: "$model", count: { $sum: 1 } } },
			{ $sort: { count: -1 } },
		]),
		ResearchIdeaSessionModel.countDocuments(),
		ResearchProjectModel.countDocuments(),
		SessionModel.countDocuments(),
	]);

	for (const row of modelUsage) {
		const modelName = String(row._id ?? "").trim();
		if (!modelName) continue;
		const name = `LLM — ${modelName}`;
		await AiSystemInventoryModel.updateOne(
			{ name, vendor: "OpenRouter" },
			{
				$set: {
					purpose: `Model observed in ${row.count} research session(s)`,
					category: "llm",
					deployment: "vendor_saas",
					status: "active",
					lastReviewedAt: new Date(),
					notes: `Synced from live Session.model usage (${row.count} sessions)`,
				},
				$setOnInsert: {
					riskTier: "limited",
					dataClasses: ["research_text"],
					facultiesAllowed: [],
					rolesAllowed: [],
					ownerName: "",
					dpiaRequired: false,
					dpiaStatus: "not_required",
					dpiaNotes: "",
				},
			},
			{ upsert: true },
		);
	}

	if (ideaCount > 0) {
		await AiSystemInventoryModel.updateOne(
			{ name: "Research ideas generator", vendor: "OpenRouter" },
			{
				$set: {
					purpose: `Live idea-generation feature (${ideaCount} sessions)`,
					category: "llm",
					deployment: "vendor_saas",
					status: "active",
					lastReviewedAt: new Date(),
					notes: `Synced from ResearchIdeaSession (${ideaCount})`,
				},
				$setOnInsert: {
					riskTier: "limited",
					dataClasses: ["research_text"],
					facultiesAllowed: [],
					rolesAllowed: [],
					ownerName: "",
					dpiaRequired: false,
					dpiaStatus: "not_required",
					dpiaNotes: "",
				},
			},
			{ upsert: true },
		);
	}

	if (projectCount > 0) {
		await AiSystemInventoryModel.updateOne(
			{ name: "Research Note workspace", vendor: "OpenRouter" },
			{
				$set: {
					purpose: `Research Note projects in use (${projectCount})`,
					category: "llm",
					deployment: "vendor_saas",
					status: "active",
					lastReviewedAt: new Date(),
					notes: `Synced from ResearchProject (${projectCount})`,
				},
				$setOnInsert: {
					riskTier: "limited",
					dataClasses: ["research_notes"],
					facultiesAllowed: [],
					rolesAllowed: [],
					ownerName: "",
					dpiaRequired: true,
					dpiaStatus: "pending",
					dpiaNotes: "",
				},
			},
			{ upsert: true },
		);
	}

	if (sessionCount > 0 && modelUsage.length === 0) {
		await AiSystemInventoryModel.updateOne(
			{ name: "Research chat / paper drafting", vendor: "OpenRouter" },
			{
				$set: {
					purpose: `Research sessions recorded (${sessionCount})`,
					category: "llm",
					deployment: "vendor_saas",
					status: "active",
					lastReviewedAt: new Date(),
					notes: `Synced from Session count (${sessionCount})`,
				},
				$setOnInsert: {
					riskTier: "limited",
					dataClasses: ["research_text", "citations"],
					facultiesAllowed: [],
					rolesAllowed: [],
					ownerName: "",
					dpiaRequired: false,
					dpiaStatus: "not_required",
					dpiaNotes: "",
				},
			},
			{ upsert: true },
		);
	}
}

/** @deprecated Use syncInventoryFromUsage — no mock systems. */
export async function ensureDefaultAiSystems(): Promise<void> {
	await syncInventoryFromUsage();
}

export async function listAiSystems(options: { status?: string; riskTier?: string } = {}) {
	await syncInventoryFromUsage();
	const filter: Record<string, unknown> = {};
	if (options.status) filter.status = options.status;
	if (options.riskTier) filter.riskTier = options.riskTier;
	const rows = await AiSystemInventoryModel.find(filter).sort({ riskTier: -1, name: 1 }).lean();
	return rows.map(toRecord);
}

export async function createAiSystem(
	input: {
		name: string;
		vendor?: string;
		purpose?: string;
		category?: AiSystemCategory;
		deployment?: AiSystemDeployment;
		riskTier?: AiRiskTier;
		status?: AiSystemStatus;
		dataClasses?: string[];
		facultiesAllowed?: string[];
		rolesAllowed?: string[];
		ownerName?: string;
		dpiaRequired?: boolean;
		dpiaStatus?: DpiaStatus;
		dpiaNotes?: string;
		notes?: string;
	},
	actorId?: string,
) {
	const riskTier = input.riskTier ?? "limited";
	const dpiaRequired =
		input.dpiaRequired ?? (riskTier === "high" || riskTier === "unacceptable");
	const doc = await AiSystemInventoryModel.create({
		name: input.name.trim(),
		vendor: input.vendor?.trim() ?? "",
		purpose: input.purpose?.trim() ?? "",
		category: input.category ?? "llm",
		deployment: input.deployment ?? "vendor_saas",
		riskTier,
		status: input.status ?? "proposed",
		dataClasses: input.dataClasses ?? [],
		facultiesAllowed: input.facultiesAllowed ?? [],
		rolesAllowed: input.rolesAllowed ?? [],
		ownerName: input.ownerName?.trim() ?? "",
		dpiaRequired,
		dpiaStatus: input.dpiaStatus ?? (dpiaRequired ? "pending" : "not_required"),
		dpiaNotes: input.dpiaNotes?.trim() ?? "",
		notes: input.notes?.trim() ?? "",
		createdBy: actorId,
		updatedBy: actorId,
	});

	if (actorId) {
		await recordAuditEvent({
			action: "ai_system.registered",
			category: "admin",
			actorId,
			summary: `Registered AI system “${doc.name}” (${doc.riskTier})`,
			targetType: "ai_system",
			targetId: doc._id.toString(),
			severity: riskTier === "high" || riskTier === "unacceptable" ? "high" : "info",
			flagged: riskTier === "unacceptable",
			flagReason: riskTier === "unacceptable" ? "Unacceptable-risk system registered" : undefined,
		});
	}

	return toRecord(doc.toObject());
}

export async function updateAiSystem(
	id: string,
	input: Partial<{
		name: string;
		vendor: string;
		purpose: string;
		category: AiSystemCategory;
		deployment: AiSystemDeployment;
		riskTier: AiRiskTier;
		status: AiSystemStatus;
		dataClasses: string[];
		facultiesAllowed: string[];
		rolesAllowed: string[];
		ownerName: string;
		dpiaRequired: boolean;
		dpiaStatus: DpiaStatus;
		dpiaNotes: string;
		notes: string;
		nextReviewAt: string | null;
	}>,
	actorId?: string,
) {
	const doc = await AiSystemInventoryModel.findByIdAndUpdate(
		id,
		{
			...(input.name !== undefined ? { name: input.name.trim() } : {}),
			...(input.vendor !== undefined ? { vendor: input.vendor.trim() } : {}),
			...(input.purpose !== undefined ? { purpose: input.purpose.trim() } : {}),
			...(input.category !== undefined ? { category: input.category } : {}),
			...(input.deployment !== undefined ? { deployment: input.deployment } : {}),
			...(input.riskTier !== undefined ? { riskTier: input.riskTier } : {}),
			...(input.status !== undefined ? { status: input.status } : {}),
			...(input.dataClasses !== undefined ? { dataClasses: input.dataClasses } : {}),
			...(input.facultiesAllowed !== undefined ? { facultiesAllowed: input.facultiesAllowed } : {}),
			...(input.rolesAllowed !== undefined ? { rolesAllowed: input.rolesAllowed } : {}),
			...(input.ownerName !== undefined ? { ownerName: input.ownerName.trim() } : {}),
			...(input.dpiaRequired !== undefined ? { dpiaRequired: input.dpiaRequired } : {}),
			...(input.dpiaStatus !== undefined ? { dpiaStatus: input.dpiaStatus } : {}),
			...(input.dpiaNotes !== undefined ? { dpiaNotes: input.dpiaNotes.trim() } : {}),
			...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
			...(input.nextReviewAt !== undefined
				? { nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null }
				: {}),
			lastReviewedAt: new Date(),
			...(actorId ? { updatedBy: actorId } : {}),
		},
		{ new: true },
	).lean();

	if (!doc) return null;

	if (actorId) {
		await recordAuditEvent({
			action: "ai_system.updated",
			category: "admin",
			actorId,
			summary: `Updated AI system “${doc.name}”`,
			targetType: "ai_system",
			targetId: id,
			details: input,
		});
	}

	return toRecord(doc);
}

export async function deleteAiSystem(id: string, actorId?: string): Promise<boolean> {
	const doc = await AiSystemInventoryModel.findByIdAndDelete(id).lean();
	if (!doc) return false;
	if (actorId) {
		await recordAuditEvent({
			action: "ai_system.deleted",
			category: "admin",
			actorId,
			summary: `Removed AI system “${doc.name}”`,
			targetType: "ai_system",
			targetId: id,
			severity: "medium",
		});
	}
	return true;
}

export async function getAiSystemStats() {
	await syncInventoryFromUsage();
	const rows = await AiSystemInventoryModel.find()
		.select("status riskTier dpiaStatus dpiaRequired")
		.lean();
	let active = 0;
	let highRisk = 0;
	let restricted = 0;
	let dpiaPending = 0;
	let dpiaOverdue = 0;

	for (const row of rows) {
		if (row.status === "active") active++;
		if (row.status === "restricted") restricted++;
		if (row.riskTier === "high" || row.riskTier === "unacceptable") highRisk++;
		if (row.dpiaStatus === "pending" || row.dpiaStatus === "in_progress") dpiaPending++;
		if (row.dpiaStatus === "overdue") dpiaOverdue++;
	}

	return {
		total: rows.length,
		active,
		highRisk,
		restricted,
		dpiaPending,
		dpiaOverdue,
	};
}
