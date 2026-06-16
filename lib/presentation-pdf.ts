"use client";

import type { CoursePresentation, PresentationSlide } from "@/lib/lesson-presentation";
import { researchPaperFilename } from "@/lib/research-paper-pdf";

const SLIDE_W = 792;
const SLIDE_H = 445.5;
const MARGIN = 36;
const ACCENT: [number, number, number] = [13, 148, 136];
const TEXT: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const FONT = "helvetica";

function toAscii(text: string): string {
	return text
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201C\u201D]/g, '"')
		.replace(/\u2026/g, "...")
		.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function wrapText(
	doc: import("jspdf").jsPDF,
	text: string,
	maxWidth: number,
	size: number,
): string[] {
	const clean = toAscii(text);
	if (!clean.trim()) return [];
	const split = (doc as unknown as { splitTextToSize: (t: string, w: number) => string[] }).splitTextToSize;
	if (typeof split === "function") {
		doc.setFontSize(size);
		return split.call(doc, clean, maxWidth);
	}
	return [clean];
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Could not load slide image."));
		image.src = dataUrl;
	});
}

async function dataUrlForPdf(dataUrl: string): Promise<{ data: string; format: "JPEG" | "PNG" }> {
	if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
		return { data: dataUrl, format: "JPEG" };
	}
	if (dataUrl.startsWith("data:image/png")) {
		return { data: dataUrl, format: "PNG" };
	}

	const image = await loadImage(dataUrl);
	const canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Could not process slide image.");
	context.drawImage(image, 0, 0);
	return { data: canvas.toDataURL("image/jpeg", 0.9), format: "JPEG" };
}

function drawBullets(
	doc: import("jspdf").jsPDF,
	bullets: string[],
	x: number,
	startY: number,
	maxWidth: number,
	maxY: number,
): number {
	let y = startY;
	doc.setFont(FONT, "normal");
	doc.setFontSize(11);
	doc.setTextColor(...TEXT);

	for (const bullet of bullets) {
		const lines = wrapText(doc, bullet, maxWidth - 14, 11);
		for (let i = 0; i < lines.length; i++) {
			if (y + 16 > maxY) return y;
			if (i === 0) doc.text("-", x, y);
			doc.text(lines[i], x + 14, y);
			y += 16;
		}
		y += 4;
	}

	return y;
}

async function drawSlidePage(
	doc: import("jspdf").jsPDF,
	presentation: CoursePresentation,
	slide: PresentationSlide,
	index: number,
): Promise<void> {
	if (index > 0) doc.addPage([SLIDE_W, SLIDE_H], "landscape");

	doc.setFillColor(...ACCENT);
	doc.rect(0, 0, SLIDE_W, 42, "F");

	doc.setFont(FONT, "bold");
	doc.setFontSize(10);
	doc.setTextColor(255, 255, 255);
	doc.text(toAscii(presentation.title).slice(0, 80), MARGIN, 26);

	doc.setFont(FONT, "normal");
	const slideLabel = `Slide ${index + 1} of ${presentation.slides.length}`;
	const labelW = doc.getTextWidth(slideLabel);
	doc.text(slideLabel, SLIDE_W - MARGIN - labelW, 26);

	const contentTop = 58;
	const contentBottom = SLIDE_H - MARGIN;
	const hasImage = Boolean(slide.imageUrl);
	const textX = hasImage ? SLIDE_W * 0.46 : MARGIN;
	const textWidth = hasImage ? SLIDE_W * 0.5 - MARGIN : SLIDE_W - MARGIN * 2;

	if (hasImage && slide.imageUrl) {
		try {
			const { data, format } = await dataUrlForPdf(slide.imageUrl);
			const imageBoxW = SLIDE_W * 0.4;
			const imageBoxH = contentBottom - contentTop;
			doc.setDrawColor(226, 232, 240);
			doc.setLineWidth(1);
			doc.rect(MARGIN, contentTop, imageBoxW, imageBoxH, "S");
			doc.addImage(data, format, MARGIN + 4, contentTop + 4, imageBoxW - 8, imageBoxH - 8, undefined, "FAST");
		} catch {
			doc.setFont(FONT, "normal");
			doc.setFontSize(10);
			doc.setTextColor(...MUTED);
			doc.text("Image unavailable", MARGIN + 12, contentTop + 24);
		}
	}

	doc.setFont(FONT, "bold");
	doc.setFontSize(18);
	doc.setTextColor(...TEXT);
	const titleLines = wrapText(doc, slide.title, textWidth, 18);
	let y = contentTop + 8;
	for (const line of titleLines.slice(0, 2)) {
		doc.text(line, textX, y);
		y += 22;
	}

	doc.setFont(FONT, "normal");
	doc.setFontSize(11);
	doc.setTextColor(...MUTED);
	const explanationLines = wrapText(doc, slide.explanation, textWidth, 11);
	for (const line of explanationLines.slice(0, 4)) {
		y += 16;
		if (y > contentBottom - 40) break;
		doc.text(line, textX, y);
	}

	if (slide.bullets.length > 0 && y < contentBottom - 20) {
		y += 10;
		drawBullets(doc, slide.bullets, textX, y, textWidth, contentBottom);
	}
}

export function presentationPdfFilename(title: string): string {
	return `${researchPaperFilename(title, "course-presentation")}.pdf`;
}

export async function renderPresentationPdf(
	presentation: CoursePresentation,
): Promise<import("jspdf").jsPDF | null> {
	if (!presentation.slides.length) return null;

	const { jsPDF } = await import("jspdf");
	const doc = new jsPDF({ unit: "pt", format: [SLIDE_W, SLIDE_H], orientation: "landscape" });

	for (let index = 0; index < presentation.slides.length; index++) {
		await drawSlidePage(doc, presentation, presentation.slides[index], index);
	}

	return doc;
}

export async function downloadPresentationPdf(presentation: CoursePresentation): Promise<void> {
	const doc = await renderPresentationPdf(presentation);
	if (!doc) return;
	doc.save(presentationPdfFilename(presentation.title));
}
