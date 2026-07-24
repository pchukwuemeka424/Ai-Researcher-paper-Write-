import { AiContributionStatementModel } from "../db/models/AiContributionStatement.js";
import { recordAuditEvent } from "./admin-audit.service.js";

export type ContributionOutputType =
	| "paper"
	| "outline"
	| "draft"
	| "idea"
	| "note"
	| "dataset"
	| "other";

export type AiContributionStatementRecord = {
	id: string;
	outputRef: string;
	outputTitle: string;
	outputType: ContributionOutputType;
	ownerId: string | null;
	ownerName: string;
	ownerEmail: string;
	faculty: string | null;
	department: string | null;
	programme: string | null;
	aiAssisted: boolean;
	contributionSummary: string;
	toolsUsed: string[];
	modelNames: string[];
	humanEdited: boolean;
	disclosureComplete: boolean;
	verified: boolean;
	verifiedAt: string | null;
	verifiedByName: string;
	verificationNotes: string;
	generatedAt: string;
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
	programme?: string | null;
	aiAssisted?: boolean;
	contributionSummary?: string | null;
	toolsUsed?: string[];
	modelNames?: string[];
	humanEdited?: boolean;
	disclosureComplete?: boolean;
	verified?: boolean;
	verifiedAt?: Date | null;
	verifiedByName?: string | null;
	verificationNotes?: string | null;
	generatedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}): AiContributionStatementRecord {
	return {
		id: doc._id.toString(),
		outputRef: doc.outputRef,
		outputTitle: doc.outputTitle,
		outputType: doc.outputType as ContributionOutputType,
		ownerId: doc.ownerId?.toString() ?? null,
		ownerName: doc.ownerName ?? "",
		ownerEmail: doc.ownerEmail ?? "",
		faculty: doc.faculty ?? null,
		department: doc.department ?? null,
		programme: doc.programme ?? null,
		aiAssisted: doc.aiAssisted !== false,
		contributionSummary: doc.contributionSummary ?? "",
		toolsUsed: doc.toolsUsed ?? [],
		modelNames: doc.modelNames ?? [],
		humanEdited: Boolean(doc.humanEdited),
		disclosureComplete: Boolean(doc.disclosureComplete),
		verified: Boolean(doc.verified),
		verifiedAt: doc.verifiedAt?.toISOString() ?? null,
		verifiedByName: doc.verifiedByName ?? "",
		verificationNotes: doc.verificationNotes ?? "",
		generatedAt: (doc.generatedAt ?? doc.createdAt).toISOString(),
		createdAt: doc.createdAt.toISOString(),
		updatedAt: doc.updatedAt.toISOString(),
	};
}

export async function listContributionStatements(options: {
	verified?: boolean;
	disclosureComplete?: boolean;
	outputType?: string;
	limit?: number;
} = {}) {
	const filter: Record<string, unknown> = {};
	if (options.verified !== undefined) filter.verified = options.verified;
	if (options.disclosureComplete !== undefined) {
		filter.disclosureComplete = options.disclosureComplete;
	}
	if (options.outputType) filter.outputType = options.outputType;
	const limit = Math.min(Math.max(options.limit ?? 100, 1), 300);
	const rows = await AiContributionStatementModel.find(filter)
		.sort({ createdAt: -1 })
		.limit(limit)
		.lean();
	return rows.map(toRecord);
}

export async function createContributionStatement(
	input: {
		outputRef: string;
		outputTitle: string;
		outputType?: ContributionOutputType;
		ownerId?: string;
		ownerName?: string;
		ownerEmail?: string;
		faculty?: string;
		department?: string;
		programme?: string;
		contributionSummary?: string;
		toolsUsed?: string[];
		modelNames?: string[];
		aiAssisted?: boolean;
		humanEdited?: boolean;
		disclosureComplete?: boolean;
	},
	actorId?: string,
) {
	const doc = await AiContributionStatementModel.create({
		outputRef: input.outputRef.trim(),
		outputTitle: input.outputTitle.trim(),
		outputType: input.outputType ?? "draft",
		ownerId: input.ownerId,
		ownerName: input.ownerName?.trim() ?? "",
		ownerEmail: input.ownerEmail?.trim() ?? "",
		faculty: input.faculty?.trim(),
		department: input.department?.trim(),
		programme: input.programme?.trim(),
		contributionSummary: input.contributionSummary?.trim() ?? "",
		toolsUsed: input.toolsUsed ?? [],
		modelNames: input.modelNames ?? [],
		aiAssisted: input.aiAssisted !== false,
		humanEdited: Boolean(input.humanEdited),
		disclosureComplete: Boolean(input.disclosureComplete),
		generatedAt: new Date(),
	});

	if (actorId) {
		await recordAuditEvent({
			action: "contribution.recorded",
			category: "ai_use",
			actorId,
			summary: `Recorded AI contribution statement for “${doc.outputTitle}”`,
			targetType: "ai_contribution_statement",
			targetId: doc._id.toString(),
			details: { outputRef: doc.outputRef, outputType: doc.outputType },
			faculty: doc.faculty ?? undefined,
			department: doc.department ?? undefined,
		});
	}

	return toRecord(doc.toObject());
}

export async function verifyContributionStatement(
	id: string,
	input: { verified?: boolean; verificationNotes?: string; disclosureComplete?: boolean },
	actorId: string,
	actorName?: string,
) {
	const doc = await AiContributionStatementModel.findByIdAndUpdate(
		id,
		{
			...(input.verified !== undefined
				? {
						verified: input.verified,
						verifiedAt: input.verified ? new Date() : null,
						verifiedBy: input.verified ? actorId : null,
						verifiedByName: input.verified ? (actorName ?? "") : "",
					}
				: {}),
			...(input.verificationNotes !== undefined
				? { verificationNotes: input.verificationNotes.trim() }
				: {}),
			...(input.disclosureComplete !== undefined
				? { disclosureComplete: input.disclosureComplete }
				: {}),
		},
		{ new: true },
	).lean();

	if (!doc) return null;

	await recordAuditEvent({
		action: input.verified ? "contribution.verified" : "contribution.updated",
		category: "admin",
		actorId,
		summary: `${input.verified ? "Verified" : "Updated"} AI contribution statement for “${doc.outputTitle}”`,
		targetType: "ai_contribution_statement",
		targetId: id,
	});

	return toRecord(doc);
}

export async function getContributionStats() {
	const [total, verified, incomplete, aiAssisted, humanEdited] = await Promise.all([
		AiContributionStatementModel.countDocuments(),
		AiContributionStatementModel.countDocuments({ verified: true }),
		AiContributionStatementModel.countDocuments({ disclosureComplete: false }),
		AiContributionStatementModel.countDocuments({ aiAssisted: true }),
		AiContributionStatementModel.countDocuments({ humanEdited: true }),
	]);
	return { total, verified, incomplete, aiAssisted, humanEdited, pendingVerification: total - verified };
}
