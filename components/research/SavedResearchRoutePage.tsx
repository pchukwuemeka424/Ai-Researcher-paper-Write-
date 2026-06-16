"use client";

import { useSearchParams } from "next/navigation";

import { SavedResearchListPage } from "@/components/research/SavedResearchListPage";
import { SavedResearchPaperPage } from "@/components/research/SavedResearchPaperPage";

type Props = {
	variant: "lecturer" | "student";
};

function SavedResearchRoute({ variant }: Props) {
	const searchParams = useSearchParams();
	const id = searchParams.get("id")?.trim() ?? "";

	if (id) {
		return <SavedResearchPaperPage variant={variant} />;
	}

	return <SavedResearchListPage variant={variant} />;
}

export function SavedResearchRoutePage({ variant }: Props) {
	return <SavedResearchRoute variant={variant} />;
}
