"use client";

import type { StudentTokenQuota } from "@/lib/student-tokens";
import { researchTokenAllowance } from "@/lib/student-tokens";

type Props = {
	quota?: StudentTokenQuota;
	role?: string;
};

export function StudentTokenQuotaBar({ quota, role }: Props) {
	const allowance = quota?.allowance ?? researchTokenAllowance(role) ?? 0;
	const used = quota?.used ?? 0;
	const remaining = quota?.remaining ?? allowance;
	const percentUsed = allowance > 0 ? Math.min(100, Math.round((used / allowance) * 100)) : 0;
	const depleted = remaining <= 0;

	return (
		<div className={`stu-token-quota${depleted ? " stu-token-quota-depleted" : ""}`}>
			<div className="stu-token-quota-head">
				<span className="stu-token-quota-label">Research tokens</span>
				<span className="stu-token-quota-count">
					{remaining.toLocaleString()} / {allowance.toLocaleString()} left
				</span>
			</div>
			<div
				className="stu-token-quota-track"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={allowance}
				aria-valuenow={used}
				aria-label={`${used} of ${allowance} research tokens used`}
			>
				<div className="stu-token-quota-fill" style={{ width: `${percentUsed}%` }} />
			</div>
			<p className="stu-token-quota-meta">
				{used.toLocaleString()} used · {allowance.toLocaleString()} allocated
			</p>
			{depleted && (
				<p className="stu-token-quota-warning">
					{role === "lecturer"
						? "Token limit reached. Contact support for more."
						: "Token limit reached. Contact your instructor for more."}
				</p>
			)}
		</div>
	);
}

export function studentHasResearchTokens(quota?: StudentTokenQuota, role?: string): boolean {
	const allowance = quota?.allowance ?? researchTokenAllowance(role);
	if (!allowance) return true;
	return (quota?.remaining ?? allowance) > 0;
}
