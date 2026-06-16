import { Suspense } from "react";

import { LessonPlanner } from "@/components/LessonPlanner";

export const metadata = {
	title: "Lesson Planner",
	description: "Generate a level-aligned university course outline from your title.",
};

export default function LessonPlannerPage() {
	return (
		<Suspense fallback={null}>
			<LessonPlanner />
		</Suspense>
	);
}
