"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";

import { DisciplineSelect } from "@/components/aula/DisciplineSelect";
import { ResearchScopeSelect } from "@/components/aula/ResearchScopeSelect";
import { NavIcon } from "@/components/aula/NavIcon";
import { ResearchIdeaCard } from "@/components/research/ResearchIdeaCard";
import { StudentResearchHistory } from "@/components/research/StudentResearchHistory";
import {
	IconAward,
	IconBook,
	IconBookmark,
	IconBriefcase,
	IconChevronLeft,
	IconChevronRight,
	IconClock,
	IconCopy,
	IconDashboard,
	IconDownload,
	IconEdit,
	IconFilter,
	IconGraduationCap,
	IconGrid,
	IconLayers,
	IconLightbulb,
	IconMarkdown,
	IconMicroscope,
	IconRefresh,
	IconRotateCcw,
	IconSparkles,
	IconStop,
	IconTarget,
	IconTrash,
} from "@/components/ui/ButtonIcon";
import { AulaLayout } from "@/components/AulaLayout";
import { StudentLayout } from "@/components/StudentLayout";
import { studentHasResearchTokens } from "@/components/StudentTokenQuota";
import { useAuth } from "@/hooks/useAuth";
import { useFeynmanSocket } from "@/hooks/useFeynmanSocket";
import { fetchResearchIdeasFromApi } from "@/lib/research-api";
import { DEFAULT_DISCIPLINE, getDisciplineLabel } from "@/lib/research-disciplines";
import {
	buildResearchIdeasPrompt,
	FOCUS_OPTIONS,
	generateLocalResearchIdeas,
	IDEA_GENERATION_PHASES,
	ideasToMarkdown,
	parseResearchIdeas,
	SCOPE_OPTIONS,
	type IdeaGenerationPhase,
	type IdeaType,
	type ResearchIdea,
	type ResearchScope,
	type ResearchSession,
	type ResearchTopicAnalysis,
} from "@/lib/research-ideas";
import {
	STRONG_TOPIC_EXAMPLES,
	TOPIC_INPUT_HINT,
	VAGUE_TOPIC_EXAMPLES,
} from "@/lib/research-topic-guidance";
import { loadAllSavedPapers, type SavedResearchPaper } from "@/lib/chat-research-storage";
import { loadAllSavedOutlines } from "@/lib/research-outline-storage";
import {
	clearSavedIdeas,
	loadAllRecentSessions,
	loadAllSavedIdeas,
	loadRecentSessions,
	pushRecentSession,
	removeRecentSession,
	removeSavedIdea,
	saveIdea,
	type SavedIdea,
} from "@/lib/research-storage";

type WizardStep = 1 | 2 | 3;

const WIZARD_STEPS: { num: WizardStep; label: string }[] = [
	{ num: 1, label: "Discipline" },
	{ num: 2, label: "Topic" },
	{ num: 3, label: "Ideas" },
];

const WIZARD_STEP_ICONS: Record<WizardStep, ReactNode> = {
	1: <IconBook size={14} />,
	2: <IconEdit size={14} />,
	3: <IconLightbulb size={14} />,
};

const SCOPE_ICONS: Record<ResearchScope, ReactNode> = {
	undergraduate: <IconGraduationCap size={18} />,
	masters: <IconAward size={18} />,
	doctoral: <IconMicroscope size={18} />,
	faculty: <IconBriefcase size={18} />,
};

const FOCUS_PILL_ICONS: Record<IdeaType | "all", ReactNode> = {
	all: <IconFilter size={12} />,
	empirical: <IconMicroscope size={12} />,
	theoretical: <IconBook size={12} />,
	interdisciplinary: <IconLayers size={12} />,
	applied: <IconTarget size={12} />,
};

function SkeletonCards() {
	return (
		<div className="research-ideas-grid">
			{Array.from({ length: 6 }).map((_, i) => (
				<div key={i} className="research-skeleton-card" aria-hidden>
					<div className="research-skeleton-line research-skeleton-short" />
					<div className="research-skeleton-line research-skeleton-title" />
					<div className="research-skeleton-line" />
					<div className="research-skeleton-line" />
					<div className="research-skeleton-line research-skeleton-medium" />
				</div>
			))}
		</div>
	);
}

