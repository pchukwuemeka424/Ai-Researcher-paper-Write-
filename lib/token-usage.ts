export type TokenUsage = {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
};

export function formatTokenUsage(usage: TokenUsage): string {
	return `${usage.totalTokens.toLocaleString()} tokens (${usage.promptTokens.toLocaleString()} in · ${usage.completionTokens.toLocaleString()} out)`;
}
