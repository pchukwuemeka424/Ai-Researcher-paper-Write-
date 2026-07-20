"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AulaLayout } from "@/components/AulaLayout";
import { ChatPanel } from "@/components/ChatPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ResearchPaperLoadingScreen } from "@/components/research/ResearchPaperLoadingScreen";
import { ResearchCitationToolbar } from "@/components/ResearchCitationToolbar";
import { Sidebar } from "@/components/Sidebar";
import { IconDownload, IconFileText } from "@/components/ui/ButtonIcon";
import { useAuth } from "@/hooks/useAuth";
import { useFeynmanSocket } from "@/hooks/useFeynmanSocket";
import {
	downloadResearchPaper,
	extractPaperTitle,
	loadAllSavedPapers,
	removeAllSavedPapers,
	removeSavedPaper,
	saveResearchPaper,
	type SavedResearchPaper,
} from "@/lib/chat-research-storage";
import { downloadMarkdownAsPdf, researchPaperFilename } from "@/lib/research-paper-pdf";
import {
	clearChatCitationStyle,
	isIntegratedResearchPrompt,
	resolveChatCitationStyle,
	saveChatCitationStyle,
} from "@/lib/chat-research-citations";
import { formatResearchPaperReferences } from "@/lib/research-paper-references";
import { consumeChatPrefill } from "@/lib/research-ideas";
import { prepareResearchPaperPrompt } from "@/lib/prepare-research-paper";
import {
	consumeResearchFigureAppendix,
	injectSavedFiguresIntoPaper,
	peekResearchFigureAppendix,
} from "@/lib/research-figure-appendix";
import { peekOutlinePageContext, resolveOutlinePageContext } from "@/lib/research-outline-context";
import { consumePendingResearchPaper } from "@/lib/research-paper-pending";
import { ResearchPaperMarkdown } from "@/components/research/ResearchPaperMarkdown";
import { savedResearchPagePath } from "@/lib/saved-research-routes";
import { DEFAULT_CITATION_STYLE, type CitationStyle } from "@/lib/citation-styles";
import type { ChatMessage } from "@/lib/agent-events";

function readInitialChatState(): { input: string; citationStyle: CitationStyle } {
	const prefill = consumeChatPrefill();
	return { input: prefill, citationStyle: resolveChatCitationStyle(prefill) };
}

function SendIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<path d="m22 2-7 20-4-9-9-4 20-7z" strokeLinejoin="round" />
		</svg>
	);
}

