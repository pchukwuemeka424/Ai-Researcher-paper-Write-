import { ResearchProvenanceRecordModel } from "../db/models/ResearchProvenanceRecord.js";
import { recordAuditEvent } from "./admin-audit.service.js";

export type ProvenanceOutputType =
	| "paper"
	| "outline"
	| "draft"
	| "idea"
	| "note"
	| "dataset"
	| "other";

export type ProvenanceStatus = "available" | "under_review" | "cleared" | "escalated";

export type ProvenanceEvent = {
	at: string;
	action: string;
	agentOrTool: string;
	model: string;
	summary: string;
	humanEdited: boolean;
};

export type ResearchProvenanceRecord = {
	id: string;
	outputRef: string;
	outputTitle: string;
	outputType: ProvenanceOutputType;
	ownerId: string | null;
	ownerName: string;
	ownerEmail: string;
	faculty: string | null;
	department: string | null;
	status: ProvenanceStatus;
	privacyRedacted: boolean;
	events: ProvenanceEvent[];
	reviewNotes: string;
	reviewedByName: string;
	reviewedAt: string | null;
	accessGrantedTo: string[];
	createdAt: string;
	updatedAt: string;
};

function toRecord(doc: {
	_id: { toString(): string };
	outputRef: string;
	outputTitle: string;
	outputType: string;
	ownerId?: { toString(): string } | null;
	ownerName?: string | null;
	ownerEmail?: string | null;
	faculty?: string | null;
	department?: string | null;
	status: string;
	privacyRedacted?: boolean;
	events?: Array<{
		at: Date | string;
		action: string;
		agentOrTool?: string | null;
		model?: string | null;
		summary?: string | null;
		humanEdited?: boolean;
	}>;
	reviewNotes?: string | null;
	reviewedByName?: string | null;
	reviewedAt?: Date | null;
	accessGrantedTo?: string[];
	createdAt: Date;
	updatedAt: Date;
}): ResearchProvenanceRecord {
	return {
		id: doc._id.toString(),
		outputRef: doc.outputRef,
		outputTitle: doc.outputTitle,
		outputType: doc.outputType as ProvenanceOutputType,
		ownerId: doc.ownerId?.toString() ?? null,
		ownerName: doc.ownerName ?? "",
		ownerEmail: doc.ownerEmail ?? "",
		faculty: doc.faculty ?? null,
		department: doc.department ?? null,
		status: doc.status as ProvenanceStatus,
		privacyRedacted: doc.privacyRedacted !== false,
		events: (doc.events ?? []).map((e) => ({
			at: e.at instanceof Date ? e.at.toISOString() : String(e.at),
			action: e.action,
			agentOrTool: e.agentOrTool ?? "",
			model: e.model ?? "",
			summary: e.summary ?? "",
			humanEdited: Boolean(e.humanEdited),
		})),
		reviewNotes: doc.reviewNotes ?? "",
		reviewedByName: doc.reviewedByName ?? "",
		reviewedAt: doc.reviewedAt?.toISOString() ?? null,
		accessGrantedTo: doc.accessGrantedTo ?? [],
		createdAt: doc.createdAt.toISOString(),
		updatedAt: doc.updatedAt.toISOString(),
	};
}

export async function listProvenanceRecords(options: {
	status?: string;
	outputType?: string;
	limit?: number;
} = {}) {
	const filter: Record<string, unknown> = {};
	if (options.status) filter.status = options.status;
	if (options.outputType) filter.outputType = options.outputType;
	const limit = Math.min(Math.max(options.limit ?? 100, 1), 300);
	const rows = await ResearchProvenanceRecordModel.find(filter)
		.sort({ createdAt: -1 })
		.limit(limit)
		.lean();
	return rows.map(toRecord);
}

export async function createProvenanceRecord(
	input: {
		outputRef: string;
		outputTitle: string;
		outputType?: ProvenanceOutputType;
		ownerId?: string;
		ownerName?: string;
		ownerEmail?: string;
		faculty?: string;
		department?: string;
		events?: Array<{
			at?: string;
			action: string;
			agentOrTool?: string;
			model?: string;
			summary?: string;
			humanEdited?: boolean;
		}>;
	},
	actorId?: string,
) {
	const doc = await ResearchProvenanceRecordModel.create({
		outputRef: input.outputRef.trim(),
		outputTitle: input.outputTitle.trim(),
		outputType: input.outputType ?? "draft",
		ownerId: input.ownerId,
		ownerName: input.ownerName?.trim() ?? "",
		ownerEmail: input.ownerEmail?.trim() ?? "",
		faculty: input.faculty?.trim(),
		department: input.department?.trim(),
		privacyRedacted: true,
		events: (input.events ?? []).map((e) => ({
			at: e.at ? new Date(e.at) : new Date(),
			action: e.action.trim(),
			agentOrTool: e.agentOrTool?.trim() ?? "",
			model: e.model?.trim() ?? "",
			summary: e.summary?.trim() ?? "",
			humanEdited: Boolean(e.humanEdited),
		})),
	});

	if (actorId) {
		await recordAuditEvent({
			action: "provenance.recorded",
			category: "ai_use",
			actorId,
			summary: `Recorded provenance for “${doc.outputTitle}”`,
			targetType: "research_provenance",
			targetId: doc._id.toString(),
			details: { outputRef: doc.outputRef, eventCount: doc.events?.length ?? 0 },
			faculty: doc.faculty ?? undefined,
			department: doc.department ?? undefined,
		});
	}

	return toRecord(doc.toObject());
}

export async function reviewProvenanceRecord(
	id: string,
	input: {
		status?: ProvenanceStatus;
		reviewNotes?: string;
		accessGrantedTo?: string[];
	},
	actorId: string,
	actorName?: string,
) {
	const doc = await ResearchProvenanceRecordModel.findByIdAndUpdate(
		id,
		{
			...(input.status !== undefined ? { status: input.status } : {}),
			...(input.reviewNotes !== undefined ? { reviewNotes: input.reviewNotes.trim() } : {}),
			...(input.accessGrantedTo !== undefined ? { accessGrantedTo: input.accessGrantedTo } : {}),
			reviewedAt: new Date(),
			reviewedBy: actorId,
			reviewedByName: actorName ?? "",
		},
		{ new: true },
	).lean();

	if (!doc) return null;

	await recordAuditEvent({
		action: "provenance.reviewed",
		category: "admin",
		actorId,
		summary: `Reviewed provenance for “${doc.outputTitle}” (${doc.status})`,
		targetType: "research_provenance",
		targetId: id,
		severity: doc.status === "escalated" ? "high" : "info",
		flagged: doc.status === "escalated",
		flagReason: doc.status === "escalated" ? "Provenance escalated for integrity review" : undefined,
	});

	return toRecord(doc);
}

export async function getProvenanceStats() {
	const [total, underReview, cleared, escalated, available] = await Promise.all([
		ResearchProvenanceRecordModel.countDocuments(),
		ResearchProvenanceRecordModel.countDocuments({ status: "under_review" }),
		ResearchProvenanceRecordModel.countDocuments({ status: "cleared" }),
		ResearchProvenanceRecordModel.countDocuments({ status: "escalated" }),
		ResearchProvenanceRecordModel.countDocuments({ status: "available" }),
	]);
	return { total, underReview, cleared, escalated, available };
}
