"use client";

import type { SavedResearchPaper } from "@/lib/chat-research-storage";
import { extractPaperTitle } from "@/lib/research-paper-title";
import { formatTokenUsage } from "@/lib/token-usage";

type Props = {
	savedPapers: SavedResearchPaper[];
	activeSavedId: string | null;
	onSelectSaved: (paper: SavedResearchPaper) => void;
	onRemoveSaved: (id: string) => void;
	onRemoveAllSaved?: () => void;
	removingSavedId?: string | null;
	onDownloadSaved: (paper: SavedResearchPaper) => void;
};

export function Sidebar({
	savedPapers,
	activeSavedId,
	onSelectSaved,
	onRemoveSaved,
	onRemoveAllSaved,
	removingSavedId = null,
	onDownloadSaved,
}: Props) {
	const isRemoving = removingSavedId !== null;

	return (
		<aside className="chat-rail" aria-label="Saved research">
			<div className="chat-rail-header">
				<div className="chat-rail-header-title">
					<span className="chat-rail-header-icon" aria-hidden>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path
								d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							<path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</span>
					<div>
						<p className="chat-rail-section-title">Library</p>
						<p className="chat-rail-section-sub">
							{savedPapers.length === 0
								? "Papers save automatically"
								: `${savedPapers.length} saved paper${savedPapers.length === 1 ? "" : "s"}`}
						</p>
					</div>
				</div>
				{savedPapers.length > 0 && onRemoveAllSaved && (
					<button
						type="button"
						className="chat-rail-clear"
						disabled={isRemoving}
						onClick={onRemoveAllSaved}
					>
						Clear all
					</button>
				)}
			</div>

			<div className="chat-rail-panel">
				<ul className="chat-rail-list">
					{savedPapers.length === 0 && (
						<li className="chat-rail-empty">
							<div className="chat-rail-empty-icon" aria-hidden>
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
									<path
										d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
							<p className="chat-rail-empty-title">No saved papers yet</p>
							<p className="chat-rail-empty-text">
								Completed papers appear here automatically when generation finishes.
							</p>
						</li>
					)}
					{savedPapers.map((paper) => (
						<li key={paper.id} className="chat-rail-item">
							<button
								type="button"
								className={`chat-rail-item-btn ${activeSavedId === paper.id ? "selected" : ""}`}
								onClick={() => onSelectSaved(paper)}
							>
								<span className="chat-rail-item-title">
									{extractPaperTitle(paper.content, paper.topic)}
								</span>
								<span className="chat-rail-item-meta">
									{new Date(paper.updatedAt).toLocaleDateString(undefined, {
										month: "short",
										day: "numeric",
										year: "numeric",
									})}
									{paper.tokenUsage && (
										<>
											{" · "}
											{formatTokenUsage(paper.tokenUsage)}
										</>
									)}
								</span>
							</button>
							<div className="chat-rail-item-actions">
								<button
									type="button"
									className="chat-rail-icon-btn"
									title="Download PDF"
									disabled={isRemoving}
									onClick={(e) => {
										e.stopPropagation();
										void onDownloadSaved(paper);
									}}
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</button>
								<button
									type="button"
									className="chat-rail-icon-btn chat-rail-icon-btn-danger"
									title="Remove saved research"
									disabled={isRemoving}
									aria-label={`Remove ${extractPaperTitle(paper.content, paper.topic)}`}
									onClick={(e) => {
										e.stopPropagation();
										onRemoveSaved(paper.id);
									}}
								>
									{removingSavedId === paper.id ? (
										"…"
									) : (
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
											<path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
										</svg>
									)}
								</button>
							</div>
						</li>
					))}
				</ul>
			</div>
		</aside>
	);
}
