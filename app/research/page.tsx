import { Suspense } from "react";

import { ResearchAssistant } from "@/components/ResearchAssistant";

export const metadata = {
	title: "Research Assistant",
	description: "Generate tailored research question ideas based on your discipline and interest area.",
};

export default function ResearchPage() {
	return (
		<Suspense fallback={null}>
			<ResearchAssistant />
		</Suspense>
	);
}
