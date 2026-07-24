"use client";

import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";

import { Dashboard } from "@/components/research-note/features/dashboard/Dashboard";
import { SearchModal } from "@/components/research-note/features/search/SearchModal";
import { useSettings } from "@/components/research-note/state/useSettings";
import { useTheme } from "@/components/research-note/state/useTheme";
import type { AuthUser as NoteAuthUser } from "@/components/research-note/state/useAuth";

import "@/components/research-note/research-note.css";

/**
 * Research-Note shell — notebook workspace hosted in GAHI.
 * Auth from parent app; projects + notebook snapshots in Mongo;
 * AI via project OpenRouter (`llm.service`).
 */
const NotebookView = lazy(() =>
	import("@/components/research-note/features/notebook/NotebookView").then((m) => ({
		default: m.NotebookView,
	})),
);

type View = { kind: "dashboard" } | { kind: "project"; projectId: string };

export type ResearchNoteAuthor = {
	id: string;
	name: string;
	email: string;
};

type Props = {
	author: ResearchNoteAuthor;
};

export function ResearchNoteApp({ author }: Props) {
	const [view, setView] = useState<View>({ kind: "dashboard" });
	const [showSearch, setShowSearch] = useState(false);
	const ai = useSettings();
	const theme = useTheme();

	const noteUser: NoteAuthUser = {
		id: author.id,
		name: author.name || author.email || "Researcher",
		email: author.email || "",
	};

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setShowSearch((v) => !v);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const openProject = (projectId: string) => setView({ kind: "project", projectId });

	const modals = (
		<SearchModal open={showSearch} onClose={() => setShowSearch(false)} onOpenProject={openProject} />
	);

	let body: ReactNode;
	if (view.kind === "project") {
		body = (
			<>
				<Suspense
					fallback={
						<div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
							Opening notebook…
						</div>
					}
				>
					<NotebookView
						key={view.projectId}
						projectId={view.projectId}
						settings={ai.settings}
						author={noteUser.name}
						onBack={() => setView({ kind: "dashboard" })}
					/>
				</Suspense>
				{modals}
			</>
		);
	} else {
		body = (
			<>
				<Dashboard onOpenProject={openProject} />
				{modals}
			</>
		);
	}

	return (
		<div
			className={`research-note-shell${view.kind === "dashboard" ? " research-note-shell-embed" : ""}`}
			data-theme={theme.resolved}
		>
			{body}
		</div>
	);
}