export function ResearchAssistant({ variant = "lecturer" }: { variant?: "lecturer" | "student" }) {
	const { user, setTokenQuota } = useAuth();
	const searchParams = useSearchParams();
	const hasTokens = studentHasResearchTokens(user?.tokenQuota, user?.role);
	const { status, messages, error, isBusy, sendPrompt, resetSession, clearMessages, abort } = useFeynmanSocket();

	const [step, setStep] = useState<WizardStep>(1);
	const [discipline, setDiscipline] = useState(DEFAULT_DISCIPLINE);
	const [topic, setTopic] = useState("");
	const [scope, setScope] = useState<ResearchScope | "">("");
	const [focusFilter, setFocusFilter] = useState<IdeaType | "all">("all");
	const [localIdeas, setLocalIdeas] = useState<ResearchIdea[] | null>(null);
	const [hasGenerated, setHasGenerated] = useState(false);
	const [topicTouched, setTopicTouched] = useState(false);
	const [scopeTouched, setScopeTouched] = useState(false);
	const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
	const [recentSessions, setRecentSessions] = useState<ResearchSession[]>([]);
	const [savedPapers, setSavedPapers] = useState<SavedResearchPaper[]>([]);
	const [showSaved, setShowSaved] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [viewMode, setViewMode] = useState<"cards" | "markdown">("cards");
	const [copiedAll, setCopiedAll] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [generationPhase, setGenerationPhase] = useState<IdeaGenerationPhase | null>(null);
	const [topicAnalysis, setTopicAnalysis] = useState<ResearchTopicAnalysis | null>(null);
	const [generateError, setGenerateError] = useState<string | null>(null);
	const prevBusyRef = useRef(false);
	const generateAbortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		const view = searchParams.get("view");
		if (view === "saved") {
			setShowSaved(true);
			setShowHistory(false);
			setStep(3);
			void loadAllSavedIdeas().then(setSavedIdeas);
			return;
		}
		if (view === "history") {
			setShowHistory(true);
			setShowSaved(false);
			setStep(3);
			if (variant === "student") {
				void loadAllRecentSessions().then(setRecentSessions);
			}
			void loadAllSavedPapers().then(setSavedPapers);
		}
	}, [searchParams, variant]);

	useEffect(() => {
		void loadAllSavedIdeas().then(setSavedIdeas);
		if (variant === "student") {
			void loadAllRecentSessions().then(setRecentSessions);
			void loadAllSavedPapers().then(setSavedPapers);
			void loadAllSavedOutlines();
		} else {
			setRecentSessions(loadRecentSessions());
		}
	}, [user?.id, variant]);

	const assistantContent = useMemo(() => {
		const assistantMessages = messages.filter((m) => m.role === "assistant" && m.content.trim());
		if (!assistantMessages.length) return null;
		return assistantMessages[assistantMessages.length - 1]!.content;
	}, [messages]);

	const parsedIdeas = useMemo(() => {
		if (localIdeas?.length) return localIdeas;
		if (assistantContent) {
			const parsed = parseResearchIdeas(assistantContent);
			if (parsed.length) return parsed;
		}
		return null;
	}, [assistantContent, localIdeas]);

	const showRawResponse = hasGenerated && !isBusy && Boolean(assistantContent) && !parsedIdeas?.length;

	const filteredIdeas = useMemo(() => {
		if (!parsedIdeas) return null;
		if (focusFilter === "all") return parsedIdeas;
		return parsedIdeas.filter((i) => i.type === focusFilter);
	}, [parsedIdeas, focusFilter]);

	const topicError = topicTouched && !topic.trim();
	const scopeError = scopeTouched && !scope;
	const disciplineLabel = getDisciplineLabel(discipline);

	const savedIdeaKeys = useMemo(
		() => new Set(savedIdeas.map((s) => `${s.id}::${s.title}`)),
		[savedIdeas],
	);

	const isSavedIdea = useCallback(
		(idea: ResearchIdea) => savedIdeaKeys.has(`${idea.id}::${idea.title}`),
		[savedIdeaKeys],
	);

	const handleGenerate = useCallback(async () => {
		if (!topic.trim()) {
			setTopicTouched(true);
			return false;
		}
		if (!scope) return false;
		if (!hasTokens) return false;

		setHasGenerated(true);
		setLocalIdeas(null);
		setTopicAnalysis(null);
		setGenerateError(null);
		setViewMode("cards");
		setFocusFilter("all");
		setStep(3);
		setIsGenerating(true);
		setGenerationPhase("scope");

		const phaseOrder: IdeaGenerationPhase[] = ["scope", "context", "titles", "quality"];
		let phaseIndex = 0;
		const phaseTimer = window.setInterval(() => {
			phaseIndex = Math.min(phaseIndex + 1, phaseOrder.length - 1);
			setGenerationPhase(phaseOrder[phaseIndex]!);
		}, 2800);

		const controller = new AbortController();
		generateAbortRef.current = controller;

		try {
			const result = await fetchResearchIdeasFromApi(
				{
					disciplineLabel,
					topic: topic.trim(),
					scope,
				},
				{ signal: controller.signal },
			);

			if (result.tokenQuota) setTokenQuota(result.tokenQuota);

			const parsed = parseResearchIdeas(result.ideasMarkdown);
			if (!parsed.length) {
				throw new Error("Could not parse generated research ideas.");
			}

			setLocalIdeas(parsed);
			if (result.analysis) setTopicAnalysis(result.analysis);
			setRecentSessions(pushRecentSession({ discipline, topic: topic.trim(), scope, ideas: parsed }));
			setGenerationPhase("done");
			return true;
		} catch (err) {
			if (controller.signal.aborted) return false;

			const message = err instanceof Error ? err.message : "Generation failed.";
			setGenerateError(message);

			if (status === "connected") {
				clearMessages();
				sendPrompt(buildResearchIdeasPrompt(discipline, topic, scope));
				return true;
			}

			const ideas = generateLocalResearchIdeas(discipline, topic);
			setLocalIdeas(ideas);
			setRecentSessions(pushRecentSession({ discipline, topic: topic.trim(), scope, ideas }));
			setGenerationPhase("done");
			return true;
		} finally {
			window.clearInterval(phaseTimer);
			setIsGenerating(false);
			generateAbortRef.current = null;
		}
	}, [discipline, topic, scope, status, clearMessages, sendPrompt, hasTokens, disciplineLabel, setTokenQuota]);

	useEffect(() => {
		if (!hasGenerated || isBusy || isGenerating || !topic.trim() || !scope) return;
		if (localIdeas?.length || parsedIdeas?.length) return;
		if (status === "connected" && !assistantContent && !error && !generateError) return;

		const ideas = generateLocalResearchIdeas(discipline, topic);
		setLocalIdeas(ideas);
		setRecentSessions(pushRecentSession({ discipline, topic: topic.trim(), scope, ideas }));
	}, [hasGenerated, isBusy, isGenerating, topic, localIdeas, parsedIdeas, status, assistantContent, error, generateError, discipline, scope]);

	useEffect(() => {
		if (prevBusyRef.current && !isBusy && parsedIdeas?.length && scope) {
			setRecentSessions(pushRecentSession({ discipline, topic: topic.trim(), scope, ideas: parsedIdeas }));
		}
		prevBusyRef.current = isBusy;
	}, [isBusy, parsedIdeas, discipline, topic, scope]);

	const handleStartOver = () => {
		setStep(1);
		setTopic("");
		setScope("");
		setLocalIdeas(null);
		setHasGenerated(false);
		setTopicTouched(false);
		setScopeTouched(false);
		setFocusFilter("all");
		setShowSaved(false);
		setShowHistory(false);
		setTopicAnalysis(null);
		setGenerateError(null);
		setGenerationPhase(null);
		setIsGenerating(false);
		generateAbortRef.current?.abort();
		resetSession();
	};

	const handleRegenerate = () => {
		if (!topic.trim()) return;
		handleGenerate();
	};

	const loadSession = (session: ResearchSession) => {
		setDiscipline(session.discipline);
		setTopic(session.topic);
		setScope(session.scope);
		setLocalIdeas(session.ideas);
		setHasGenerated(true);
		setShowSaved(false);
		setShowHistory(false);
		setStep(3);
		resetSession();
	};

	const handleCopyAll = async () => {
		if (!filteredIdeas?.length) return;
		try {
			await navigator.clipboard.writeText(ideasToMarkdown(filteredIdeas, disciplineLabel, topic.trim()));
			setCopiedAll(true);
			window.setTimeout(() => setCopiedAll(false), 2000);
		} catch {
			/* clipboard unavailable */
		}
	};

	const handleExport = () => {
		if (!filteredIdeas?.length) return;
		const blob = new Blob([ideasToMarkdown(filteredIdeas, disciplineLabel, topic.trim())], {
			type: "text/markdown;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `research-ideas-${discipline}.md`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleSave = (idea: ResearchIdea) => {
		void saveIdea(idea, discipline, topic.trim()).then(setSavedIdeas);
	};

	const handleUnsave = (idea: ResearchIdea) => {
		const match = savedIdeas.find((s) => s.id === idea.id && s.title === idea.title);
		void removeSavedIdea(idea.id, idea.title, match?.dbId).then(setSavedIdeas);
	};

	const handleClearSaved = () => {
		void clearSavedIdeas().then(setSavedIdeas);
	};

	const handleRemoveRecent = (sessionId: string) => {
		setRecentSessions(removeRecentSession(sessionId));
	};

	const goNext = () => {
		if (step === 1) {
			setScopeTouched(true);
			if (!scope) return;
			setStep(2);
			return;
		}
		if (step === 2) {
			setTopicTouched(true);
			if (!topic.trim()) return;
			handleGenerate();
		}
	};

	const goBack = () => {
		if (showSaved || showHistory) {
			setShowSaved(false);
			setShowHistory(false);
			return;
		}
		if (step === 3) setStep(2);
		else if (step === 2) setStep(1);
	};

	const handleStopGenerate = () => {
		generateAbortRef.current?.abort();
		if (isBusy) abort();
		setIsGenerating(false);
		setGenerationPhase(null);
	};

	const renderAgentPipeline = () => {
		if (!isGenerating && !generationPhase) return null;
		const activePhase = generationPhase ?? "scope";
		const phaseRank = (id: IdeaGenerationPhase) => IDEA_GENERATION_PHASES.findIndex((p) => p.id === id);

		return (
			<div className="research-topic-agent-pipeline" aria-live="polite">
				<p className="research-topic-agent-pipeline-title">Multi-agent topic analysis</p>
				<ol className="research-topic-agent-steps">
					{IDEA_GENERATION_PHASES.filter((p) => p.id !== "done").map((phase) => {
						const rank = phaseRank(phase.id);
						const activeRank = phaseRank(activePhase);
						const isActive = isGenerating && phase.id === activePhase;
						const isDone = !isGenerating || activeRank > rank;
						return (
							<li
								key={phase.id}
								className={`research-topic-agent-step ${isActive ? "research-topic-agent-step-active" : ""} ${isDone ? "research-topic-agent-step-done" : ""}`}
							>
								<span aria-hidden>{isDone && !isActive ? "✓" : isActive ? "…" : "○"}</span>
								<span>{phase.label}</span>
							</li>
						);
					})}
				</ol>
			</div>
		);
	};

	const renderTopicAnalysis = () => {
		if (!topicAnalysis) return null;
		const { scope: scopeAnalysis, contextAndGap } = topicAnalysis;
		const listOrDash = (items: string[]) => (items.length ? items.join("; ") : "—");

		return (
			<div className="research-topic-analysis">
				<p className="research-topic-analysis-title">Research framing (from your interest topic)</p>
				<dl className="research-topic-analysis-grid">
					<div>
						<dt>Discipline</dt>
						<dd>{scopeAnalysis.discipline}</dd>
					</div>
					<div>
						<dt>Research area</dt>
						<dd>{scopeAnalysis.researchArea}</dd>
					</div>
					<div>
						<dt>Variables</dt>
						<dd>{listOrDash(scopeAnalysis.variables)}</dd>
					</div>
					<div>
						<dt>Constructs / phenomena</dt>
						<dd>{listOrDash([...scopeAnalysis.constructs, ...scopeAnalysis.phenomena])}</dd>
					</div>
					<div>
						<dt>Population</dt>
						<dd>{contextAndGap.population}</dd>
					</div>
					<div>
						<dt>Context &amp; domain</dt>
						<dd>
							{contextAndGap.context}
							{contextAndGap.domain && contextAndGap.domain !== contextAndGap.context
								? ` · ${contextAndGap.domain}`
								: ""}
						</dd>
					</div>
					<div>
						<dt>Research gap</dt>
						<dd>{contextAndGap.researchGap}</dd>
					</div>
				</dl>
			</div>
		);
	};

	const renderResults = () => {
		if ((isGenerating || isBusy) && !parsedIdeas?.length) {
			return (
				<>
					{renderAgentPipeline()}
					<SkeletonCards />
				</>
			);
		}

		if (filteredIdeas && filteredIdeas.length > 0) {
			if (viewMode === "markdown") {
				return (
					<>
						{renderTopicAnalysis()}
						<div className="research-markdown-panel">
							<ReactMarkdown>{ideasToMarkdown(filteredIdeas, disciplineLabel, topic.trim())}</ReactMarkdown>
						</div>
					</>
				);
			}
			return (
				<>
					{renderTopicAnalysis()}
					<div className="research-ideas-grid">
						{filteredIdeas.map((idea, i) => (
							<ResearchIdeaCard
								key={idea.id}
								idea={idea}
								index={i}
								topic={topic.trim()}
								discipline={discipline}
								scope={scope || "masters"}
								saved={isSavedIdea(idea)}
								studentUI={variant === "student"}
								onSave={() => handleSave(idea)}
								onUnsave={() => handleUnsave(idea)}
							/>
						))}
					</div>
				</>
			);
		}

		if (showRawResponse && assistantContent) {
			return (
				<div className="research-markdown-panel">
					<ReactMarkdown>{assistantContent}</ReactMarkdown>
				</div>
			);
		}

		if (parsedIdeas && parsedIdeas.length > 0 && focusFilter !== "all") {
			return (
				<div className="research-empty research-empty-filtered">
					<h3>No {FOCUS_OPTIONS.find((f) => f.id === focusFilter)?.label?.toLowerCase()} ideas</h3>
					<p>Try a different filter or regenerate with a broader topic.</p>
					<button type="button" className="research-secondary-btn" onClick={() => setFocusFilter("all")}>
						<IconFilter size={14} />
						Show all ideas
					</button>
				</div>
			);
		}

		if (hasGenerated && !isBusy) {
			return (
				<div className="research-empty">
					<div className="research-empty-icon" aria-hidden>
						<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
							<circle cx="12" cy="12" r="10" />
							<path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
						</svg>
					</div>
					<h3>Could not generate ideas</h3>
					<p>
						{error || generateError
							? "The research agent returned an error. Template ideas will load automatically, or try again."
							: "Something went wrong. Go back and try again."}
					</p>
					<button type="button" className="research-secondary-btn" onClick={handleRegenerate}>
						<IconRefresh size={14} />
						Try again
					</button>
				</div>
			);
		}

		return null;
	};

	const chatHref = variant === "student" ? "/student/dashboard" : "/dashboard/chat";

	const page = (
		<div className={variant === "student" ? "research-page research-page-student" : "research-page"}>
				<header className="research-page-header">
					<div className="research-page-header-start">
						<div className="research-page-icon" aria-hidden>
							<NavIcon id="research" size={24} />
						</div>
						<div>
							<p className="research-page-eyebrow">Research discovery</p>
							<h1 className="research-page-title">Research Assistant</h1>
							<p className="research-page-lead">
								{variant === "student"
									? "Pick your field, enter a topic, and explore research ideas — everything you generate is saved automatically."
									: "Define your discipline and scope, describe your topic, and generate tailored research question ideas."}
							</p>
						</div>
					</div>
					<div className="research-page-actions">
						<button
							type="button"
							className={`research-btn research-btn-outline research-btn-sm ${showSaved ? "research-btn-active" : ""}`}
							onClick={() => {
								setShowSaved(true);
								setShowHistory(false);
								setStep(3);
							}}
						>
							<IconBookmark size={16} />
							Saved
							{savedIdeas.length > 0 && <span className="research-btn-count">{savedIdeas.length}</span>}
						</button>
						{variant === "student" && (
							<button
								type="button"
								className={`research-btn research-btn-outline research-btn-sm ${showHistory ? "research-btn-active" : ""}`}
								onClick={() => {
									setShowHistory(true);
									setShowSaved(false);
									setStep(3);
									void loadAllRecentSessions().then(setRecentSessions);
									void loadAllSavedPapers().then(setSavedPapers);
								}}
							>
								<IconClock size={16} />
								History
								{(recentSessions.length > 0 || savedPapers.length > 0) && (
									<span className="research-btn-count">
										{recentSessions.length + savedPapers.length}
									</span>
								)}
							</button>
						)}
						<Link href={chatHref} className="research-btn research-btn-outline research-btn-sm">
							{variant === "student" ? (
								<>
									<IconDashboard size={16} />
									Dashboard
								</>
							) : (
								<>
									Full workspace
									<IconChevronRight size={16} />
								</>
							)}
						</Link>
					</div>
				</header>

				<nav className="research-steps-bar" aria-label="Wizard progress">
					<ol className="research-steps">
						{WIZARD_STEPS.map(({ num, label }, i) => (
							<li key={num} className="research-step-wrap">
								<button
									type="button"
									className={`research-step ${
										step === num && !showSaved && !showHistory
											? "research-step-active"
											: step > num || (num === 3 && hasGenerated)
												? "research-step-done"
												: ""
									}`}
									onClick={() => {
										if (showSaved || showHistory) {
											setShowSaved(false);
											setShowHistory(false);
										}
										if (num < step) setStep(num);
										if (num === 3 && hasGenerated) setStep(3);
									}}
									disabled={num === 3 && !hasGenerated}
									aria-current={step === num && !showSaved && !showHistory ? "step" : undefined}
								>
									<span className="research-step-num">{step > num ? "✓" : num}</span>
									<span className="research-step-icon">{WIZARD_STEP_ICONS[num]}</span>
									<span className="research-step-label">{label}</span>
								</button>
								{i < WIZARD_STEPS.length - 1 && <span className="research-step-line" aria-hidden />}
							</li>
						))}
					</ol>
				</nav>

				<div className="research-wizard">
					<div className="research-wizard-card">
						{showSaved ? (
							<>
								<div className="research-wizard-head">
									<div>
										<h2 className="research-wizard-title">Saved ideas</h2>
										<p className="research-wizard-subtitle">{savedIdeas.length} ideas bookmarked for later</p>
									</div>
									{savedIdeas.length > 0 && (
										<button type="button" className="research-toolbar-btn research-toolbar-btn-danger" onClick={handleClearSaved}>
											<IconTrash size={14} />
											Clear all
										</button>
									)}
								</div>
								<div className="research-wizard-body">
									{savedIdeas.length === 0 ? (
										<div className="research-empty">
											<div className="research-empty-icon" aria-hidden>
												<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
													<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
												</svg>
											</div>
											<h3>No saved ideas yet</h3>
											<p>Save ideas from your results to build a shortlist you can revisit anytime.</p>
										</div>
									) : (
										<div className="research-ideas-grid">
											{savedIdeas.map((idea, i) => (
												<ResearchIdeaCard
													key={`${idea.id}-${idea.savedAt}`}
													idea={idea}
													index={i}
													topic={idea.topic}
													discipline={idea.discipline}
													scope={scope || "masters"}
													saved
													studentUI={variant === "student"}
													inSavedList
													onSave={() => {}}
													onUnsave={() => handleUnsave(idea)}
												/>
											))}
										</div>
									)}
								</div>
							</>
						) : showHistory ? (
							<>
								<div className="research-wizard-head">
									<div>
										<h2 className="research-wizard-title">Your research history</h2>
										<p className="research-wizard-subtitle">
											Revisit generated topic ideas and saved research papers from this workspace.
										</p>
									</div>
								</div>
								<div className="research-wizard-body">
									<StudentResearchHistory
										sessions={recentSessions}
										papers={savedPapers}
										onOpenSession={loadSession}
										onRemoveSession={(sessionId) => setRecentSessions(removeRecentSession(sessionId))}
										paperVariant={variant === "student" ? "student" : "lecturer"}
										showTopicHistory={variant === "student"}
									/>
								</div>
							</>
						) : step === 1 ? (
							<>
								<div className="research-wizard-head">
									<div className="research-wizard-head-main">
										<span className="research-wizard-step-badge research-wizard-step-badge-indigo" aria-hidden>
											<IconBook size={16} />
										</span>
										<div>
											<h2 className="research-wizard-title">Your field &amp; scope</h2>
											<p className="research-wizard-subtitle">Tell us about your academic background and research level.</p>
										</div>
									</div>
								</div>
								<div className="research-wizard-body">
									<div className="research-form-section research-form-section-indigo">
										<DisciplineSelect
											value={discipline}
											onChange={setDiscipline}
											label="Your field or discipline"
											labelIcon={<IconLayers size={15} />}
											wrapClassName="research-discipline-wrap"
											selectClassName="research-form-select"
											hint="Choose the academic area closest to your research interest."
										/>
										<ResearchScopeSelect
											value={scope}
											onChange={setScope}
											labelIcon={<IconGraduationCap size={15} />}
											wrapClassName="research-scope-wrap"
											selectClassName="research-form-select"
										/>
										{scopeError && <p className="error-text">Please select a research scope.</p>}
									</div>
								</div>
							</>
						) : step === 2 ? (
							<>
								<div className="research-wizard-head">
									<div className="research-wizard-head-main">
										<span className="research-wizard-step-badge research-wizard-step-badge-violet" aria-hidden>
											<IconEdit size={16} />
										</span>
										<div>
											<h2 className="research-wizard-title">Your interest topic</h2>
											<p className="research-wizard-subtitle">
												Share a theme or draft focus. A four-agent pipeline will identify discipline, variables,
												population, context, and research gaps before formulating publishable study titles.
											</p>
										</div>
									</div>
								</div>
								<div className="research-wizard-body">
									<div className="research-summary-pill">
										<span className="research-summary-chip research-summary-chip-indigo">
											<IconLayers size={13} />
											{disciplineLabel}
										</span>
										<span className="research-summary-chip research-summary-chip-violet">
											{SCOPE_ICONS[scope as ResearchScope]}
											{SCOPE_OPTIONS.find((s) => s.id === scope)?.label}
										</span>
									</div>
									<div className="research-form-section research-form-section-violet">
										<div className="research-field">
											<label className="research-field-label research-field-label-row" htmlFor="research-topic">
												<span className="research-field-icon research-field-icon-violet">
													<IconTarget size={15} />
												</span>
												<span>Interest topic</span>
											</label>
											<p className="research-input-hint">{TOPIC_INPUT_HINT}</p>
											<div className="research-input-icon-wrap">
												<span className="research-input-leading-icon" aria-hidden>
													<IconEdit size={16} />
												</span>
												<textarea
													id="research-topic"
													className="research-topic-input"
													rows={5}
													maxLength={500}
													placeholder={STRONG_TOPIC_EXAMPLES[0]}
													value={topic}
													onChange={(e) => setTopic(e.target.value)}
													autoFocus
												/>
											</div>
											{topicError && <p className="error-text">Please enter an interest topic.</p>}
											<p className="research-char-count">{topic.length} / 500</p>
											<div className="research-topic-guidance">
												<p className="research-topic-guidance-title">Themes vs. research topics</p>
												<ul className="research-topic-guidance-list">
													{VAGUE_TOPIC_EXAMPLES.slice(0, 3).map((example) => (
														<li key={example} className="research-topic-guidance-avoid">
															{example} — too broad
														</li>
													))}
													{STRONG_TOPIC_EXAMPLES.slice(0, 2).map((example) => (
														<li key={example}>{example}</li>
													))}
												</ul>
											</div>
										</div>
									</div>
									{recentSessions.length > 0 && (
										<section className="research-recent">
											<h3 className="research-recent-title">
												<IconClock size={13} />
												Recent sessions
											</h3>
											<ul className="research-recent-list">
												{recentSessions.slice(0, 3).map((session) => (
													<li key={session.id} className="research-recent-row">
														<button type="button" className="research-recent-item" onClick={() => loadSession(session)}>
															<span className="research-recent-topic">{session.topic}</span>
															<span className="research-recent-meta">
																{getDisciplineLabel(session.discipline)} · {session.ideas.length} ideas
															</span>
														</button>
														<button
															type="button"
															className="research-recent-remove"
															aria-label={`Remove recent session: ${session.topic}`}
															onClick={() => handleRemoveRecent(session.id)}
														>
															<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
																<path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
															</svg>
														</button>
													</li>
												))}
											</ul>
										</section>
									)}
								</div>
							</>
						) : (
							<>
								<div className="research-wizard-head">
									<div>
										<h2 className="research-wizard-title">
											{filteredIdeas?.length ? `${filteredIdeas.length} research ideas` : "Generating ideas…"}
										</h2>
										{topic.trim() && (
											<p className="research-wizard-subtitle">
												{disciplineLabel} · {SCOPE_OPTIONS.find((s) => s.id === scope)?.label} · &ldquo;{topic.trim()}&rdquo;
											</p>
										)}
									</div>
									{filteredIdeas && filteredIdeas.length > 0 && (
										<div className="research-toolbar">
											<div className="research-view-toggle" role="group" aria-label="View mode">
												<button
													type="button"
													className={viewMode === "cards" ? "active" : ""}
													onClick={() => setViewMode("cards")}
													aria-pressed={viewMode === "cards"}
												>
													<IconGrid size={14} />
													Cards
												</button>
												<button
													type="button"
													className={viewMode === "markdown" ? "active" : ""}
													onClick={() => setViewMode("markdown")}
													aria-pressed={viewMode === "markdown"}
												>
													<IconMarkdown size={14} />
													Markdown
												</button>
											</div>
											<button type="button" className="research-toolbar-btn" onClick={handleCopyAll}>
												<IconCopy size={14} />
												{copiedAll ? "Copied!" : "Copy all"}
											</button>
											<button type="button" className="research-toolbar-btn" onClick={handleExport}>
												<IconDownload size={14} />
												Export
											</button>
											<button
												type="button"
												className="research-toolbar-btn research-toolbar-btn-primary"
												onClick={handleRegenerate}
												disabled={isBusy}
											>
												<IconRefresh size={14} />
												Regenerate
											</button>
										</div>
									)}
								</div>
								<div className="research-wizard-body">
									{parsedIdeas && parsedIdeas.length > 0 && (
										<div className="research-filter-bar">
											<span className="research-filter-label">
												<IconFilter size={13} />
												Filter by type
											</span>
											<div className="research-filter-pills">
												{FOCUS_OPTIONS.map((opt) => (
													<button
														key={opt.id}
														type="button"
														className={`research-filter-pill research-filter-pill-${opt.id} ${focusFilter === opt.id ? "research-filter-pill-active" : ""}`}
														onClick={() => setFocusFilter(opt.id)}
													>
														{FOCUS_PILL_ICONS[opt.id]}
														{opt.label}
													</button>
												))}
											</div>
										</div>
									)}

									{error && <div className="banner banner-error research-error">{error}</div>}
									{generateError && !parsedIdeas?.length && (
										<div className="banner banner-error research-error">{generateError}</div>
									)}
									{!hasTokens && (
										<div className="banner banner-error research-error">
											{variant === "student"
												? "You have used all your research tokens. Contact your instructor for more."
												: "You have used all your research tokens. Contact support for more."}
										</div>
									)}
									{renderResults()}
								</div>
							</>
						)}

						<footer className="research-wizard-nav">
							<div className="research-wizard-nav-start">
								{(step > 1 || showSaved || showHistory) && (
									<button type="button" className="research-nav-btn research-nav-btn-back" onClick={goBack}>
										<IconChevronLeft size={16} />
										Back
									</button>
								)}
							</div>
							<div className="research-wizard-nav-end">
								{!showSaved && !showHistory && step === 3 && (
									<button type="button" className="research-nav-btn research-nav-btn-ghost" onClick={handleStartOver}>
										<IconRotateCcw size={16} />
										Start over
									</button>
								)}
								{isGenerating && step === 3 && (
									<button type="button" className="research-nav-btn research-nav-btn-ghost" onClick={handleStopGenerate}>
										<IconStop size={16} />
										Stop
									</button>
								)}
								{isBusy && !isGenerating && step === 3 && (
									<button type="button" className="research-nav-btn research-nav-btn-ghost" onClick={abort}>
										<IconStop size={16} />
										Stop
									</button>
								)}
								{!showSaved && !showHistory && step < 3 && (
									<button
										type="button"
										className="research-nav-btn research-nav-btn-next"
										onClick={goNext}
										disabled={(step === 2 && (isGenerating || isBusy)) || (step === 2 && !hasTokens)}
										title={step === 2 && !hasTokens ? "Research token limit reached" : undefined}
									>
										{step === 2 && !isGenerating && !isBusy && <IconSparkles size={16} />}
										{step === 2 ? (isGenerating || isBusy ? "Generating…" : "Generate ideas") : "Next"}
										{step === 1 && <IconChevronRight size={16} />}
									</button>
								)}
							</div>
						</footer>
					</div>
				</div>
			</div>
	);

	return variant === "student" ? <StudentLayout>{page}</StudentLayout> : <AulaLayout showRightPanel={false}>{page}</AulaLayout>;
}
