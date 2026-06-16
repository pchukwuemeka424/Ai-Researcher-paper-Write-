import { Suspense } from "react";

import { ResearchOutlinePage } from "@/components/research/ResearchOutlinePage";

export const metadata = {
	title: "Research outline",
	description: "View and manage a generated research outline.",
};

export default function StudentResearchOutlinePage() {
	return (
		<Suspense fallback={null}>
			<ResearchOutlinePage variant="student" />
		</Suspense>
	);
}
