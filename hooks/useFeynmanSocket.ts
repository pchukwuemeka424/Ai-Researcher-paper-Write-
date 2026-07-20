"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { wsUrl } from "@/lib/api";
import { applyAgentEvent, type AgentEventPayload, type ChatMessage } from "@/lib/agent-events";
import { useAuth } from "@/hooks/useAuth";
import type { StudentTokenQuota } from "@/lib/student-tokens";

export type Workflow = {
	name: string;
	description: string;
	command: string;
};

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

type UseFeynmanSocketOptions = {
	/** When false, no socket is opened (e.g. while auth is still loading). */
	enabled?: boolean;
};

export function useFeynmanSocket(options: UseFeynmanSocketOptions = {}) {
	const enabled = options.enabled ?? true;
	const { setTokenQuota } = useAuth();
	const [status, setStatus] = useState<ConnectionStatus>("connecting");
	const [agentState, setAgentState] = useState<string>("idle");
	const [model, setModel] = useState<string | undefined>();
	const [workflows, setWorkflows] = useState<Workflow[]>([]);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isBusy, setIsBusy] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);

	const socketRef = useRef<WebSocket | null>(null);
	const closingRef = useRef(false);
	const draftIdRef = useRef<string | null>(null);
	const reconnectTimerRef = useRef<number | null>(null);
	const reconnectAttemptRef = useRef(0);
	const enabledRef = useRef(enabled);
	/** Topic to send as prompt after chat-paper workflow reset completes. */
	const pendingPaperTopicRef = useRef<string | null>(null);

	enabledRef.current = enabled;

	const applyEvent = useCallback((payload: Record<string, unknown>) => {
		if (payload.type === "status") {
			setAgentState(String(payload.state ?? "idle"));
			if (payload.state === "running") setIsBusy(true);
			if (payload.state === "error") {
				setIsBusy(false);
				pendingPaperTopicRef.current = null;
			}
			return;
		}

		if (payload.type === "connected") {
			const st = payload.status as { model?: string; state?: string; sessionId?: string | null } | undefined;
			setModel(st?.model);
			setAgentState(st?.state ?? "idle");
			setSessionId(st?.sessionId ?? null);
			if (Array.isArray(payload.workflows)) {
				setWorkflows(payload.workflows as Workflow[]);
			}
			return;
		}

		if (payload.type === "student_token_quota") {
			const quota = payload.quota as StudentTokenQuota | undefined;
			if (quota && typeof quota.remaining === "number") {
				setTokenQuota(quota);
			}
			return;
		}

		if (payload.type === "error") {
			setError(String(payload.error ?? "Unknown error"));
			setIsBusy(false);
			pendingPaperTopicRef.current = null;
			return;
		}

		if (payload.type === "reset_complete") {
			const st = payload.status as { sessionId?: string | null; state?: string } | undefined;
			if (st?.sessionId) setSessionId(st.sessionId);

			const pendingTopic = pendingPaperTopicRef.current;
			if (pendingTopic) {
				pendingPaperTopicRef.current = null;
				setIsBusy(true);
				if (socketRef.current?.readyState === WebSocket.OPEN) {
					socketRef.current.send(JSON.stringify({ type: "prompt", message: pendingTopic }));
				} else {
					setError("Not connected to server.");
					setIsBusy(false);
				}
				return;
			}
			if (st?.state !== "running") setIsBusy(false);
			return;
		}

		if (payload.type === "prompt_complete") {
			setIsBusy(false);
			return;
		}

		setMessages((prev) => {
			const result = applyAgentEvent(prev, payload as AgentEventPayload, draftIdRef.current);
			draftIdRef.current = result.assistantDraftId;
			return result.messages;
		});
	}, [setTokenQuota]);

	const applyEventRef = useRef(applyEvent);
	applyEventRef.current = applyEvent;

	const clearReconnectTimer = useCallback(() => {
		if (reconnectTimerRef.current != null) {
			window.clearTimeout(reconnectTimerRef.current);
			reconnectTimerRef.current = null;
		}
	}, []);

	const connect = useCallback(() => {
		if (!enabledRef.current) return;

		closingRef.current = false;
		clearReconnectTimer();
		setStatus("connecting");
		if (reconnectAttemptRef.current === 0) setError(null);

		try {
			socketRef.current?.close();
		} catch {
			/* ignore stale socket */
		}

		const ws = new WebSocket(wsUrl());
		socketRef.current = ws;

		ws.onopen = () => {
			if (closingRef.current || socketRef.current !== ws) return;
			reconnectAttemptRef.current = 0;
			setStatus("connected");
			setError(null);
		};

		ws.onclose = () => {
			if (closingRef.current || socketRef.current !== ws) return;
			setIsBusy(false);
			pendingPaperTopicRef.current = null;
			setStatus("disconnected");

			if (!enabledRef.current) return;
			clearReconnectTimer();
			const attempt = reconnectAttemptRef.current;
			const delay = Math.min(1000 * 2 ** attempt, 15000);
			reconnectAttemptRef.current = attempt + 1;
			setError("WebSocket connection failed. Reconnecting…");
			setStatus("connecting");
			reconnectTimerRef.current = window.setTimeout(() => {
				reconnectTimerRef.current = null;
				connect();
			}, delay);
		};

		ws.onerror = () => {
			if (closingRef.current || socketRef.current !== ws) return;
			setStatus("error");
			setError("WebSocket connection failed. Reconnecting…");
		};

		ws.onmessage = (event) => {
			try {
				const payload = JSON.parse(event.data) as Record<string, unknown>;
				applyEventRef.current(payload);
			} catch {
				setError("Failed to parse server message.");
			}
		};
	}, [clearReconnectTimer]);

	useEffect(() => {
		if (!enabled) {
			closingRef.current = true;
			clearReconnectTimer();
			reconnectAttemptRef.current = 0;
			socketRef.current?.close();
			socketRef.current = null;
			setStatus("connecting");
			setError(null);
			return;
		}

		reconnectAttemptRef.current = 0;
		connect();
		return () => {
			closingRef.current = true;
			clearReconnectTimer();
			socketRef.current?.close();
			socketRef.current = null;
		};
	}, [connect, enabled, clearReconnectTimer]);

	const send = useCallback((type: string, body: Record<string, unknown> = {}) => {
		if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
			setError("Not connected to server.");
			return;
		}
		setError(null);
		socketRef.current.send(JSON.stringify({ type, ...body }));
	}, []);

	const sendPrompt = useCallback(
		(message: string) => {
			setIsBusy(true);
			send("prompt", { message });
		},
		[send],
	);

	const startWorkflow = useCallback(
		(workflow: string, topic: string) => {
			setMessages([]);
			draftIdRef.current = null;
			setIsBusy(true);
			send("reset", { workflow, topic: topic.trim() });
		},
		[send],
	);

	/**
	 * Start chat-paper workflow, then send the topic as a prompt when reset finishes.
	 * Two steps so generation runs even when the API server only applies `message` on non-workflow resets.
	 */
	const sendResearchPaper = useCallback(
		(topic: string) => {
			const trimmed = topic.trim();
			if (!trimmed) return;
			setMessages([]);
			draftIdRef.current = null;
			pendingPaperTopicRef.current = trimmed;
			setIsBusy(true);
			send("reset", {
				workflow: "chat-paper",
				topic: trimmed,
			});
		},
		[send],
	);

	const resetSession = useCallback(() => {
		setMessages([]);
		draftIdRef.current = null;
		send("reset", {});
	}, [send]);

	const clearMessages = useCallback(() => {
		setMessages([]);
		draftIdRef.current = null;
		setError(null);
	}, []);

	const abort = useCallback(() => {
		send("abort");
		setIsBusy(false);
	}, [send]);

	return {
		status,
		agentState,
		model,
		workflows,
		messages,
		error,
		isBusy,
		sendPrompt,
		sendResearchPaper,
		startWorkflow,
		resetSession,
		clearMessages,
		abort,
		sessionId,
	};
}
