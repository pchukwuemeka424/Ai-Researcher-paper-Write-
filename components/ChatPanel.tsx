"use client";

import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/lib/agent-events";
import { APP_NAME } from "@/lib/brand";
import { promoteBoldSectionsForDisplay } from "@/lib/research-paper-sections";
import { formatTokenUsage } from "@/lib/token-usage";
import { ResearchPaperMarkdown } from "@/components/research/ResearchPaperMarkdown";

const SUGGESTIONS = [
	"The impact of large language models on academic integrity in higher education",
	"A systematic review of renewable energy adoption in Sub-Saharan Africa",
	"Machine learning approaches to early disease detection in clinical settings",
];

type Props = {
	messages: ChatMessage[];
	isBusy: boolean;
	onSuggestionClick?: (text: string) => void;
};

function GeneratingBody({ label, detail }: { label: string; detail?: string }) {
	return (
		<div className="chat-generating" role="status" aria-live="polite">
			<div className="chat-generating-dots" aria-hidden>
				<span />
				<span />
				<span />
			</div>
			<div>
				<p className="chat-generating-label">{label}</p>
				{detail && <p className="chat-generating-detail">{detail}</p>}
			</div>
		</div>
	);
}

function roleLabel(msg: ChatMessage): string {
	if (msg.role === "user") return "You";
	if (msg.role === "assistant") return APP_NAME;
	if (msg.role === "tool") return msg.toolName ?? "Tool";
	return "System";
}

export function ChatPanel({ messages, isBusy, onSuggestionClick }: Props) {
	const endRef = useRef<HTMLDivElement>(null);
	const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
	const assistantHasText = Boolean(lastAssistant?.content.trim());
	const showEmpty = messages.length === 0 && !isBusy;

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isBusy]);

	if (showEmpty) {
		return (
			<div className="chat-welcome">
				<div className="chat-welcome-inner">
					<div className="chat-welcome-badge">Research workspace</div>
					<h2 className="chat-welcome-title">Generate a cited academic paper</h2>
					<p className="chat-welcome-lead">
						Enter a research topic below. {APP_NAME} produces a structured paper with in-text citations and a
						reference list in your chosen style.
					</p>

					{onSuggestionClick && (
						<div className="chat-welcome-suggestions">
							<p className="chat-welcome-suggestions-label">Try a topic</p>
							<div className="chat-welcome-chips">
								{SUGGESTIONS.map((topic) => (
									<button
										key={topic}
										type="button"
										className="chat-welcome-chip"
										onClick={() => onSuggestionClick(topic)}
									>
										{topic}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		);
	}

	const generatingLabel = assistantHasText
		? "Still writing your research paper…"
		: "Generating your research paper…";
	const generatingDetail = assistantHasText
		? "Text appears below as each section is drafted."
		: "This may take a minute. Sections and citations will stream in shortly.";

	return (
		<div className="chat-thread">
			{messages.map((msg) => (
				<article
					key={msg.id}
					className={`chat-turn chat-turn-${msg.role}${msg.role === "assistant" && isBusy && !msg.content.trim() ? " chat-turn-generating" : ""}`}
				>
					<div className="chat-turn-content">
						<header className="chat-turn-header">
							<span className={`chat-turn-label chat-turn-label-${msg.role}`}>{roleLabel(msg)}</span>
							{msg.role === "assistant" && msg.tokenUsage && !isBusy && (
								<span className="chat-turn-meta" title="LLM tokens used to generate this paper">
									{formatTokenUsage(msg.tokenUsage)}
								</span>
							)}
						</header>
						<div className="chat-turn-body">
							{msg.role === "assistant" ? (
								msg.content.trim() ? (
									<div className="chat-paper-markdown">
										<ResearchPaperMarkdown content={promoteBoldSectionsForDisplay(msg.content)} />
									</div>
								) : (
									<GeneratingBody label={generatingLabel} detail={generatingDetail} />
								)
							) : (
								<p className="chat-turn-text">{msg.content}</p>
							)}
						</div>
					</div>
				</article>
			))}
			{isBusy && !lastAssistant && (
				<article className="chat-turn chat-turn-assistant chat-turn-generating">
					<div className="chat-turn-content">
						<header className="chat-turn-header">
							<span className="chat-turn-label chat-turn-label-assistant">{APP_NAME}</span>
						</header>
						<div className="chat-turn-body">
							<GeneratingBody label={generatingLabel} detail={generatingDetail} />
						</div>
					</div>
				</article>
			)}
			{isBusy && assistantHasText && (
				<p className="chat-stream-hint" aria-live="polite">
					<span className="chat-stream-dot" aria-hidden />
					Generating text…
				</p>
			)}
			<div ref={endRef} className="chat-thread-end" />
		</div>
	);
}
