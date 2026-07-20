export type UsageBreakdownRow = {
	key: string;
	label: string;
	users: number;
	activeUsers: number;
	tokensUsed: number;
	sessions: number;
	ideaSessions: number;
	papers: number;
	projects: number;
	intensity: number;
};

export type UsageAnalytics = {
	totals: {
		users: number;
		activeUsers: number;
		tokensUsed: number;
		sessions: number;
		ideaSessions: number;
		papers: number;
		projects: number;
	};
	byFaculty: UsageBreakdownRow[];
	byDepartment: UsageBreakdownRow[];
	byProgramme: UsageBreakdownRow[];
	byCohort: UsageBreakdownRow[];
	byRole: UsageBreakdownRow[];
	byFeature: Array<{ feature: string; count: number; label: string }>;
};

export type PolicyEffect = "permitted" | "restricted" | "blocked";
export type PolicyScope = "feature" | "dataset" | "tool" | "use_case" | "content";

export type GovernancePolicyRecord = {
	id: string;
	name: string;
	description: string;
	scope: PolicyScope;
	target: string;
	effect: PolicyEffect;
	roles: string[];
	faculties: string[];
	enabled: boolean;
	priority: number;
	createdAt: string;
	updatedAt: string;
};

export type PolicyStats = {
	total: number;
	permitted: number;
	restricted: number;
	blocked: number;
	disabled: number;
};

export type PolicyEvaluation = {
	effect: PolicyEffect;
	matchedPolicyId: string | null;
	matchedPolicyName: string | null;
	reason: string;
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

export type AuditAlertStats = {
	total: number;
	flagged: number;
	critical: number;
	high: number;
	last24h: number;
};

export type ApprovalKind = "tool" | "dataset" | "use_case" | "model" | "integration";
export type ApprovalStatus = "pending" | "under_review" | "approved" | "rejected" | "withdrawn";

export type ApprovalRequestRecord = {
	id: string;
	title: string;
	description: string;
	kind: ApprovalKind;
	status: ApprovalStatus;
	requesterId: string;
	requesterName: string | null;
	requesterEmail: string | null;
	faculty: string | null;
	department: string | null;
	justification: string;
	riskNotes: string;
	reviewerId: string | null;
	reviewerName: string | null;
	reviewNotes: string;
	decidedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ApprovalStats = {
	total: number;
	pending: number;
	underReview: number;
	approved: number;
	rejected: number;
};

export type GovernanceReportAudience = "management" | "senate" | "both";

export type GovernanceReportRecord = {
	id: string;
	title: string;
	audience: GovernanceReportAudience;
	periodStart: string;
	periodEnd: string;
	status: string;
	summary: string;
	sections: Array<{ heading: string; body: string; metrics?: unknown }>;
	metrics: unknown;
	generatedBy: string | null;
	generatedByName: string | null;
	createdAt: string;
	updatedAt: string;
};

export type GovernanceDashboard = {
	platform: {
		userCount: number;
		activeUsers: number;
		sessionCount: number;
		messageCount: number;
		activeSessions: number;
	};
	aiUsage: {
		totals: UsageAnalytics["totals"];
		byFaculty: UsageBreakdownRow[];
		byFeature: UsageAnalytics["byFeature"];
	};
	policies: PolicyStats;
	audit: AuditAlertStats;
	approvals: ApprovalStats;
	risks: RiskStats;
	compliance: ComplianceStats;
	incidents: IncidentStats;
	inventory: AiSystemStats;
	topRisks: GovernanceRiskRecord[];
	activeIncidents: GovernanceIncidentRecord[];
	highRiskSystems: AiSystemRecord[];
	recentFlags: AuditLogRecord[];
	pendingApprovals: ApprovalRequestRecord[];
	recentReports: GovernanceReportRecord[];
};

export type GovernanceRiskRecord = {
	id: string;
	title: string;
	description: string;
	category: string;
	status: string;
	likelihood: number;
	impact: number;
	inherentScore: number;
	residualLikelihood: number | null;
	residualImpact: number | null;
	residualScore: number | null;
	faculty: string | null;
	department: string | null;
	ownerName: string;
	controls: string;
	treatmentPlan: string;
	linkedSystemId: string | null;
	reviewDueAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type RiskStats = {
	total: number;
	open: number;
	mitigating: number;
	accepted: number;
	closed: number;
	highInherent: number;
	highResidual: number;
	avgInherent: number;
	avgResidual: number;
};

export type ComplianceControlRecord = {
	id: string;
	code: string;
	title: string;
	description: string;
	framework: string;
	domain: string;
	status: string;
	evidence: string;
	ownerName: string;
	priority: string;
	lastAssessedAt: string | null;
	nextReviewAt: string | null;
	notes: string;
	createdAt: string;
	updatedAt: string;
};

export type ComplianceStats = {
	total: number;
	compliant: number;
	gap: number;
	inProgress: number;
	notStarted: number;
	criticalGaps: number;
	score: number;
	byFramework: Record<string, { total: number; compliant: number; gap: number }>;
};

export type GovernanceIncidentRecord = {
	id: string;
	title: string;
	description: string;
	kind: string;
	severity: string;
	status: string;
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

export type IncidentStats = {
	total: number;
	open: number;
	investigating: number;
	contained: number;
	active: number;
	critical: number;
	high: number;
};

export type AiSystemRecord = {
	id: string;
	name: string;
	vendor: string;
	purpose: string;
	category: string;
	deployment: string;
	riskTier: string;
	status: string;
	dataClasses: string[];
	facultiesAllowed: string[];
	rolesAllowed: string[];
	ownerName: string;
	dpiaRequired: boolean;
	dpiaStatus: string;
	dpiaNotes: string;
	lastReviewedAt: string | null;
	nextReviewAt: string | null;
	approvalRequestId: string | null;
	notes: string;
	createdAt: string;
	updatedAt: string;
};

export type AiSystemStats = {
	total: number;
	active: number;
	highRisk: number;
	restricted: number;
	dpiaPending: number;
	dpiaOverdue: number;
};