export function FeynmanApp({ layout = "aula" }: { layout?: "aula" | "student" }) {
	const { user, loading: authLoading, setTokenQuota } = useAuth();
	const socketEnabled = !authLoading && Boolean(user);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const savedIdFromUrl = searchParams.get("saved");
	const savedPaperVariant = layout === "student" ? "student" : "lecturer";
	const {
		status,
		messages,
		error,
		isBusy,
		sendPrompt,
		sendResearchPaper,
		resetSession,
		abort,
		sessionId,
	} = useFeynmanSocket({ enabled: socketEnabled });

	const [initialChat] = useState(readInitialChatState);
	const [input, setInput] = useState(initialChat.input);
	const [citationStyle, setCitationStyle] = useState(initialChat.citationStyle);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const prefillFocusedRef = useRef(false);
	const autoGenerateRef = useRef(false);
	const pendingAutoGenerateRef = useRef(false);
	const pendingPaperKeyRef = useRef<string | null>(null);
	const researchFlowGenerationRef = useRef(false);
	const [researchFlowActive, setResearchFlowActive] = useState(false);
	const [paperPreparing, setPaperPreparing] = useState(false);
	const [paperPrepError, setPaperPrepError] = useState<string | null>(null);
	const [projectName, setProjectName] = useState<string | null>(null);
	const [paperOpenedInNewTab, setPaperOpenedInNewTab] = useState(false);
	const [openedPaperId, setOpenedPaperId] = useState<string | null>(null);
	const [savedPapers, setSavedPapers] = useState<SavedResearchPaper[]>([]);
	const [viewingSaved, setViewingSaved] = useState<SavedResearchPaper | null>(null);
	const [saveNotice, setSaveNotice] = useState<string | null>(null);
	const [removingSavedId, setRemovingSavedId] = useState<string | null>(null);
	const [pendingDelete, setPendingDelete] = useState<
		{ mode: "one"; id: string; title: string } | { mode: "all"; count: number } | null
	>(null);
	const [previewOpen, setPreviewOpen] = useState(false);
	const prevBusyRef = useRef(false);

	const hasAssistantPaper = messages.some((m) => m.role === "assistant" && m.content.trim().length > 0);

	useEffect(() => {
		void loadAllSavedPapers().then(setSavedPapers);
	}, [user?.id]);

	useEffect(() => {
		if (!savedIdFromUrl) return;
		router.replace(savedResearchPagePath(savedIdFromUrl, savedPaperVariant));
	}, [savedIdFromUrl, savedPaperVariant, router]);

	const paperTopic =
		messages.find((m) => m.role === "user")?.content.trim() ??
		viewingSaved?.topic ??
		"";
	const lastAssistantMessage = [...messages]
		.reverse()
		.find((m) => m.role === "assistant" && m.content.trim());
	const paperContent = lastAssistantMessage?.content.trim() ?? "";
	const paperTokenUsage = lastAssistantMessage?.tokenUsage;
	const paperContentWithFigures = injectSavedFiguresIntoPaper(
		paperContent,
		viewingSaved ? "" : peekResearchFigureAppendix(),
	);
	const activePaperContent = viewingSaved?.content ?? paperContentWithFigures;
	const formattedPaperContent = activePaperContent ? formatResearchPaperReferences(activePaperContent) : "";
	const paperTitle = extractPaperTitle(formattedPaperContent || activePaperContent, paperTopic || "Research paper");
	const paperReady = Boolean(formattedPaperContent) && !isBusy;
	const isStudent = layout === "student";
	const isResearchPaperRoute =
		pathname === "/research/paper" || pathname === "/student/research/paper";
	const showResearchLoadingScreen =
		isResearchPaperRoute &&
		researchFlowActive &&
		!paperOpenedInNewTab &&
		!paperPrepError &&
		(paperPreparing || isBusy || !paperReady);
	const loadingProjectName = projectName?.trim() || paperTitle || "Research paper";

	const firstUserPrompt = messages.find((m) => m.role === "user")?.content.trim() ?? initialChat.input.trim();
	const showCitationToolbar =
		hasAssistantPaper &&
		!viewingSaved &&
		(isIntegratedResearchPrompt(firstUserPrompt) || paperContent.length > 0);

	const displayMessages: ChatMessage[] = viewingSaved
		? [
				{ id: `saved-u-${viewingSaved.id}`, role: "user", content: viewingSaved.topic },
				{
					id: `saved-a-${viewingSaved.id}`,
					role: "assistant",
					content: formatResearchPaperReferences(viewingSaved.content),
					...(viewingSaved.tokenUsage ? { tokenUsage: viewingSaved.tokenUsage } : {}),
				},
			]
		: messages;

	useEffect(() => {
		if (prevBusyRef.current && !isBusy && !viewingSaved) {
			if (paperTopic && paperContent.length > 400) {
				const withFigures = injectSavedFiguresIntoPaper(
					paperContent,
					peekResearchFigureAppendix(),
				);
				if (withFigures !== paperContent) {
					consumeResearchFigureAppendix();
				}
				void saveResearchPaper(paperTopic, withFigures, {
					sessionId,
					tokenUsage: paperTokenUsage,
				}).then((next) => {
					setSavedPapers(next);
					const saved =
						next.find((paper) => paper.topic.trim().toLowerCase() === paperTopic.trim().toLowerCase()) ??
						next[0];

					if (isResearchPaperRoute && researchFlowGenerationRef.current && saved?.id) {
						researchFlowGenerationRef.current = false;
						setResearchFlowActive(false);
						const viewUrl = savedResearchPagePath(saved.id, savedPaperVariant);
						const opened = window.open(viewUrl, "_blank", "noopener,noreferrer");
						setOpenedPaperId(saved.id);
						setPaperOpenedInNewTab(true);
						setSaveNotice(
							opened
								? "Research paper ready — opened in a new tab."
								: "Research paper ready — use Open paper to view it (popup may be blocked).",
						);
					} else {
						setSaveNotice(
							isStudent
								? "Research saved automatically to your history."
								: "Research saved to your library.",
						);
					}
					window.setTimeout(() => setSaveNotice(null), 8000);
				});
			}
		}
		prevBusyRef.current = isBusy;
	}, [
		isBusy,
		paperTopic,
		paperContent,
		paperTokenUsage,
		viewingSaved,
		sessionId,
		isStudent,
		isResearchPaperRoute,
		savedPaperVariant,
	]);

	const handleSavePaper = () => {
		if (!paperTopic || !paperContent) return;
		const withFigures = injectSavedFiguresIntoPaper(paperContent, peekResearchFigureAppendix());
		if (withFigures !== paperContent) consumeResearchFigureAppendix();
		void saveResearchPaper(paperTopic, withFigures, {
			sessionId,
			tokenUsage: paperTokenUsage,
		}).then((next) => {
			setSavedPapers(next);
			setSaveNotice("Research saved.");
			window.setTimeout(() => setSaveNotice(null), 4000);
		});
	};

	const paperMeta = useMemo(
		() => ({
			author: user?.name ?? null,
			department: user?.department ?? null,
			affiliation: user?.institution ?? null,
			fallbackTopic: paperTopic || initialChat.input.trim() || null,
		}),
		[user?.name, user?.department, user?.institution, paperTopic, initialChat.input],
	);

	const handleDownloadPdf = useCallback(() => {
		const content = viewingSaved?.content ?? paperContent;
		if (!content) return;
		const topic = viewingSaved?.topic ?? paperTopic;
		const title = extractPaperTitle(content, topic || "research-paper");
		void downloadMarkdownAsPdf(content, title, {
			...paperMeta,
			fallbackTopic: topic || paperMeta.fallbackTopic,
		});
	}, [paperContent, paperTopic, paperMeta, viewingSaved]);

	const handleSelectSaved = (paper: SavedResearchPaper) => {
		router.push(savedResearchPagePath(paper.id, savedPaperVariant));
	};

	const handleRemoveSaved = useCallback(
		(id: string) => {
			const paper = savedPapers.find((p) => p.id === id);
			const title = paper
				? extractPaperTitle(paper.content, paper.topic).slice(0, 120)
				: "Saved research";
			setPendingDelete({ mode: "one", id, title });
		},
		[savedPapers],
	);

	const handleRemoveAllSaved = useCallback(() => {
		if (savedPapers.length === 0) return;
		setPendingDelete({ mode: "all", count: savedPapers.length });
	}, [savedPapers.length]);

	const executePendingDelete = useCallback(() => {
		if (!pendingDelete) return;

		if (pendingDelete.mode === "one") {
			const { id } = pendingDelete;
			setRemovingSavedId(id);
			void removeSavedPaper(id, savedPapers)
				.then((result) => {
					setSavedPapers(result.papers);
					if (viewingSaved?.id === id) setViewingSaved(null);
					setSaveNotice(
						result.ok
							? "Research removed."
							: (result.error ?? "Could not remove research. Try again."),
					);
					window.setTimeout(() => setSaveNotice(null), 5000);
				})
				.catch(() => {
					setSaveNotice("Could not remove research.");
					window.setTimeout(() => setSaveNotice(null), 4000);
				})
				.finally(() => {
					setRemovingSavedId(null);
					setPendingDelete(null);
				});
			return;
		}

		setRemovingSavedId("__all__");
		void removeAllSavedPapers(savedPapers)
			.then((result) => {
				setSavedPapers(result.papers);
				if (result.ok) setViewingSaved(null);
				setSaveNotice(
					result.ok
						? "All saved research removed."
						: (result.error ?? "Some items could not be removed."),
				);
				window.setTimeout(() => setSaveNotice(null), 5000);
			})
			.catch(() => {
				setSaveNotice("Could not remove saved research.");
				window.setTimeout(() => setSaveNotice(null), 4000);
			})
			.finally(() => {
				setRemovingSavedId(null);
				setPendingDelete(null);
			});
	}, [pendingDelete, savedPapers, viewingSaved?.id]);

	const handleNewSession = () => {
		setViewingSaved(null);
		setPreviewOpen(false);
		clearChatCitationStyle();
		setCitationStyle(DEFAULT_CITATION_STYLE);
		resetSession();
	};

	const handleCitationPrompt = useCallback(
		(prompt: string, style: CitationStyle) => {
			setCitationStyle(style);
			setViewingSaved(null);
			sendPrompt(prompt);
		},
		[sendPrompt],
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = input.trim();
		if (!trimmed || isBusy) return;
		setInput("");
		setViewingSaved(null);
		if (!hasAssistantPaper) {
			sendResearchPaper(trimmed);
		} else {
			sendPrompt(trimmed);
		}
	};

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("generate") === "1") {
			pendingAutoGenerateRef.current = true;
		}
		const paperKey = params.get("key")?.trim();
		const topicParam = params.get("topic")?.trim();
		if (topicParam) {
			setProjectName(topicParam);
		}
		if (paperKey) {
			pendingPaperKeyRef.current = paperKey;
		}
		if (params.has("topic") || params.has("generate") || params.has("key")) {
			params.delete("topic");
			params.delete("generate");
			params.delete("key");
			const rest = params.toString();
			const nextUrl = `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`;
			window.history.replaceState(null, "", nextUrl);
		}
	}, []);

	useEffect(() => {
		if (!pendingAutoGenerateRef.current || autoGenerateRef.current) return;
		if (status !== "connected" || isBusy || hasAssistantPaper) return;

		const pending = consumePendingResearchPaper();
		const paperKey = pending?.key ?? pendingPaperKeyRef.current;
		pendingPaperKeyRef.current = null;

		if (paperKey) {
			autoGenerateRef.current = true;
			pendingAutoGenerateRef.current = false;
			researchFlowGenerationRef.current = true;
			setResearchFlowActive(true);
			if (pending?.projectName?.trim()) {
				setProjectName(pending.projectName.trim());
			} else {
				const context = resolveOutlinePageContext(paperKey) ?? peekOutlinePageContext(paperKey);
				if (context?.idea.title) {
					setProjectName(context.idea.title);
				}
			}
			setPaperPreparing(true);
			setPaperPrepError(null);

			void prepareResearchPaperPrompt(paperKey, pending?.citationStyle ?? DEFAULT_CITATION_STYLE, {
				onTokenQuota: setTokenQuota,
			})
				.then((prompt) => {
					if (!prompt?.trim()) {
						throw new Error("Could not prepare research paper.");
					}
					const style = pending?.citationStyle ?? DEFAULT_CITATION_STYLE;
					saveChatCitationStyle(style);
					setCitationStyle(style);
					setInput(prompt);
					sendResearchPaper(prompt);
				})
				.catch((prepError) => {
					autoGenerateRef.current = false;
					setPaperPrepError(
						prepError instanceof Error ? prepError.message : "Could not start research generation.",
					);
				})
				.finally(() => setPaperPreparing(false));
			return;
		}

		if (!input.trim()) return;

		autoGenerateRef.current = true;
		pendingAutoGenerateRef.current = false;
		sendResearchPaper(input.trim());
	}, [input, status, isBusy, hasAssistantPaper, sendResearchPaper, setTokenQuota]);

	useEffect(() => {
		if (pendingAutoGenerateRef.current || !input.trim() || prefillFocusedRef.current) return;
		prefillFocusedRef.current = true;
		inputRef.current?.focus();
	}, [input]);

	const connectionLabel =
		status === "connected" ? "Connected" : status === "connecting" ? "Connecting…" : "Offline";
	const connectionTone =
		status === "connected" ? "online" : status === "connecting" ? "pending" : "offline";

	const handleSuggestionClick = useCallback((topic: string) => {
		setInput(topic);
		inputRef.current?.focus();
	}, []);

	const workspace = (
		<>
			<div className={layout === "student" ? "chat-workspace chat-workspace-student" : "chat-workspace"}>
				<header className="chat-workspace-header">
					<div className="chat-workspace-header-main">
						<div className="chat-workspace-heading">
							<div className="chat-workspace-title-row">
								<h1 className="chat-workspace-title">Research Workspace</h1>
								<span className={`chat-status-badge chat-status-badge-${connectionTone}`}>
									<span className="chat-status-dot" aria-hidden />
									{connectionLabel}
								</span>
							</div>
							<p className="chat-workspace-lead">
								{isStudent
									? "Generate your paper here — it saves automatically when complete. Preview or download as PDF anytime."
									: "Draft cited academic papers, refine citation style, and export to PDF."}
							</p>
						</div>
					</div>
					<div className="chat-workspace-actions">
						{isStudent ? (
							paperReady && (
								<>
									<button
										type="button"
										className="chat-workspace-btn stu-paper-btn"
										onClick={() => setPreviewOpen(true)}
									>
										<IconFileText size={16} />
										Preview
									</button>
									<button
										type="button"
										className="chat-workspace-btn stu-paper-btn stu-paper-btn-primary"
										onClick={handleDownloadPdf}
									>
										<IconDownload size={16} />
										Download PDF
									</button>
								</>
							)
						) : (
							hasAssistantPaper &&
							!isBusy && (
								<>
									<button type="button" className="chat-workspace-btn" onClick={handleDownloadPdf}>
										<IconDownload size={15} />
										Download PDF
									</button>
									<button type="button" className="chat-workspace-btn" onClick={handleSavePaper}>
										Save to library
									</button>
								</>
							)
						)}
						<button
							type="button"
							className="chat-workspace-btn chat-workspace-btn-ghost"
							onClick={handleNewSession}
							disabled={isBusy}
						>
							New session
						</button>
					</div>
				</header>

				{isStudent && paperReady && (
					<div className="stu-paper-result-bar" role="status">
						<p className="stu-paper-result-msg">
							{saveNotice ?? "Your research paper is ready and saved to your history."}
						</p>
						<div className="stu-paper-result-actions">
							<button type="button" className="stu-paper-btn" onClick={() => setPreviewOpen(true)}>
								<IconFileText size={16} />
								Preview
							</button>
							<button
								type="button"
								className="stu-paper-btn stu-paper-btn-primary"
								onClick={handleDownloadPdf}
							>
								<IconDownload size={16} />
								Download PDF
							</button>
						</div>
					</div>
				)}

				<div className="chat-workspace-body">
					{showResearchLoadingScreen ? (
						<div className="chat-main research-paper-loading-host">
							<ResearchPaperLoadingScreen
								projectName={loadingProjectName}
								preparing={paperPreparing}
								studentUI={isStudent}
							/>
						</div>
					) : paperOpenedInNewTab && isResearchPaperRoute ? (
						<div className="chat-main research-paper-complete-host">
							<div className="research-paper-complete-card">
								<h2 className="research-paper-complete-title">{loadingProjectName}</h2>
								<p className="research-paper-complete-lead">
									Your research paper is ready and has been opened in a new tab.
								</p>
								{saveNotice ? <p className="research-paper-complete-notice">{saveNotice}</p> : null}
								<div className="research-paper-complete-actions">
									<Link href={isStudent ? "/student/research" : "/research"} className="saved-research-back">
										← Back to Research Assistant
									</Link>
									{openedPaperId ? (
										<a
											href={savedResearchPagePath(openedPaperId, savedPaperVariant)}
											target="_blank"
											rel="noopener noreferrer"
											className="saved-research-btn saved-research-btn-primary"
										>
											Open paper again
										</a>
									) : null}
								</div>
							</div>
						</div>
					) : (
						<>
					<Sidebar
						savedPapers={savedPapers}
						activeSavedId={viewingSaved?.id ?? null}
						onSelectSaved={handleSelectSaved}
						onRemoveSaved={handleRemoveSaved}
						onRemoveAllSaved={handleRemoveAllSaved}
						removingSavedId={removingSavedId}
						onDownloadSaved={(paper) => void downloadResearchPaper(paper, paperMeta)}
					/>

					<div className="chat-main">
						<div className="chat-main-scroll">
							{socketEnabled && (status === "disconnected" || status === "error") && (
								<div className="chat-toast chat-toast-error" role="alert">
									{error ??
										"Not connected. Start the backend with npm run dev:backend (port 3141), then refresh."}
								</div>
							)}
							{saveNotice && <div className="chat-toast chat-toast-success">{saveNotice}</div>}
							{viewingSaved && (
								<div className="chat-toast chat-toast-info">
									Viewing saved research ·{" "}
									<button type="button" className="chat-toast-link" onClick={() => setViewingSaved(null)}>
										Back to live session
									</button>
									{" · "}
									<button
										type="button"
										className="chat-toast-link chat-toast-link-danger"
										disabled={removingSavedId !== null}
										onClick={() => handleRemoveSaved(viewingSaved.id)}
									>
										Remove
									</button>
								</div>
							)}
							{error && status === "connected" && (
								<div className="chat-toast chat-toast-error">{error}</div>
							)}
							{paperPrepError && (
								<div className="chat-toast chat-toast-error" role="alert">
									{paperPrepError}
								</div>
							)}
							<ChatPanel
								messages={displayMessages}
								isBusy={(isBusy || paperPreparing) && !viewingSaved}
								onSuggestionClick={handleSuggestionClick}
							/>
						</div>

						<ResearchCitationToolbar
							visible={showCitationToolbar}
							disabled={isBusy || status !== "connected"}
							citationStyle={citationStyle}
							onCitationStyleChange={setCitationStyle}
							onApplyStyle={handleCitationPrompt}
							onUpdateReferences={handleCitationPrompt}
						/>

						<form className="chat-composer" onSubmit={handleSubmit}>
							<div className="chat-composer-card">
								<label className="sr-only" htmlFor="chat-composer-input">
									Research topic or follow-up message
								</label>
								<textarea
									id="chat-composer-input"
									ref={inputRef}
									rows={2}
									placeholder={
										hasAssistantPaper
											? "Ask for revisions, expand a section, or change emphasis…"
											: "Enter a research topic or paper title to generate a full cited paper…"
									}
									value={input}
									onChange={(e) => setInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											handleSubmit(e);
										}
									}}
									disabled={status !== "connected"}
								/>
								<div className="chat-composer-footer">
									{isBusy ? (
										<button type="button" className="chat-composer-stop" onClick={abort}>
											Stop generation
										</button>
									) : (
										<p className="chat-composer-hint">
											{hasAssistantPaper
												? "Enter to send · Shift+Enter for newline"
												: "First message generates a complete paper with in-text citations"}
										</p>
									)}
									<button
										type="submit"
										className="chat-composer-send"
										disabled={!input.trim() || isBusy || status !== "connected"}
										aria-label={hasAssistantPaper ? "Send message" : "Generate paper"}
									>
										<SendIcon />
										<span>{hasAssistantPaper ? "Send" : "Generate"}</span>
									</button>
								</div>
							</div>
						</form>
					</div>
						</>
					)}
				</div>
			</div>

			<ConfirmDialog
				open={pendingDelete !== null}
				title={pendingDelete?.mode === "all" ? "Clear all saved research?" : "Delete saved research?"}
				description={
					pendingDelete?.mode === "all"
						? `This will permanently remove all ${pendingDelete.count} saved papers from your library. This action cannot be undone.`
						: pendingDelete?.mode === "one"
							? `“${pendingDelete.title}” will be removed from your saved research library. This cannot be undone.`
							: ""
				}
				confirmLabel={pendingDelete?.mode === "all" ? "Clear all" : "Delete"}
				loading={removingSavedId !== null}
				onConfirm={executePendingDelete}
				onCancel={() => {
					if (removingSavedId !== null) return;
					setPendingDelete(null);
				}}
			/>

			{previewOpen && formattedPaperContent && (
				<div
					className="research-history-modal-backdrop"
					role="presentation"
					onClick={() => setPreviewOpen(false)}
				>
					<div
						className="research-history-modal stu-paper-preview-modal"
						role="dialog"
						aria-modal="true"
						aria-labelledby="stu-paper-preview-title"
						onClick={(event) => event.stopPropagation()}
					>
						<header className="research-history-modal-head">
							<div>
								<h3 id="stu-paper-preview-title">{paperTitle}</h3>
								<p className="research-history-modal-meta">Saved automatically · preview only</p>
							</div>
							<button type="button" className="research-history-modal-close" onClick={() => setPreviewOpen(false)}>
								Close
							</button>
						</header>
						<div className="research-history-modal-body research-markdown-panel">
							<ResearchPaperMarkdown content={formattedPaperContent} />
						</div>
						<footer className="research-history-modal-foot stu-paper-preview-foot">
							<button type="button" className="stu-paper-btn" onClick={() => setPreviewOpen(false)}>
								Close
							</button>
							<button type="button" className="stu-paper-btn stu-paper-btn-primary" onClick={handleDownloadPdf}>
								<IconDownload size={16} />
								Download PDF
							</button>
						</footer>
					</div>
				</div>
			)}
		</>
	);

	return layout === "student" ? (
		<div className="stu-research-paper-page">
			<div className="stu-research-paper-top">
				<Link href="/student/research" className="stu-research-paper-back">
					← Back to Research Assistant
				</Link>
			</div>
			{workspace}
		</div>
	) : (
		<AulaLayout showRightPanel={false} fullHeight>
			{pathname.startsWith("/research/paper") ? (
				<div className="research-paper-workspace-page">
					<div className="saved-research-top">
						<Link href="/research" className="saved-research-back">
							← Back to Research Assistant
						</Link>
					</div>
					{workspace}
				</div>
			) : (
				workspace
			)}
		</AulaLayout>
	);
}
