"use client";

import { SidebarNavLink } from "@/components/sidebar/SidebarPrimitives";
import { savedResearchListPath } from "@/lib/saved-research-routes";

type Props = {
	onNavigate?: () => void;
	variant?: "aula" | "student";
};

export function SavedResearchPanel({ onNavigate, variant = "aula" }: Props) {
	const isStudent = variant === "student";
	const listPath = savedResearchListPath(isStudent ? "student" : "lecturer");

	return (
		<SidebarNavLink
			href={listPath}
			iconId="folder"
			label="Saved research"
			description="Bookmarked ideas and drafts"
			onNavigate={onNavigate}
		/>
	);
}
