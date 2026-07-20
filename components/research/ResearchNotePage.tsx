"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AulaLayout } from "@/components/AulaLayout";
import { StudentLayout } from "@/components/StudentLayout";
import { ResearchNoteApp } from "@/components/research-note/ResearchNoteApp";
import { useAuth } from "@/hooks/useAuth";

type Props = {
	variant?: "lecturer" | "student";
};

export function ResearchNotePage({ variant = "lecturer" }: Props) {
	const { user, loading } = useAuth();
	const router = useRouter();
	const isStudent = variant === "student";

	useEffect(() => {
		if (!loading && !user) {
			router.replace("/login");
		}
	}, [loading, user, router]);

	if (loading || !user) {
		const waiting = (
			<div className="research-note-loading" style={{ padding: "2rem", color: "var(--text-muted, #64748b)" }}>
				Loading Research Note…
			</div>
		);
		return isStudent ? <StudentLayout>{waiting}</StudentLayout> : <AulaLayout showRightPanel={false}>{waiting}</AulaLayout>;
	}

	const app = (
		<ResearchNoteApp
			author={{
				id: user.id,
				name: user.name || user.email || "Researcher",
				email: user.email || "",
			}}
		/>
	);

	return isStudent ? (
		<StudentLayout>{app}</StudentLayout>
	) : (
		<AulaLayout showRightPanel={false} fullHeight>
			{app}
		</AulaLayout>
	);
}
