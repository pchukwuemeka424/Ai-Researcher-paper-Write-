import { Suspense } from "react";

import { LessonPlanner } from "@/components/LessonPlanner";

export const metadata = {
	title: "Lesson Planner",
	description: "Create university course outlines, session plans, activity sheets, and assessment rubrics.",
};

export default function LessonPlannerPage() {
	return (
		<Suspense fallback={null}>
			<LessonPlanner />
		</Suspense>
	);
}
