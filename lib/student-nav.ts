import type { AuthUser } from "@/lib/auth";

export type StudentNavItem = {
	id: string;
	label: string;
	href: string;
	description?: string;
};

export const STUDENT_DASHBOARD_ITEM: StudentNavItem = {
	id: "dashboard",
	label: "Dashboard",
	href: "/student/dashboard",
};

export const STUDENT_NAV_ITEMS: StudentNavItem[] = [
	STUDENT_DASHBOARD_ITEM,
	{
		id: "research",
		label: "Research Assistant",
		href: "/student/research",
		description: "Generate and save research ideas for your projects.",
	},
	{
		id: "references",
		label: "Reference Formatter",
		href: "/references",
		description: "Format citations in your institution's style.",
	},
];

export const STUDENT_BOARD_COLUMNS = [
	{ id: "saved" as const, label: "Saved", hint: "Ideas you've bookmarked" },
	{ id: "in_progress" as const, label: "In progress", hint: "Ideas you're working on" },
	{ id: "completed" as const, label: "Completed", hint: "Finished research topics" },
];
