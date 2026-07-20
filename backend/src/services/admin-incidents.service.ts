import { GovernanceIncidentModel } from "../db/models/GovernanceIncident.js";
import { recordAuditEvent } from "./admin-audit.service.js";

export type IncidentKind =
	| "policy_breach"
	| "sensitive_data"
	| "unauthorized_use"
	| "model_failure"
	| "third_party"
	| "academic_misconduct"
	| "other";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "investigating" | "contained" | "resolved" | "closed";

export type GovernanceIncidentRecord = {
	id: string;
	title: string;
	description: string;
	kind: IncidentKind;
	severity: IncidentSeverity;
	status: IncidentStatus;
	faculty: string | null;
	department: string | null;
	reportedByName: string;
	reportedByEmail: string;
	assigneeName: string;
	impactSummary: string;
	containmentActions: string;
	rootCause: string;
	lessonsLearned: string;
	linkedAuditId: string | null;
	linkedSystemId: string | null;
	detectedAt: string;
	resolvedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

function toRecord(doc: {
	_id: { toString(): string };
	title: string;
	description?: string | null;
	kind: string;
	severity: string;
	status: string;
	faculty?: string | null;
	department?: string | null;
	reportedByName?: string | null;
	reportedByEmail?: string | null;
	assigneeName?: string | null;
	impactSummary?: string | null;
	containmentActions?: string | null;
	rootCause?: string | null;
	lessonsLearned?: string | null;
	linkedAuditId?: string | null;
	linkedSystemId?: string | null;
	detectedAt?: Date | null;
	resolvedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}): GovernanceIncidentRecord {
	return {
		id: doc._id.toString(),
		title: doc.title,
		description: doc.description ?? "",
		kind: doc.kind as IncidentKind,
		severity: doc.severity as IncidentSeverity,
		status: doc.status as IncidentStatus,
		faculty: doc.faculty ?? null,
		department: doc.department ?? null,
		reportedByName: doc.reportedByName ?? "",
		reportedByEmail: doc.reportedByEmail ?? "",
		assigneeName: doc.assigneeName ?? "",
		impactSummary: doc.impactSummary ?? "",
		containmentActions: doc.containmentActions ?? "",
		rootCause: doc.rootCause ?? "",
		lessonsLearned: doc.lessonsLearned ?? "",
		linkedAuditId: doc.linkedAuditId ?? null,
		linkedSystemId: doc.linkedSystemId ?? null,
		detectedAt: (doc.detectedAt ?? doc.createdAt).toISOString(),
		resolvedAt: doc.resolvedAt?.toISOString() ?? null,
		createdAt: doc.createdAt.toISOString(),
		updatedAt: doc.updatedAt.toISOString(),
	};
}

export async function listIncidents(options: {
	status?: string;
	severity?: string;
	kind?: string;
	limit?: number;
} = {}) {
	const filter: Record<string, unknown> = {};
	if (options.status) filter.status = options.status;
	if (options.severity) filter.severity = options.severity;
	if (options.kind) filter.kind = options.kind;
	const limit = Math.min(Math.max(options.limit ?? 100, 1), 300);
	const rows = await GovernanceIncidentModel.find(filter)
		.sort({ createdAt: -1 })
		.limit(limit)
		.lean();
	return rows.map(toRecord);
}

export async function createIncident(
	input: {
		title: string;
		description?: string;
		kind: IncidentKind;
		severity?: IncidentSeverity;
		faculty?: string;
		department?: string;
		reportedByName?: string;
		reportedByEmail?: string;
		assigneeName?: string;
		impactSummary?: string;
		linkedAuditId?: string;
		linkedSystemId?: string;
	},
	actorId?: string,
) {
	const doc = await GovernanceIncidentModel.create({
		title: input.title.trim(),
		description: input.description?.trim() ?? "",
		kind: input.kind,
		severity: input.severity ?? "medium",
		status: "open",
		faculty: input.faculty?.trim(),
		department: input.department?.trim(),
		reportedByName: input.reportedByName?.trim() ?? "",
		reportedByEmail: input.reportedByEmail?.trim() ?? "",
		assigneeName: input.assigneeName?.trim() ?? "",
		impactSummary: input.impactSummary?.trim() ?? "",
		linkedAuditId: input.linkedAuditId,
		linkedSystemId: input.linkedSystemId,
		detectedAt: new Date(),
		createdBy: actorId,
		updatedBy: actorId,
	});

	if (actorId) {
		await recordAuditEvent({
			action: "incident.opened",
			category: "security",
			actorId,
			summary: `Opened ${doc.severity} incident “${doc.title}”`,
			targetType: "governance_incident",
			targetId: doc._id.toString(),
			severity: doc.severity === "critical" || doc.severity === "high" ? "high" : "medium",
			flagged: true,
			flagReason: `Incident: ${doc.kind}`,
			faculty: doc.faculty ?? undefined,
			department: doc.department ?? undefined,
		});
	}

	return toRecord(doc.toObject());
}

export async function updateIncident(
	id: string,
	input: Partial<{
		title: string;
		description: string;
		kind: IncidentKind;
		severity: IncidentSeverity;
		status: IncidentStatus;
		faculty: string;
		department: string;
		reportedByName: string;
		reportedByEmail: string;
		assigneeName: string;
		impactSummary: string;
		containmentActions: string;
		rootCause: string;
		lessonsLearned: string;
		linkedAuditId: string;
		linkedSystemId: string;
	}>,
	actorId?: string,
) {
	const closing =
		input.status === "resolved" || input.status === "closed"
			? { resolvedAt: new Date() }
			: {};

	const doc = await GovernanceIncidentModel.findByIdAndUpdate(
		id,
		{
			...(input.title !== undefined ? { title: input.title.trim() } : {}),
			...(input.description !== undefined ? { description: input.description.trim() } : {}),
			...(input.kind !== undefined ? { kind: input.kind } : {}),
			...(input.severity !== undefined ? { severity: input.severity } : {}),
			...(input.status !== undefined ? { status: input.status } : {}),
			...(input.faculty !== undefined ? { faculty: input.faculty.trim() } : {}),
			...(input.department !== undefined ? { department: input.department.trim() } : {}),
			...(input.reportedByName !== undefined ? { reportedByName: input.reportedByName.trim() } : {}),
			...(input.reportedByEmail !== undefined
				? { reportedByEmail: input.reportedByEmail.trim() }
				: {}),
			...(input.assigneeName !== undefined ? { assigneeName: input.assigneeName.trim() } : {}),
			...(input.impactSummary !== undefined ? { impactSummary: input.impactSummary.trim() } : {}),
			...(input.containmentActions !== undefined
				? { containmentActions: input.containmentActions.trim() }
				: {}),
			...(input.rootCause !== undefined ? { rootCause: input.rootCause.trim() } : {}),
			...(input.lessonsLearned !== undefined ? { lessonsLearned: input.lessonsLearned.trim() } : {}),
			...(input.linkedAuditId !== undefined ? { linkedAuditId: input.linkedAuditId } : {}),
			...(input.linkedSystemId !== undefined ? { linkedSystemId: input.linkedSystemId } : {}),
			...closing,
			...(actorId ? { updatedBy: actorId } : {}),
		},
		{ new: true },
	).lean();

	if (!doc) return null;

	if (actorId && input.status) {
		await recordAuditEvent({
			action: `incident.${input.status}`,
			category: "security",
			actorId,
			summary: `Incident “${doc.title}” → ${input.status}`,
			targetType: "governance_incident",
			targetId: id,
			severity: doc.severity === "critical" ? "critical" : "medium",
			flagged: input.status === "open" || input.status === "investigating",
		});
	}

	return toRecord(doc);
}

export async function getIncidentStats() {
	const [total, open, investigating, contained, critical, high] = await Promise.all([
		GovernanceIncidentModel.countDocuments(),
		GovernanceIncidentModel.countDocuments({ status: "open" }),
		GovernanceIncidentModel.countDocuments({ status: "investigating" }),
		GovernanceIncidentModel.countDocuments({ status: "contained" }),
		GovernanceIncidentModel.countDocuments({
			severity: "critical",
			status: { $in: ["open", "investigating", "contained"] },
		}),
		GovernanceIncidentModel.countDocuments({
			severity: "high",
			status: { $in: ["open", "investigating", "contained"] },
		}),
	]);
	return {
		total,
		open,
		investigating,
		contained,
		active: open + investigating + contained,
		critical,
		high,
	};
}
