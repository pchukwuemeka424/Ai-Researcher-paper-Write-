"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
	IconChevronRight,
	IconFileText,
	IconLightbulb,
	IconTrash,
} from "@/components/ui/ButtonIcon";
import type { SavedResearchPaper } from "@/lib/chat-research-storage";
import { getDisciplineLabel } from "@/lib/research-disciplines";
import { SCOPE_OPTIONS, type ResearchSession } from "@/lib/research-ideas";
import { savedResearchPagePath } from "@/lib/saved-research-routes";

type Props = {
	sessions: ResearchSession[];
	papers: SavedResearchPaper[];
	onOpenSession: (session: ResearchSession) => void;
	onRemoveSession: (sessionId: string) => void;
	showTopicHistory?: boolean;
	paperVariant?: "lecturer" | "student";
};

type HistoryTab = "topics" | "papers";

function formatWhen(iso: string): string {
	try {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(new Date(iso));
	} catch {
		return iso;
	}
}

export function StudentResearchHistory({
	sessions,
	papers,
	onOpenSession,
	onRemoveSession,
	showTopicHistory = true,
	paperVariant = "student",
}: Props) {
	const [tab, setTab] = useState<HistoryTab>(showTopicHistory ? "topics" : "papers");

	const sortedSessions = useMemo(
		() => [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
		[sessions],
	);

	const sortedPapers = useMemo(
		() => [...papers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
		[papers],
	);

	return (
		<>
			<div className="research-history-tabs" role="tablist" aria-label="Research history">
				{showTopicHistory && (
					<button
						type="button"
						role="tab"
						className={tab === "topics" ? "research-history-tab active" : "research-history-tab"}
						aria-selected={tab === "topics"}
						onClick={() => setTab("topics")}
					>
						<IconLightbulb size={14} />
						Topic ideas
						{sessions.length > 0 && <span className="research-history-tab-count">{sessions.length}</span>}
					</button>
				)}
				<button
					type="button"
					role="tab"
					className={tab === "papers" ? "research-history-tab active" : "research-history-tab"}
					aria-selected={tab === "papers"}
					onClick={() => setTab("papers")}
				>
					<IconFileText size={14} />
					Research papers
					{papers.length > 0 && <span className="research-history-tab-count">{papers.length}</span>}
				</button>
			</div>

			{tab === "topics" && showTopicHistory ? (
				sortedSessions.length === 0 ? (
					<div className="research-empty">
						<h3>No saved topic generations yet</h3>
						<p>Every time you generate ideas, your topic and results are saved here automatically.</p>
					</div>
				) : (
					<ul className="research-history-list">
						{sortedSessions.map((session) => {
							const scopeLabel = SCOPE_OPTIONS.find((s) => s.id === session.scope)?.label ?? session.scope;
							return (
								<li key={session.id} className="research-history-row">
									<button
										type="button"
										className="research-history-item"
										onClick={() => onOpenSession(session)}
									>
										<span className="research-history-item-title">{session.topic}</span>
										<span className="research-history-item-meta">
											{getDisciplineLabel(session.discipline)} · {scopeLabel} · {session.ideas.length}{" "}
											ideas
										</span>
										<span className="research-history-item-date">{formatWhen(session.createdAt)}</span>
									</button>
									<button
										type="button"
										className="research-history-remove"
										aria-label={`Remove saved topic: ${session.topic}`}
										onClick={() => onRemoveSession(session.id)}
									>
										<IconTrash size={14} />
									</button>
								</li>
							);
						})}
					</ul>
				)
			) : sortedPapers.length === 0 ? (
				<div className="research-empty">
					<h3>No research papers yet</h3>
					<p>Generate a full paper from any idea card — it will appear here once saved.</p>
				</div>
			) : (
				<ul className="research-history-list">
					{sortedPapers.map((paper) => (
						<li key={paper.id} className="research-history-row">
							<Link
								href={savedResearchPagePath(paper.id, paperVariant)}
								className="research-history-item"
							>
								<span className="research-history-item-title">{paper.title || paper.topic}</span>
								<span className="research-history-item-meta">{paper.topic}</span>
								<span className="research-history-item-date">{formatWhen(paper.updatedAt)}</span>
							</Link>
							<Link
								href={savedResearchPagePath(paper.id, paperVariant)}
								className="research-history-open"
								aria-label={`Open saved research: ${paper.title || paper.topic}`}
							>
								<IconChevronRight size={16} />
							</Link>
						</li>
					))}
				</ul>
			)}

		</>
	);
}
