import { Suspense } from "react";

import { ResearchAssistant } from "@/components/ResearchAssistant";

export default function StudentResearchPage() {
	return (
		<Suspense fallback={null}>
			<ResearchAssistant variant="student" />
		</Suspense>
	);
}
