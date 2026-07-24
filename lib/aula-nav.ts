export type AulaNavItem = {
	id: string;
	label: string;
	href: string;
	description?: string;
	adminOnly?: boolean;
	badge?: string;
};

export type AulaNavGroup = {
	id: string;
	label: string;
	items: AulaNavItem[];
};

export type QuickAccessTool = AulaNavItem & {
	iconColor: "blue" | "green" | "purple" | "orange" | "pink" | "teal";
};

/** Tools shown on /dashboard quick access — sidebar nav is derived from this list. */
export const AULA_QUICK_ACCESS: QuickAccessTool[] = [
	{
		id: "research",
		label: "Research Assistant",
		href: "/research",
		description: "Develop research ideas with cited references in your house style.",
		iconColor: "blue",
	},
	{
		id: "research-note",
		label: "Research Note",
		href: "/research/note",
		description: "Notes, data, lab log, and AI drafts in one notebook.",
		iconColor: "teal",
	},
	{
		id: "references",
		label: "Reference Formatter",
		href: "/references",
		description: "Turn raw source details into a clean institutional reference list.",
		iconColor: "green",
	},
	{
		id: "lesson-planner",
		label: "Lesson Planner",
		href: "/lesson-planner",
		description: "Build course outlines, session plans, activity sheets, and rubrics.",
		iconColor: "pink",
	},
];

/** Post-login hub cards on /dashboard — three primary workspace entry points. */
export const AULA_HUB_TOOLS: QuickAccessTool[] = [
	{
		id: "research",
		label: "Research Assistant",
		href: "/research",
		description: "Develop research ideas with cited references in your house style.",
		iconColor: "blue",
	},
	{
		id: "research-note",
		label: "Research Notebook",
		href: "/research/note",
		description: "Notes, data, lab log, and AI drafts in one notebook.",
		iconColor: "teal",
	},
	{
		id: "lesson-planner",
		label: "Lesson Planner",
		href: "/lesson-planner",
		description: "Build course outlines, session plans, activity sheets, and rubrics.",
		iconColor: "pink",
	},
];

export type AulaTopbarNavItem = AulaNavItem & {
	/** `exact` matches only the path; `prefix` also matches nested routes. */
	match?: "exact" | "prefix";
};

export const AULA_DASHBOARD_ITEM: AulaNavItem = {
	id: "dashboard",
	label: "Dashboard",
	href: "/dashboard",
};

export type AulaTopbarContext = {
	title: string;
	tagline: string;
	cta: { label: string; href: string };
};

const AULA_TOPBAR_DEFAULT: AulaTopbarContext = {
	title: "Lecture Studio",
	tagline: "Teaching and research workspace for higher institutions",
	cta: { label: "New Lecture", href: "/lesson-planner" },
};

/** Primary navigation shown in the dashboard top bar — one item per lecturer workspace page. */
export const AULA_TOPBAR_NAV: AulaTopbarNavItem[] = [
	{
		id: "dashboard",
		label: "Overview",
		href: "/dashboard",
		match: "exact",
		description: AULA_TOPBAR_DEFAULT.tagline,
	},
	{
		id: "lesson-planner",
		label: "Planner",
		href: "/lesson-planner",
		match: "prefix",
		description: AULA_QUICK_ACCESS.find((t) => t.id === "lesson-planner")?.description,
	},
	{
		id: "research",
		label: "Research",
		href: "/research",
		match: "prefix",
		description: AULA_QUICK_ACCESS.find((t) => t.id === "research")?.description,
	},
	{
		id: "research-note",
		label: "Notes",
		href: "/research/note",
		match: "prefix",
		description: AULA_QUICK_ACCESS.find((t) => t.id === "research-note")?.description,
	},
	{
		id: "references",
		label: "References",
		href: "/references",
		match: "prefix",
		description: AULA_QUICK_ACCESS.find((t) => t.id === "references")?.description,
	},
];

export function isAulaTopbarItemActive(pathname: string, item: AulaTopbarNavItem): boolean {
	const base = aulaHrefPath(item.href);

	if (item.id === "research" && (pathname === "/dashboard/research" || pathname.startsWith("/dashboard/research/"))) {
		return true;
	}

	// Keep Research Assistant active only on its routes — not Research Note.
	if (item.id === "research" && (pathname === "/research/note" || pathname.startsWith("/research/note/"))) {
		return false;
	}

	if (item.match === "prefix") {
		return pathname === base || pathname.startsWith(`${base}/`);
	}

	return pathname === base || pathname === `${base}/`;
}

function topbarTitleForItem(item: AulaTopbarNavItem): string {
	if (item.id === "dashboard") return AULA_TOPBAR_DEFAULT.title;
	const tool = AULA_QUICK_ACCESS.find((t) => t.id === item.id);
	if (tool) return tool.label;
	return item.label;
}

function topbarCtaForItem(item: AulaTopbarNavItem): AulaTopbarContext["cta"] {
	switch (item.id) {
		case "lesson-planner":
			return { label: "New Lecture", href: "/lesson-planner" };
		case "research":
			return { label: "New Research", href: "/research" };
		case "research-note":
			return { label: "New Research Note", href: "/research/note" };
		case "references":
			return { label: "Format Reference", href: "/references" };
		default:
			return AULA_TOPBAR_DEFAULT.cta;
	}
}

export function aulaTopbarContext(pathname: string): AulaTopbarContext {
	const activeItem = AULA_TOPBAR_NAV.find((item) => isAulaTopbarItemActive(pathname, item));
	if (!activeItem) return AULA_TOPBAR_DEFAULT;
	if (activeItem.id === "dashboard") return AULA_TOPBAR_DEFAULT;

	return {
		title: topbarTitleForItem(activeItem),
		tagline: activeItem.description ?? AULA_TOPBAR_DEFAULT.tagline,
		cta: topbarCtaForItem(activeItem),
	};
}

export const AULA_MAIN_NAV: AulaNavGroup = {
	id: "main",
	label: "Main",
	items: [
		AULA_DASHBOARD_ITEM,
		...AULA_QUICK_ACCESS.map(({ id, label, href, badge }) => ({
			id,
			label,
			href,
			...(badge ? { badge } : {}),
		})),
	],
};

export const AULA_ADMIN_ITEM: AulaNavItem = {
	id: "admin",
	label: "Admin",
	href: "/admin",
	adminOnly: true,
};

export const AULA_NAV_GROUPS: AulaNavGroup[] = [AULA_MAIN_NAV];

export function aulaHrefPath(href: string): string {
	return href.split("#")[0] ?? href;
}

export function aulaHrefHash(href: string): string | null {
	const hash = href.split("#")[1];
	return hash ? `#${hash}` : null;
}
