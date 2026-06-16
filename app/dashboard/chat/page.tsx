import { Suspense } from "react";

import { FeynmanApp } from "@/components/FeynmanApp";

export default function ChatPage() {
	return (
		<Suspense fallback={null}>
			<FeynmanApp />
		</Suspense>
	);
}
