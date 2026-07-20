import { getUsageAnalytics } from "./admin-analytics.service.js";
import { getAuditAlertStats, listAuditLogs } from "./admin-audit.service.js";
import { getApprovalStats, listApprovals } from "./admin-approvals.service.js";
import { getComplianceStats } from "./admin-compliance.service.js";
import { getIncidentStats, listIncidents } from "./admin-incidents.service.js";
import { getAiSystemStats, listAiSystems } from "./admin-inventory.service.js";
import { getPolicyStats } from "./admin-policy.service.js";
import { listGovernanceReports } from "./admin-reports.service.js";
import { getRiskStats, listRisks } from "./admin-risk.service.js";
import { getDashboardStats } from "./dashboard.service.js";

export type GovernanceDashboard = {
	platform: Awaited<ReturnType<typeof getDashboardStats>>;
	aiUsage: {
		totals: Awaited<ReturnType<typeof getUsageAnalytics>>["totals"];
		byFaculty: Awaited<ReturnType<typeof getUsageAnalytics>>["byFaculty"];
		byFeature: Awaited<ReturnType<typeof getUsageAnalytics>>["byFeature"];
	};
	policies: Awaited<ReturnType<typeof getPolicyStats>>;
	audit: Awaited<ReturnType<typeof getAuditAlertStats>>;
	approvals: Awaited<ReturnType<typeof getApprovalStats>>;
	risks: Awaited<ReturnType<typeof getRiskStats>>;
	compliance: Awaited<ReturnType<typeof getComplianceStats>>;
	incidents: Awaited<ReturnType<typeof getIncidentStats>>;
	inventory: Awaited<ReturnType<typeof getAiSystemStats>>;
	topRisks: Awaited<ReturnType<typeof listRisks>>;
	activeIncidents: Awaited<ReturnType<typeof listIncidents>>;
	highRiskSystems: Awaited<ReturnType<typeof listAiSystems>>;
	recentFlags: Awaited<ReturnType<typeof listAuditLogs>>;
	pendingApprovals: Awaited<ReturnType<typeof listApprovals>>;
	recentReports: Awaited<ReturnType<typeof listGovernanceReports>>;
};

/** Single institutional view of AI use, compliance, and risk across research. */
export async function getGovernanceDashboard(): Promise<GovernanceDashboard> {
	const [
		platform,
		analytics,
		policies,
		audit,
		approvals,
		risks,
		compliance,
		incidents,
		inventory,
		topRisks,
		activeIncidents,
		highRiskSystems,
		recentFlags,
		pendingApprovals,
		recentReports,
	] = await Promise.all([
		getDashboardStats(),
		getUsageAnalytics(),
		getPolicyStats(),
		getAuditAlertStats(),
		getApprovalStats(),
		getRiskStats(),
		getComplianceStats(),
		getIncidentStats(),
		getAiSystemStats(),
		listRisks({ status: "open" }),
		listIncidents({ status: "open", limit: 8 }),
		listAiSystems({ riskTier: "high" }),
		listAuditLogs({ flaggedOnly: true, limit: 8 }),
		listApprovals({ status: "pending", limit: 8 }),
		listGovernanceReports(5),
	]);

	return {
		platform,
		aiUsage: {
			totals: analytics.totals,
			byFaculty: analytics.byFaculty.slice(0, 8),
			byFeature: analytics.byFeature,
		},
		policies,
		audit,
		approvals,
		risks,
		compliance,
		incidents,
		inventory,
		topRisks: topRisks.slice(0, 5),
		activeIncidents,
		highRiskSystems: highRiskSystems.slice(0, 5),
		recentFlags,
		pendingApprovals,
		recentReports,
	};
}
