"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
	const router = useRouter();

	return (
		<main
			style={{
				minHeight: "60vh",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: "0.75rem",
				padding: "2rem",
				textAlign: "center",
				fontFamily: "inherit",
			}}
		>
			<h1 style={{ margin: 0, fontSize: "1.25rem" }}>Page not found</h1>
			<p style={{ margin: 0, color: "#64748b" }}>
				That page does not exist or may have been moved.
			</p>
			<button
				type="button"
				onClick={() => router.push("/research")}
				style={{
					border: "none",
					background: "transparent",
					color: "#0d0b61",
					fontWeight: 600,
					cursor: "pointer",
					font: "inherit",
					padding: 0,
				}}
			>
				Go to Research Assistant
			</button>
			<Link href="/" style={{ color: "#64748b", fontSize: "0.875rem" }}>
				Home
			</Link>
		</main>
	);
}
