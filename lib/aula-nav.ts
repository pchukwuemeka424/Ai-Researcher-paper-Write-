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

export type DeadlineItem = {
	id: string;
	title: string;
	dueLabel: string;
	urgency: "urgent" | "soon" | "ok";
};

export type TaskItem = {
	id: string;
	label: string;
	done: boolean;
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
		description: "Generate a level-aligned course outline from your title in minutes.",
		iconColor: "purple",
	},
	{
		id: "chat",
		label: "AI Chat",
		href: "/dashboard/chat",
		description: "Draft academic papers and research with governed AI assistance.",
		iconColor: "orange",
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
	tagline: "Plan, schedule, and deliver world-class lectures",
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
		id: "references",
		label: "References",
		href: "/references",
		match: "prefix",
		description: AULA_QUICK_ACCESS.find((t) => t.id === "references")?.description,
	},
	{
		id: "chat",
		label: "Chat",
		href: "/dashboard/chat",
		match: "prefix",
		description: "Draft academic papers and research with governed AI assistance.",
	},
];

export function isAulaTopbarItemActive(pathname: string, item: AulaTopbarNavItem): boolean {
	const base = aulaHrefPath(item.href);

	if (item.id === "research" && (pathname === "/dashboard/research" || pathname.startsWith("/dashboard/research/"))) {
		return true;
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
	if (item.id === "chat") return "AI Chat";
	return item.label;
}

function topbarCtaForItem(item: AulaTopbarNavItem): AulaTopbarContext["cta"] {
	switch (item.id) {
		case "lesson-planner":
			return { label: "New Lecture", href: "/lesson-planner" };
		case "research":
			return { label: "New Research", href: "/research" };
		case "references":
			return { label: "Format Reference", href: "/references" };
		case "chat":
			return { label: "New Chat", href: "/dashboard/chat" };
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

export const AULA_DEADLINES: DeadlineItem[] = [
	{ id: "1", title: "Data Structures Assignment", dueLabel: "Due May 18", urgency: "urgent" },
	{ id: "2", title: "Research Paper Draft", dueLabel: "Due May 22", urgency: "soon" },
	{ id: "3", title: "Final Project Submission", dueLabel: "Due May 29", urgency: "ok" },
];

export const AULA_TASKS: TaskItem[] = [
	{ id: "1", label: "Finalize Week 9 lesson plan", done: true },
	{ id: "2", label: "Update reference list for paper", done: false },
	{ id: "3", label: "Prepare rubric for assignment 3", done: false },
	{ id: "4", label: "Schedule office hours", done: false },
];

export function aulaHrefPath(href: string): string {
	return href.split("#")[0] ?? href;
}

export function aulaHrefHash(href: string): string | null {
	const hash = href.split("#")[1];
	return hash ? `#${hash}` : null;
}
