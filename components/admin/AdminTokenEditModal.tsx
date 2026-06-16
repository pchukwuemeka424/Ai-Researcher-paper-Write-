"use client";

import { useState } from "react";

import { updateAdminTokens } from "@/lib/admin-api";
import type { AdminTokenRecord } from "@/lib/admin";
import {
	LECTURER_TOKEN_ALLOWANCE,
	STUDENT_TOKEN_ALLOWANCE,
} from "@/lib/student-tokens";

export function formatTokenCount(value: number): string {
	return value.toLocaleString();
}

export function tokenUsagePercent(used: number, allowance: number): number {
	if (allowance <= 0) return 0;
	return Math.min(100, Math.round((used / allowance) * 100));
}

export function tokenAllowanceLabel(role: string): string {
	if (role === "student") return formatTokenCount(STUDENT_TOKEN_ALLOWANCE);
	if (role === "lecturer" || role === "researcher") return formatTokenCount(LECTURER_TOKEN_ALLOWANCE);
	return "N/A";
}

type TokenUser = Pick<AdminTokenRecord, "id" | "name" | "role" | "tokenQuota">;

type Props = {
	user: TokenUser;
	onClose: () => void;
	onSaved: () => Promise<void>;
};

export function AdminTokenEditModal({ user, onClose, onSaved }: Props) {
	const [tokensUsed, setTokensUsed] = useState(String(user.tokenQuota?.used ?? 0));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		try {
			const parsed = Number.parseInt(tokensUsed, 10);
			if (!Number.isFinite(parsed) || parsed < 0) {
				throw new Error("Enter a valid non-negative number.");
			}
			await updateAdminTokens(user.id, { tokensUsed: parsed });
			await onSaved();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	const handleReset = async () => {
		if (!window.confirm(`Reset tokens for ${user.name} to 0?`)) return;
		setSaving(true);
		setError(null);
		try {
			await updateAdminTokens(user.id, { reset: true });
			await onSaved();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	if (!user.tokenQuota) {
		return (
			<div className="modal-backdrop" onClick={onClose}>
				<div className="modal dash-modal" onClick={(e) => e.stopPropagation()}>
					<div className="modal-header">
						<h3>Token management</h3>
						<button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
							×
						</button>
					</div>
					<p className="dash-form muted">
						This role does not have a research token quota. Only students and lecturers can be
						managed.
					</p>
					<div className="dash-form-actions">
						<button type="button" className="primary-btn" onClick={onClose}>
							Close
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal dash-modal" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h3>Manage tokens — {user.name}</h3>
					<button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
						×
					</button>
				</div>
				<form className="dash-form" onSubmit={handleSubmit}>
					<p className="muted">Role allowance: {tokenAllowanceLabel(user.role)}</p>
					<p className="muted">
						Remaining: {formatTokenCount(user.tokenQuota.remaining)} tokens
					</p>
					<label className="field-label" htmlFor="tokens-used">
						Tokens used
					</label>
					<input
						id="tokens-used"
						type="number"
						min={0}
						className="topic-input"
						value={tokensUsed}
						onChange={(e) => setTokensUsed(e.target.value)}
						required
					/>
					{error && <p className="error-text">{error}</p>}
					<div className="dash-form-actions">
						<button type="button" className="ghost-btn" onClick={handleReset} disabled={saving}>
							Reset to 0
						</button>
						<button type="button" className="ghost-btn" onClick={onClose}>
							Cancel
						</button>
						<button type="submit" className="primary-btn" disabled={saving}>
							{saving ? "Saving…" : "Save"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export async function resetUserTokensQuick(
	user: TokenUser,
	onSaved: () => Promise<void>,
): Promise<boolean> {
	if (!user.tokenQuota) return false;
	if (!window.confirm(`Reset tokens for ${user.name} to 0?`)) return false;
	await updateAdminTokens(user.id, { reset: true });
	await onSaved();
	return true;
}

type UsageProps = {
	quota: NonNullable<AdminTokenRecord["tokenQuota"]>;
	compact?: boolean;
};

export function AdminTokenUsageCell({ quota, compact }: UsageProps) {
	const percent = tokenUsagePercent(quota.used, quota.allowance);
	return (
		<div className={compact ? "admin-token-usage-compact" : undefined}>
			<span className="dash-mono">{formatTokenCount(quota.used)}</span>
			{!compact && (
				<span className="dash-token-usage">
					<span className="dash-token-bar" style={{ width: `${percent}%` }} />
					<span className="muted">{percent}%</span>
				</span>
			)}
		</div>
	);
}
