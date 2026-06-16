import { formatResearchPaperReferences } from "@/lib/research-paper-references";
import type { TokenUsage } from "@/lib/token-usage";

export type ChatMessage = {
	id: string;
	role: "user" | "assistant" | "system" | "tool";
	content: string;
	toolName?: string;
	tokenUsage?: TokenUsage;
};

export type AgentEventPayload = {
	type: string;
	[key: string]: unknown;
};

function extractTextFromMessage(message: unknown): string {
	if (!message || typeof message !== "object") return "";
	const record = message as Record<string, unknown>;
	if (typeof record.content === "string") return record.content;
	if (!Array.isArray(record.content)) return "";

	const parts: string[] = [];
	for (const block of record.content) {
		if (!block || typeof block !== "object") continue;
		const b = block as Record<string, unknown>;
		if (b.type === "text" && typeof b.text === "string") {
			parts.push(b.text);
		}
	}
	return parts.join("");
}

export function applyAgentEvent(
	messages: ChatMessage[],
	event: AgentEventPayload,
	assistantDraftId: string | null,
): { messages: ChatMessage[]; assistantDraftId: string | null } {
	const next = [...messages];

	if (event.type === "user_message" && typeof event.content === "string") {
		next.push({
			id: String(event.id ?? crypto.randomUUID()),
			role: "user",
			content: event.content,
		});
		return { messages: next, assistantDraftId };
	}

	if (event.type !== "agent_event") {
		return { messages: next, assistantDraftId };
	}

	const agentEvent = event.event as AgentEventPayload | undefined;
	if (!agentEvent?.type) {
		return { messages: next, assistantDraftId };
	}

	if (agentEvent.type === "message_update") {
		const assistantEvent = agentEvent.assistantMessageEvent as Record<string, unknown> | undefined;
		const delta =
			assistantEvent?.type === "text_delta" && typeof assistantEvent.delta === "string"
				? assistantEvent.delta
				: "";
		if (!delta) return { messages: next, assistantDraftId };

		let draftId = assistantDraftId;
		if (!draftId) {
			draftId = crypto.randomUUID();
			next.push({ id: draftId, role: "assistant", content: delta });
		} else {
			const index = next.findIndex((m) => m.id === draftId);
			if (index >= 0) {
				next[index] = { ...next[index]!, content: next[index]!.content + delta };
			}
		}
		return { messages: next, assistantDraftId: draftId };
	}

	if (agentEvent.type === "message_end" || agentEvent.type === "turn_end") {
		const text = extractTextFromMessage(agentEvent.message);
		if (text && !assistantDraftId) {
			next.push({ id: crypto.randomUUID(), role: "assistant", content: text });
		}
		return { messages: next, assistantDraftId: null };
	}

	if (agentEvent.type === "token_usage") {
		const usage = agentEvent.usage as TokenUsage | undefined;
		if (!usage || typeof usage.totalTokens !== "number") {
			return { messages: next, assistantDraftId };
		}
		const lastAssistantIndex = next.findLastIndex((message) => message.role === "assistant");
		if (lastAssistantIndex >= 0) {
			next[lastAssistantIndex] = { ...next[lastAssistantIndex]!, tokenUsage: usage };
		}
		return { messages: next, assistantDraftId };
	}

	if (agentEvent.type === "agent_end") {
		const lastAssistantIndex = next.findLastIndex((message) => message.role === "assistant");
		if (lastAssistantIndex >= 0 && next[lastAssistantIndex]!.content.trim()) {
			next[lastAssistantIndex] = {
				...next[lastAssistantIndex]!,
				content: formatResearchPaperReferences(next[lastAssistantIndex]!.content),
			};
		}
		return { messages: next, assistantDraftId: null };
	}

	if (agentEvent.type === "tool_execution_start") {
		const toolName = String(agentEvent.toolName ?? "tool");
		next.push({
			id: crypto.randomUUID(),
			role: "tool",
			content: `Running ${toolName}…`,
			toolName,
		});
		return { messages: next, assistantDraftId: null };
	}

	if (agentEvent.type === "tool_execution_end") {
		const toolName = String(agentEvent.toolName ?? "tool");
		const isError = Boolean(agentEvent.isError);
		next.push({
			id: crypto.randomUUID(),
			role: "tool",
			content: isError ? `${toolName} failed` : `${toolName} completed`,
			toolName,
		});
		return { messages: next, assistantDraftId: null };
	}

	return { messages: next, assistantDraftId };
}
