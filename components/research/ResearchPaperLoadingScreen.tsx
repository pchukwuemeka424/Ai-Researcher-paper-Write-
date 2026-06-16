"use client";

type Props = {
	projectName: string;
	preparing?: boolean;
	studentUI?: boolean;
};

export function ResearchPaperLoadingScreen({ projectName, preparing = false, studentUI = false }: Props) {
	return (
		<div
			className={`research-paper-loading${studentUI ? " research-paper-loading-student" : ""}`}
			role="status"
			aria-live="polite"
		>
			<div className="research-paper-loading-card">
				<p className="research-paper-loading-eyebrow">Research project</p>
				<h2 className="research-paper-loading-title">{projectName}</h2>
				<div className="research-paper-loading-status">
					<span className="research-outline-spinner research-paper-loading-spinner" aria-hidden />
					<div>
						<p className="research-paper-loading-label">
							{preparing ? "Preparing your research paper…" : "Generating your research paper…"}
						</p>
						<p className="research-paper-loading-detail">
							{preparing
								? "Searching literature and building your outline first."
								: "This may take a minute. Sections and citations will stream in shortly."}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
