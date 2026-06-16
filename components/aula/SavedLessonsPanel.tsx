"use client";

import { SidebarNavLink } from "@/components/sidebar/SidebarPrimitives";
import { SAVED_COURSES_PAGE_PATH } from "@/lib/saved-courses-routes";

type Props = {
	onNavigate?: () => void;
};

export function SavedLessonsPanel({ onNavigate }: Props) {
	return (
		<SidebarNavLink
			href={SAVED_COURSES_PAGE_PATH}
			iconId="folder"
			label="Saved courses"
			description="Your generated lesson outlines"
			onNavigate={onNavigate}
		/>
	);
}
