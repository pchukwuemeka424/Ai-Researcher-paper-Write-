"use client";

import { useState } from "react";

import { AdminSessionDetailModal } from "@/components/admin/AdminSessionDetailModal";
import { deleteAdminSession, stopAdminSession } from "@/lib/admin-api";
import type { RecentSessionTopic } from "@/lib/dashboard";

function isLive(state: string): boolean {
	return state === "running" || state === "starting";
}

type Props = {
	session: RecentSessionTopic;
	onChange: () => void;
	compact?: boolean;
	showLabels?: boolean;
};

export function AdminSessionRowActions({ session, onChange, compact, showLabels }: Props) {
	const [detailOpen, setDetailOpen] = useState(false);
	const [working, setWorking] = useState(false);
	const [copied, setCopied] = useState(false);

	const copyTopic = async () => {
		try {
			await navigator.clipboard.writeText(session.topic);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard unavailable */
		}
	};

	const handleStop = async () => {
		if (!window.confirm(`Stop session "${session.topic}"?`)) return;
		setWorking(true);
		try {
			await stopAdminSession(session.id);
			onChange();
		} finally {
			setWorking(false);
		}
	};

	const handleDelete = async () => {
		if (!window.confirm(`Delete session "${session.topic}" and all its messages?`)) return;
		setWorking(true);
		try {
			await deleteAdminSession(session.id);
			onChange();
		} finally {
			setWorking(false);
		}
	};

	return (
		<>
			<div className={`admin-session-actions${compact ? " admin-session-actions-compact" : ""}`}>
				<button
					type="button"
					className="admin-session-action-btn"
					onClick={() => setDetailOpen(true)}
					title="View details"
					disabled={working}
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
						<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
						<circle cx="12" cy="12" r="3" />
					</svg>
					{(!compact || showLabels) && <span>Details</span>}
				</button>
				<button
					type="button"
					className="admin-session-action-btn"
					onClick={() => void copyTopic()}
					title="Copy topic"
					disabled={working}
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
						<rect x="9" y="9" width="13" height="13" rx="2" />
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
					</svg>
					{(!compact || showLabels) && (
						<span>{copied ? "Copied" : "Copy"}</span>
					)}
				</button>
				{isLive(session.state) && (
					<button
						type="button"
						className="admin-session-action-btn admin-session-action-warning"
						onClick={() => void handleStop()}
						title="Stop session"
						disabled={working}
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
							<rect x="6" y="6" width="12" height="12" rx="1" />
						</svg>
						{(!compact || showLabels) && <span>Stop</span>}
					</button>
				)}
				<button
					type="button"
					className="admin-session-action-btn admin-session-action-danger"
					onClick={() => void handleDelete()}
					title="Delete session"
					disabled={working}
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
						<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
					</svg>
					{(!compact || showLabels) && <span>Delete</span>}
				</button>
			</div>
			{detailOpen && (
				<AdminSessionDetailModal session={session} onClose={() => setDetailOpen(false)} />
			)}
		</>
	);
}

export function sessionTopicLabel(session: RecentSessionTopic): string {
	return session.topic;
}

export function SessionStateBadge({ state }: { state: string }) {
	return (
		<span className={`dash-badge dash-badge-state-${state}`}>
			{state}
		</span>
	);
}
