import { apiUrl } from "@/lib/api";
import { authHeaders } from "@/lib/auth";

export interface GenerateArgs {
	system?: string;
	messages: { role: "user" | "assistant"; content: string }[];
	maxTokens?: number;
	/** Reserved; project LLM does not currently enable provider web search. */
	webSearch?: boolean;
}

export interface GenerateResult {
	text: string;
	provider: string;
	model: string;
}

/**
 * Client entry to Research Note AI. Uses the project's OpenRouter stack via
 * `/api/research-note/ai/generate` — no BYO keys or provider config.
 */
export async function generate(args: GenerateArgs): Promise<GenerateResult> {
	const res = await fetch(apiUrl("/api/research-note/ai/generate"), {
		method: "POST",
		headers: { "content-type": "application/json", ...authHeaders() },
		body: JSON.stringify({
			system: args.system,
			messages: args.messages,
			maxTokens: args.maxTokens,
		}),
	});

	const json = (await res.json().catch(() => ({}))) as {
		text?: string;
		error?: string;
		provider?: string;
		model?: string;
	};
	if (!res.ok) throw new Error(json.error || `Generation failed (HTTP ${res.status})`);
	return {
		text: json.text ?? "",
		provider: json.provider ?? "openrouter",
		model: json.model ?? "feynman",
	};
}
