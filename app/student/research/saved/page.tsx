import { Suspense } from "react";

import { SavedResearchRoutePage } from "@/components/research/SavedResearchRoutePage";

export const metadata = {
	title: "Saved research",
	description: "Browse saved research papers and bookmarked ideas.",
};

export default function StudentSavedResearchPage() {
	return (
		<Suspense fallback={null}>
			<SavedResearchRoutePage variant="student" />
		</Suspense>
	);
}
