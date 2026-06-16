import { Suspense } from "react";

import { FeynmanApp } from "@/components/FeynmanApp";

export const metadata = {
	title: "Research paper",
	description: "Generate and edit a cited academic research paper.",
};

export default function LecturerResearchPaperPage() {
	return (
		<Suspense fallback={null}>
			<FeynmanApp />
		</Suspense>
	);
}
