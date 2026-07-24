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
	ip?: string | null;
	userAgent?: string | null;
	sessionId?: string | null;
	beforeValue?: string | null;
	afterValue?: string | null;
	status?: string | null;
};

export type PlatformOverview = {
	widgets: {
		totalUsers: number;
		activeUsersToday: number;
		newUsersThisWeek: number;
		totalFaculties: number;
		totalDepartments: number;
		totalProgrammes: number;
		aiRequestsToday: number;
		aiRequestsThisMonth: number;
		totalResearchProjects: number;
		totalAiConversations: number;
		totalDocumentsGenerated: number;
		totalAiContributionStatements: number;
		totalGovernanceAlerts: number;
		openIncidents: number;
		closedIncidents: number;
		policyViolations: number;
		highRiskActivities: number;
		totalTokensUsed: number;
		estimatedAiCost: number;
		systemHealth: "healthy" | "degraded" | "down" | string;
		aiServiceStatus: "operational" | "degraded" | "outage" | string;
		storageUsageGb: number;
		apiStatus: "operational" | "degraded" | "outage" | string;
		platformUptimePercent: number;
	};
	charts: {
		dailyAiUsage: Array<{ name: string; value: number }>;
		facultyUsage: Array<{ name: string; value: number }>;
		departmentUsage: Array<{ name: string; value: number }>;
		monthlyGrowth: Array<{ name: string; value: number }>;
		aiModelUsage: Array<{ name: string; value: number }>;
		tokenConsumptionTrend: Array<{ name: string; value: number }>;
		incidentTrend: Array<{ name: string; value: number }>;
		policyViolationTrend: Array<{ name: string; value: number }>;
	};
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
	alerts: AlertStats;
	approvals: ApprovalStats;
	risks: RiskStats;
	compliance: ComplianceStats;
	incidents: IncidentStats;
	inventory: AiSystemStats;
	contributions: ContributionStats;
	provenance: ProvenanceStats;
	privacy: PrivacyStats;
	retention: RetentionStats;
	topRisks: GovernanceRiskRecord[];
	activeIncidents: GovernanceIncidentRecord[];
	activeAlerts: GovernanceAlertRecord[];
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
	userInvolvedName: string;
	assigneeName: string;
	impactSummary: string;
	evidence: string[];
	containmentActions: string;
	rootCause: string;
	lessonsLearned: string;
	linkedAuditId: string | null;
	linkedSystemId: string | null;
	timeline: Array<{ at: string; actorName: string; action: string; note: string }>;
	detectedAt: string;
	resolvedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type IncidentStats = {
	total: number;
	open: number;
	new?: number;
	assigned?: number;
	investigating: number;
	underInvestigation?: number;
	contained: number;
	waitingForResponse?: number;
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

export type GovernanceAlertRecord = {
	id: string;
	title: string;
	summary: string;
	kind: string;
	severity: string;
	status: string;
	faculty: string | null;
	department: string | null;
	actorEmail: string | null;
	actorName: string | null;
	actorRole: string | null;
	assigneeName: string | null;
	linkedAuditId: string | null;
	linkedIncidentId: string | null;
	context: unknown;
	responseNotes: string;
	notificationSent: boolean;
	acknowledgedAt: string | null;
	resolvedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type AlertStats = {
	total: number;
	open: number;
	acknowledged: number;
	investigating: number;
	escalated?: number;
	active: number;
	critical: number;
	high: number;
	last24h: number;
};

export type AiContributionStatementRecord = {
	id: string;
	outputRef: string;
	outputTitle: string;
	outputType: string;
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

export type ContributionStats = {
	total: number;
	verified: number;
	incomplete: number;
	aiAssisted: number;
	humanEdited: number;
	pendingVerification: number;
};

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
	outputType: string;
	ownerId: string | null;
	ownerName: string;
	ownerEmail: string;
	faculty: string | null;
	department: string | null;
	status: string;
	privacyRedacted: boolean;
	events: ProvenanceEvent[];
	reviewNotes: string;
	reviewedByName: string;
	reviewedAt: string | null;
	accessGrantedTo: string[];
	createdAt: string;
	updatedAt: string;
};

export type ProvenanceStats = {
	total: number;
	underReview: number;
	cleared: number;
	escalated: number;
	available: number;
};

export type ResearchPrivacySettingRecord = {
	id: string;
	name: string;
	description: string;
	dataClass: string;
	scope: string;
	faculties: string[];
	roles: string[];
	features: string[];
	adminRawAccess: string;
	allowGovernanceMetadata: boolean;
	allowProvenanceReview: boolean;
	redactPiiInLogs: boolean;
	requireExplicitAuthorisation: boolean;
	enabled: boolean;
	priority: number;
	createdAt: string;
	updatedAt: string;
};

export type PrivacyStats = {
	total: number;
	enabled: number;
	neverRaw: number;
	restricted: number;
	special: number;
	disabled: number;
};

export type RetentionPolicyRecord = {
	id: string;
	name: string;
	description: string;
	dataCategory: string;
	retainDays: number;
	archiveDays: number;
	actionOnExpiry: string;
	legalHold: boolean;
	enabled: boolean;
	regulatoryBasis: string;
	createdAt: string;
	updatedAt: string;
};

export type DeletionRequestRecord = {
	id: string;
	subjectName: string;
	subjectEmail: string;
	subjectUserId: string | null;
	requestType: string;
	status: string;
	scope: string;
	notes: string;
	legalHold: boolean;
	dueAt: string | null;
	completedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type RetentionStats = {
	policies: number;
	enabled: number;
	legalHolds: number;
	deletionTotal: number;
	deletionOpen: number;
	deletionCompleted: number;
};
