import { Suspense } from "react";

import { RegisterScreen } from "@/components/RegisterScreen";

export default function RegisterPage() {
	return (
		<Suspense fallback={<div className="auth-page auth-page-loading">Loading…</div>}>
			<RegisterScreen />
		</Suspense>
	);
}
