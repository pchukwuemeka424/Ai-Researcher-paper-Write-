import { Suspense } from "react";

import { LessonPresentationPage } from "@/components/LessonPresentationPage";

export const metadata = {
	title: "Course Presentation",
	description: "Explanatory slides and AI illustrations generated from your course outline.",
};

export default function CoursePresentationRoutePage() {
	return (
		<Suspense
			fallback={
				<div className="lp-page">
					<div className="lp-state lp-state-loading" role="status">
						<div className="lp-spinner" aria-hidden />
						<p className="lp-state-title">Loading…</p>
					</div>
				</div>
			}
		>
			<LessonPresentationPage />
		</Suspense>
	);
}
