"use client";

import { useMemo, useState } from "react";

import { NavIcon } from "@/components/aula/NavIcon";
import { Modal } from "@/components/research-note/components/Modal";
import {
	ClockIcon,
	NotebookIcon,
	PlusIcon,
	SearchIcon,
	TargetIcon,
	TrashIcon,
} from "@/components/research-note/components/icons";
import { APP_TAGLINE } from "@/components/research-note/config/branding";
import { relativeTime } from "@/components/research-note/lib/format";
import { useProjects } from "@/components/research-note/state/useProjects";

function formatDate(iso: string): string {
	try {
		return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));
	} catch {
		return iso;
	}
}

function formatDateTime(iso: string): string {
	try {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(new Date(iso));
	} catch {
		return iso;
	}
}

/** Notebook library home — aligned with GAHI research pages. */
export function Dashboard({ onOpenProject }: { onOpenProject: (projectId: string) => void }) {
	const { projects, loading, error, create, remove } = useProjects();
	const [query, setQuery] = useState("");
	const [showNew, setShowNew] = useState(false);
	const [title, setTitle] = useState("");
	const [focus, setFocus] = useState("");
	const [creating, setCreating] = useState(false);

	const sorted = useMemo(
		() => [...projects].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
		[projects],
	);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return sorted;
		return sorted.filter((p) => `${p.title} ${p.focus ?? ""}`.toLowerCase().includes(q));
	}, [sorted, query]);

	const openNew = () => {
		setTitle("");
		setFocus("");
		setShowNew(true);
	};

	const submitNew = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim() || creating) return;
		setCreating(true);
		try {
			const project = await create({ title: title.trim(), focus: focus.trim() });
			setShowNew(false);
			setTitle("");
			setFocus("");
			onOpenProject(project.id);
		} finally {
			setCreating(false);
		}
	};

	const confirmDelete = async (id: string, name: string) => {
		if (window.confirm(`Delete "${name}" and all its notes? This cannot be undone.`)) {
			await remove(id);
		}
	};

	return (
		<div className="research-page rn-dashboard">
			<header className="research-page-header">
				<div className="research-page-header-start">
					<div className="research-page-icon" aria-hidden>
						<NavIcon id="notes" size={24} />
					</div>
					<div>
						<p className="research-page-eyebrow">Workspace</p>
						<h1 className="research-page-title">Notebooks</h1>
						<p className="research-page-lead">{APP_TAGLINE}</p>
					</div>
				</div>
			</header>

			{loading ? (
				<div className="rn-dashboard-state" role="status">
					<div className="lp-spinner" aria-hidden />
					<p>Loading notebooks…</p>
				</div>
			) : error ? (
				<div className="rn-dashboard-state" role="alert">
					<p>{error}</p>
				</div>
			) : projects.length === 0 ? (
				<div className="rn-dashboard-empty">
					<div className="rn-dashboard-empty-icon" aria-hidden>
						<NotebookIcon className="h-7 w-7" />
					</div>
					<h2>No notebooks yet</h2>
					<p>
						Your research notebooks will appear here. Create a note to start capturing ideas,
						data, and drafts.
					</p>
					<button type="button" className="rn-empty-cta" onClick={openNew}>
						<PlusIcon className="h-4 w-4" />
						New Note
					</button>
				</div>
			) : (
				<>
					<div className="rn-dashboard-summary" aria-label="Notebook summary">
						<div className="rn-dashboard-stat rn-dashboard-stat-navy">
							<span className="rn-dashboard-stat-icon" aria-hidden>
								<NotebookIcon className="h-5 w-5" />
							</span>
							<div className="rn-dashboard-stat-body">
								<span className="rn-dashboard-stat-value">{projects.length}</span>
								<span className="rn-dashboard-stat-label">
									{projects.length === 1 ? "Notebook" : "Notebooks"}
								</span>
							</div>
						</div>
						<div className="rn-dashboard-stat rn-dashboard-stat-teal">
							<span className="rn-dashboard-stat-icon" aria-hidden>
								<TargetIcon className="h-5 w-5" />
							</span>
							<div className="rn-dashboard-stat-body">
								<span className="rn-dashboard-stat-value">
									{projects.filter((p) => p.focus?.trim()).length}
								</span>
								<span className="rn-dashboard-stat-label">With focus</span>
							</div>
						</div>
						<div className="rn-dashboard-stat rn-dashboard-stat-amber">
							<span className="rn-dashboard-stat-icon" aria-hidden>
								<ClockIcon className="h-5 w-5" />
							</span>
							<div className="rn-dashboard-stat-body">
								<span className="rn-dashboard-stat-value rn-dashboard-stat-value-sm">
									{sorted[0] ? relativeTime(sorted[0].updatedAt) : "—"}
								</span>
								<span className="rn-dashboard-stat-label">Last activity</span>
							</div>
						</div>
					</div>

					<div className="rn-dashboard-toolbar">
						<label className="rn-dashboard-search">
							<span className="sr-only">Filter notebooks</span>
							<SearchIcon className="rn-dashboard-search-icon" />
							<input
								type="search"
								placeholder="Filter by title or focus…"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
							/>
						</label>
						{query.trim() && (
							<p className="rn-dashboard-filter-meta">
								{filtered.length} of {projects.length}
							</p>
						)}
						<button type="button" className="rn-empty-cta rn-toolbar-cta" onClick={openNew}>
							<PlusIcon className="h-4 w-4" />
							New Note
						</button>
					</div>

					{filtered.length === 0 ? (
						<div className="rn-dashboard-empty rn-dashboard-empty-compact">
							<h2>No matching notebooks</h2>
							<p>Try a different title or focus keyword.</p>
						</div>
					) : (
						<section className="rn-notebook-panel" aria-label="Notebooks">
							<div className="rn-notebook-panel-head" aria-hidden>
								<span className="rn-notebook-col-main">Notebook</span>
								<span className="rn-notebook-col-date">Created</span>
								<span className="rn-notebook-col-date">Updated</span>
								<span className="rn-notebook-col-actions">Actions</span>
							</div>
							<ul className="rn-notebook-list">
								{filtered.map((p) => {
									const hasFocus = Boolean(p.focus?.trim());
									return (
										<li key={p.id} className="rn-notebook-row">
											<button
												type="button"
												className="rn-notebook-main"
												onClick={() => onOpenProject(p.id)}
											>
												<span className="rn-notebook-mark" aria-hidden>
													<NotebookIcon className="h-4 w-4" />
												</span>
												<span className="rn-notebook-copy">
													<span className="rn-notebook-title-row">
														<span className="rn-notebook-title">{p.title}</span>
														{hasFocus ? (
															<span className="rn-notebook-chip rn-notebook-chip-focus">
																Focused
															</span>
														) : (
															<span className="rn-notebook-chip">No focus</span>
														)}
													</span>
													<span className="rn-notebook-focus">
														{hasFocus ? p.focus : "No research focus set yet."}
													</span>
													<span className="rn-notebook-meta-mobile">
														<span>Created {formatDate(p.createdAt)}</span>
														<span>Updated {formatDateTime(p.updatedAt)}</span>
													</span>
												</span>
											</button>
											<div className="rn-notebook-col-date rn-notebook-date-block">
												<span className="rn-notebook-date-label">Created</span>
												<span className="rn-notebook-date-value">{formatDate(p.createdAt)}</span>
											</div>
											<div className="rn-notebook-col-date rn-notebook-date-block">
												<span className="rn-notebook-date-label">Updated</span>
												<span className="rn-notebook-date-value">{formatDateTime(p.updatedAt)}</span>
												<span className="rn-notebook-date-rel">{relativeTime(p.updatedAt)}</span>
											</div>
											<div className="rn-notebook-actions">
												<button
													type="button"
													className="rn-notebook-open"
													onClick={() => onOpenProject(p.id)}
												>
													Open
												</button>
												<button
													type="button"
													className="rn-notebook-remove"
													title="Delete notebook"
													aria-label={`Delete ${p.title}`}
													onClick={() => void confirmDelete(p.id, p.title)}
												>
													<TrashIcon className="h-4 w-4" />
												</button>
											</div>
										</li>
									);
								})}
							</ul>
						</section>
					)}
				</>
			)}

			<Modal
				open={showNew}
				onClose={() => !creating && setShowNew(false)}
				title="New Research Note"
				description="Start a governed notebook for one research thread. You’ll capture notes, data, and AI drafts in one place."
				wide
			>
				<form onSubmit={(e) => void submitNew(e)} className="rn-new-form">
					<aside className="rn-new-guide" aria-label="How to use this notebook">
						<p className="rn-new-guide-title">Before you begin</p>
						<ul className="rn-new-guide-list">
							<li>
								Choose a clear title that names the study or question, not a generic label like
								“Notes.”
							</li>
							<li>
								Add a short research focus so future you (and collaborators) can tell what this
								notebook is meant to answer.
							</li>
							<li>
								After you create it, open the notebook and use Materials, Data, Figures, and drafts in one AI Drafts workspace.
								when you’re ready to write up findings.
							</li>
						</ul>
					</aside>

					<div className="rn-new-fields">
						<div className="rn-new-field">
							<label htmlFor="rn-new-title">
								Notebook title <span className="rn-new-required">Required</span>
							</label>
							<input
								id="rn-new-title"
								autoFocus
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="e.g. Effects of peer feedback on undergraduate writing"
								disabled={creating}
							/>
							<p className="rn-new-hint">Shown in your notebook library and search results.</p>
						</div>
						<div className="rn-new-field">
							<label htmlFor="rn-new-focus">
								Research focus <span>(optional)</span>
							</label>
							<textarea
								id="rn-new-focus"
								value={focus}
								onChange={(e) => setFocus(e.target.value)}
								rows={4}
								placeholder="Summarise the problem, population, or method in one or two sentences."
								disabled={creating}
							/>
							<p className="rn-new-hint">
								Helps keep the notebook scoped when you return later or share it with colleagues.
							</p>
						</div>
					</div>

					<div className="rn-new-actions">
						<button
							type="button"
							className="rn-new-btn rn-new-btn-ghost"
							onClick={() => setShowNew(false)}
							disabled={creating}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="rn-new-btn rn-new-btn-primary"
							disabled={!title.trim() || creating}
						>
							{creating ? "Creating…" : "Create notebook"}
						</button>
					</div>
				</form>
			</Modal>
		</div>
	);
}
