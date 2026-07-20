/**
 * GAHI — custom color palette.
 * CSS mirror: styles/colors.css (keep both files in sync).
 */
export const colors = {
	brand: {
		primary: "#0D0B61",
		primaryHover: "#12108a",
		primaryDark: "#060549",
		primarySoft: "#ececf8",
		secondary: "#2563eb",
		secondaryHover: "#1d4ed8",
		navy: "#0a7c6e",
		teal: "#0d9488",
	},
	neutral: {
		white: "#ffffff",
		slate50: "#f8fafc",
		slate100: "#f1f5f9",
		slate200: "#e2e8f0",
		slate300: "#cbd5e1",
		slate400: "#94a3b8",
		slate500: "#64748b",
		slate600: "#475569",
		slate700: "#334155",
		slate800: "#1e293b",
		slate900: "#0f172a",
		ink: "#1a2332",
	},
	status: {
		success: "#16a34a",
		danger: "#dc2626",
		warning: "#d97706",
		info: "#2563eb",
		completed: "#059669",
	},
	navIcon: {
		dashboard: { bg: "#0D0B61", fg: "#ffffff" },
		research: { bg: "#7c3aed", fg: "#ffffff" },
		references: { bg: "#16a34a", fg: "#ffffff" },
		"lesson-planner": { bg: "#711738", fg: "#ffffff" },
		chat: { bg: "#ea580c", fg: "#ffffff" },
		users: { bg: "#2563eb", fg: "#ffffff" },
		sessions: { bg: "#7c3aed", fg: "#ffffff" },
		tokens: { bg: "#d97706", fg: "#ffffff" },
		admin: { bg: "#475569", fg: "#ffffff" },
		folder: { bg: "#d97706", fg: "#ffffff" },
		database: { bg: "#0f766e", fg: "#ffffff" },
		notes: { bg: "#0d9488", fg: "#ffffff" },
		governance: { bg: "#0D0B61", fg: "#ffffff" },
		analytics: { bg: "#2563eb", fg: "#ffffff" },
		policy: { bg: "#7c3aed", fg: "#ffffff" },
		audit: { bg: "#dc2626", fg: "#ffffff" },
		approvals: { bg: "#059669", fg: "#ffffff" },
		reports: { bg: "#711738", fg: "#ffffff" },
		risk: { bg: "#c2410c", fg: "#ffffff" },
		compliance: { bg: "#1d4ed8", fg: "#ffffff" },
		incident: { bg: "#b91c1c", fg: "#ffffff" },
		inventory: { bg: "#0f766e", fg: "#ffffff" },
		default: { bg: "#64748b", fg: "#ffffff" },
	},
	feature: {
		researchAccent: "#0D0B61",
		researchAccentHover: "#12108a",
		researchHero: "#060549",
		lessonPlannerAccent: "#711738",
		lessonPlannerAccentHover: "#5a1230",
		loginAccent: "#7c3aed",
		loginAccentHover: "#6d28d9",
	},
} as const;

export type NavIconId = keyof typeof colors.navIcon;

/** Resolve a CSS custom property, e.g. colorVar("primary") → var(--color-primary) */
export function colorVar(name: string): string {
	return `var(--color-${name})`;
}

/** Nav icon background/foreground for inline styles in components. */
export function navIconTone(iconId: string): { bg: string; fg: string } {
	if (iconId in colors.navIcon) {
		return colors.navIcon[iconId as NavIconId];
	}
	return colors.navIcon.default;
}
