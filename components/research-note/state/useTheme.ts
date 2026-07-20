import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
const KEY = "rp-theme";
const ORDER: Theme[] = ["light", "dark", "system"];

function systemDark(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolved light/dark for the Research-Note shell (does not mutate <html>). */
export function resolveTheme(theme: Theme): "light" | "dark" {
	return theme === "dark" || (theme === "system" && systemDark()) ? "dark" : "light";
}

/**
 * Light/dark/system preference for Research Note only — scoped to the shell via
 * data-theme, so it does not flip the rest of GAHI.
 */
export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(() => {
		if (typeof window === "undefined") return "system";
		return (localStorage.getItem(KEY) as Theme) || "system";
	});
	const [resolved, setResolved] = useState<"light" | "dark">(() => resolveTheme(theme));

	useEffect(() => {
		localStorage.setItem(KEY, theme);
		setResolved(resolveTheme(theme));
	}, [theme]);

	useEffect(() => {
		if (theme !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = () => setResolved(resolveTheme("system"));
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [theme]);

	const setTheme = useCallback((t: Theme) => setThemeState(t), []);
	const cycle = useCallback(
		() => setThemeState((t) => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length]!),
		[],
	);

	return { theme, resolved, setTheme, cycle };
}
