import { Suspense } from "react";

import { FeynmanApp } from "@/components/FeynmanApp";
import { StudentLayout } from "@/components/StudentLayout";

export default function StudentResearchPaperPage() {
	return (
		<StudentLayout>
			<Suspense fallback={null}>
				<FeynmanApp layout="student" />
			</Suspense>
		</StudentLayout>
	);
}
