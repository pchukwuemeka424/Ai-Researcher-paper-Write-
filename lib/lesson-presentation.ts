export type PresentationSlide = {
	title: string;
	explanation: string;
	bullets: string[];
	imageUrl: string | null;
};

export type CoursePresentation = {
	title: string;
	slides: PresentationSlide[];
};

export function presentationFilename(title: string): string {
	const slug = title
		.trim()
		.slice(0, 48)
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.toLowerCase();
	return `${slug || "course-presentation"}.md`;
}

export function presentationToMarkdown(presentation: CoursePresentation): string {
	const lines = [`# ${presentation.title}`, ""];
	for (const [index, slide] of presentation.slides.entries()) {
		lines.push(`## Slide ${index + 1}: ${slide.title}`, "", slide.explanation);
		if (slide.bullets.length > 0) {
			lines.push("");
			for (const bullet of slide.bullets) {
				lines.push(`- ${bullet}`);
			}
		}
		lines.push("");
	}
	return lines.join("\n");
}
