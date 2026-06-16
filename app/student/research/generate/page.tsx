import { Suspense } from "react";

import { ResearchGeneratePage } from "@/components/research/ResearchGeneratePage";

export const metadata = {
	title: "Generate research paper",
	description: "Configure citation style and generate a full research paper.",
};

export default function StudentResearchGeneratePage() {
	return (
		<Suspense fallback={null}>
			<ResearchGeneratePage variant="student" />
		</Suspense>
	);
}
