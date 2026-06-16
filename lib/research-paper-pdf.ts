"use client";

import { marked, type Token, type Tokens } from "marked";

import { extractPaperTitle } from "@/lib/research-paper-title";
import { canonicalizeSectionTitle } from "@/lib/research-paper-sections";

export type ResearchPaperMeta = {
	author?: string | null;
	department?: string | null;
	affiliation?: string | null;
	fallbackTopic?: string | null;
};

export function researchPaperFilename(title: string, fallback = "research-paper"): string {
	const slug = title
		.toLowerCase()
		.replace(/\*\*/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 60);
	return slug || fallback;
}

/** One PDF font family for the whole document (Times = standard academic serif). */
const FONT = "times";

const UNICODE_SPACES = /[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000\ufeff]/g;

const PAGE = {
	left: 72,
	right: 72,
	top: 72,
	bottom: 72,
};

const SIZE = {
	body: 11,
	title: 17,
	byline: 11,
	affiliation: 10,
	section: 12,
	footer: 9,
};

const LEADING = {
	body: 1.5,
	title: 1.25,
	section: 1.3,
};

const COLOR = {
	text: [15, 15, 15] as [number, number, number],
	muted: [80, 80, 80] as [number, number, number],
	rule: [180, 180, 180] as [number, number, number],
};

const GENERIC_TITLE_LABELS = new Set(["title", "paper title", "research paper", "research paper title"]);

const SECTION_HEADINGS = new Set([
	"abstract",
	"keywords",
	"study area",
	"introduction",
	"literature review",
	"methodology",
	"results / analysis",
	"results",
	"analysis",
	"discussion",
	"conclusion",
	"references",
]);

type PdfBlock = {
	kind: "title" | "section" | "body" | "byline" | "affiliation" | "rule" | "gap";
	text?: string;
};

type FontFace = "normal" | "bold" | "italic" | "bolditalic";

type JsPdfDoc = {
	setFont: (face: string, style: FontFace) => void;
	setFontSize: (size: number) => void;
	getTextWidth: (text: string) => number;
	text: (text: string, x: number, y: number) => void;
};

/** Normalize punctuation that breaks PDF metrics in built-in fonts. */
function normalizePdfPunctuation(text: string): string {
	return text
		.replace(UNICODE_SPACES, " ")
		.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
		.replace(/[\u2018\u2019\u201A\u2032\u2035]/g, "'")
		.replace(/[\u201C\u201D\u201E\u2033\u2036]/g, '"')
		.replace(/\u2026/g, "...")
		.replace(/\u00B7/g, "-");
}

/** Strip/replace any remaining non-ASCII so jsPDF built-in Times metrics stay stable. */
function toAsciiSafePdfText(text: string): string {
	return text.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, (ch) => {
		const mapped = normalizePdfPunctuation(ch);
		return mapped === ch ? "" : mapped;
	});
}

/**
 * Collapse LLM artifacts like "i n t e g r a t e d" → "integrated".
 * Merges runs of 4+ single-letter "words" regardless of unicode space type.
 */
export function collapseSpacedLetterRuns(text: string): string {
	const words = text.split(/\s+/).filter(Boolean);
	if (!words.length) return text;

	const out: string[] = [];
	let letterRun: string[] = [];

	const flushRun = () => {
		if (letterRun.length >= 4) out.push(letterRun.join(""));
		else out.push(...letterRun);
		letterRun = [];
	};

	for (const word of words) {
		if (word.length === 1 && /[A-Za-z]/.test(word)) {
			letterRun.push(word);
			continue;
		}
		flushRun();
		out.push(word);
	}
	flushRun();

	return out.join(" ");
}

export function normalizePdfText(raw: string): string {
	let text = raw
		.replace(UNICODE_SPACES, " ")
		.replace(/[\u200B-\u200D\uFEFF]/g, "")
		.replace(/\r\n/g, "\n")
		.replace(/\*\*/g, "")
		.replace(/__(.*?)__/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/[ \t]+/g, " ")
		.trim();

	text = normalizePdfPunctuation(text);
	text = collapseSpacedLetterRuns(text);
	text = toAsciiSafePdfText(text);

	// Break only extremely long unbroken tokens (URLs).
	text = text.replace(/\S{50,}/g, (w) => w.match(/.{1,24}/g)?.join(" ") ?? w);

	return text.replace(/\s+/g, " ").trim();
}

function normalizeMarkdownForPdf(markdown: string): string {
	let text = markdown
		.replace(/[\u200B-\u200D\uFEFF]/g, "")
		.replace(/\r\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n");

	text = normalizePdfPunctuation(text);
	text = toAsciiSafePdfText(text);

	return text
		.split("\n")
		.map((line) => collapseSpacedLetterRuns(line.trim()))
		.join("\n")
		.trim();
}

function stripLeadingTitleLabel(text: string): string {
	const cleaned = normalizePdfText(text);
	if (/^title\s+/i.test(cleaned) && cleaned.length > 20) {
		return cleaned.replace(/^title\s+/i, "");
	}
	return cleaned;
}

function isGenericTitle(text: string): boolean {
	return GENERIC_TITLE_LABELS.has(text.toLowerCase().replace(/:$/, "").trim());
}

function flattenTokens(tokens: Token[] | undefined): string {
	if (!tokens?.length) return "";
	const parts: string[] = [];
	const walk = (list: Token[]) => {
		for (const t of list as Tokens.Generic[]) {
			if (t.type === "strong" || t.type === "em" || t.type === "link" || t.type === "del") {
				walk(t.tokens ?? []);
			} else if (t.type === "text" || t.type === "escape" || t.type === "codespan") {
				if (t.tokens?.length) walk(t.tokens);
				else if (t.text) parts.push(String(t.text));
			} else if (typeof t.text === "string" && t.text) {
				parts.push(t.text);
			}
		}
	};
	walk(tokens);
	return normalizePdfText(parts.join(" "));
}

function isBoldOnlyParagraph(p: Tokens.Paragraph): boolean {
	const inline = p.tokens ?? [];
	return inline.length === 1 && inline[0]?.type === "strong";
}

function sectionHeadingLabel(text: string): string | null {
	const canonical = canonicalizeSectionTitle(text);
	if (canonical) return canonical;

	const key = text.toLowerCase().replace(/:$/, "").trim();
	if (SECTION_HEADINGS.has(key)) {
		return text.replace(/\*\*/g, "").trim();
	}
	return null;
}

function buildSkipKeys(meta: ResearchPaperMeta, extractedTitle: string): Set<string> {
	const skip = new Set<string>();
	const add = (value: string | null | undefined) => {
		const cleaned = normalizePdfText(value ?? "");
		if (cleaned) skip.add(cleaned.toLowerCase());
	};

	add(extractedTitle);
	add(meta.author);
	add(meta.department);
	add(meta.affiliation);
	for (const label of GENERIC_TITLE_LABELS) skip.add(label);

	return skip;
}

function shouldSkipMetadataLine(text: string, skipKeys: Set<string>, extractedTitle: string): boolean {
	const cleaned = stripLeadingTitleLabel(text);
	if (!cleaned) return true;

	const key = cleaned.toLowerCase();
	if (skipKeys.has(key)) return true;
	if (isGenericTitle(cleaned)) return true;

	const titleKey = normalizePdfText(extractedTitle).toLowerCase();
	if (titleKey && key === titleKey) return true;
	if (titleKey && key.startsWith("title ") && key.includes(titleKey)) return true;

	return false;
}

function buildBlocks(markdown: string, meta: ResearchPaperMeta): PdfBlock[] {
	const blocks: PdfBlock[] = [];
	const author = meta.author?.trim() ?? "";
	const department = meta.department?.trim() ?? "";
	const affiliation = meta.affiliation?.trim() ?? "";
	const extractedTitle = extractPaperTitle(markdown, meta.fallbackTopic?.trim() ?? "");
	const skipKeys = buildSkipKeys(meta, extractedTitle);

	if (extractedTitle && !isGenericTitle(extractedTitle)) {
		blocks.push({ kind: "title", text: extractedTitle });
	}
	if (author) blocks.push({ kind: "byline", text: author });
	if (department) blocks.push({ kind: "affiliation", text: department });
	if (affiliation && affiliation.toLowerCase() !== department.toLowerCase()) {
		blocks.push({ kind: "affiliation", text: affiliation });
	}
	if (blocks.length > 0) blocks.push({ kind: "rule" });

	const pushBody = (text: string) => {
		if (shouldSkipMetadataLine(text, skipKeys, extractedTitle)) return;
		const cleaned = stripLeadingTitleLabel(text);
		if (cleaned) blocks.push({ kind: "body", text: cleaned });
	};

	for (const token of marked.lexer(markdown.trim())) {
		if (token.type === "heading") {
			const text = flattenTokens((token as Tokens.Heading).tokens);
			if (!text || shouldSkipMetadataLine(text, skipKeys, extractedTitle)) continue;

			const section = sectionHeadingLabel(text);
			if (section) {
				blocks.push({ kind: "section", text: section });
			} else {
				pushBody(text);
			}
			continue;
		}

		if (token.type === "paragraph") {
			const p = token as Tokens.Paragraph;
			const text = flattenTokens(p.tokens);
			if (!text || shouldSkipMetadataLine(text, skipKeys, extractedTitle)) continue;

			if (isBoldOnlyParagraph(p)) {
				const section = sectionHeadingLabel(text);
				if (section) {
					blocks.push({ kind: "section", text: section });
					continue;
				}
				pushBody(text);
				continue;
			}

			pushBody(text);
			continue;
		}

		if (token.type === "list") {
			const list = token as Tokens.List;
			list.items.forEach((item, i) => {
				const marker = list.ordered ? `${(Number(list.start) || 1) + i}.` : "•";
				pushBody(`${marker} ${flattenTokens(inlineTokensOf(item.tokens))}`);
			});
			blocks.push({ kind: "gap" });
			continue;
		}

		if (token.type === "blockquote") {
			pushBody(flattenTokens(inlineTokensOf((token as Tokens.Blockquote).tokens)));
			continue;
		}

		if (token.type === "space") {
			blocks.push({ kind: "gap" });
		}
	}

	return blocks;
}

function inlineTokensOf(blockTokens: Token[] | undefined): Token[] {
	if (!blockTokens) return [];
	return blockTokens.flatMap((t) => (t as Tokens.Generic).tokens ?? [t]);
}

/** Wrap text using jsPDF metrics after full normalization. */
function wrapLines(
	doc: JsPdfDoc,
	text: string,
	maxWidth: number,
	fontName: string,
	fontStyle: FontFace,
	fontSize: number,
): string[] {
	const clean = normalizePdfText(text);
	if (!clean) return [];

	doc.setFont(fontName, fontStyle);
	doc.setFontSize(fontSize);

	const split = (doc as unknown as { splitTextToSize: (t: string, w: number) => string[] }).splitTextToSize;
	if (typeof split === "function") {
		return split.call(doc, clean, maxWidth);
	}

	// Fallback: one line if splitTextToSize unavailable.
	return [clean];
}

export async function renderResearchPaperPdf(
	content: string,
	meta: ResearchPaperMeta = {},
): Promise<import("jspdf").jsPDF | null> {
	const markdown = normalizeMarkdownForPdf(content);
	if (!markdown) return null;

	const { jsPDF } = await import("jspdf");
	const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });

	const pageW = doc.internal.pageSize.getWidth();
	const pageH = doc.internal.pageSize.getHeight();
	const maxWidth = pageW - PAGE.left - PAGE.right;
	let y = PAGE.top;

	doc.setFont(FONT, "normal");
	doc.setFontSize(SIZE.body);

	const lineHeight = (size: number, factor: number) => size * factor;

	const ensure = (need: number) => {
		if (y + need > pageH - PAGE.bottom) {
			doc.addPage();
			doc.setFont(FONT, "normal");
			y = PAGE.top;
		}
	};

	const drawLines = (
		lines: string[],
		size: number,
		face: FontFace,
		factor: number,
		x: number,
		color: [number, number, number] = COLOR.text,
	) => {
		doc.setFont(FONT, face);
		doc.setFontSize(size);
		doc.setTextColor(...color);
		const lh = lineHeight(size, factor);
		for (const line of lines) {
			ensure(lh);
			doc.text(line, x, y);
			y += lh;
		}
	};

	const drawLeft = (text: string, size: number, face: FontFace, factor: number, indent = 0) => {
		const lines = wrapLines(doc, text, maxWidth - indent, FONT, face, size);
		drawLines(lines, size, face, factor, PAGE.left + indent);
	};

	const drawCenter = (
		text: string,
		size: number,
		face: FontFace,
		factor: number,
		color: [number, number, number] = COLOR.text,
	) => {
		const lines = wrapLines(doc, text, maxWidth, FONT, face, size);
		doc.setFont(FONT, face);
		doc.setFontSize(size);
		doc.setTextColor(...color);
		const lh = lineHeight(size, factor);
		for (const line of lines) {
			ensure(lh);
			const w = doc.getTextWidth(line);
			doc.text(line, (pageW - w) / 2, y);
			y += lh;
		}
	};

	const blocks = buildBlocks(markdown, meta);

	for (const block of blocks) {
		const text = block.text ? normalizePdfText(block.text) : "";
		switch (block.kind) {
			case "title":
				drawCenter(text, SIZE.title, "bold", LEADING.title);
				y += 8;
				break;
			case "byline":
				drawCenter(text, SIZE.byline, "normal", LEADING.body);
				y += 4;
				break;
			case "affiliation":
				drawCenter(text, SIZE.affiliation, "italic", LEADING.body, COLOR.muted);
				y += 8;
				break;
			case "rule":
				ensure(16);
				doc.setDrawColor(...COLOR.rule);
				doc.setLineWidth(0.75);
				doc.line(PAGE.left, y, pageW - PAGE.right, y);
				y += 14;
				break;
			case "section":
				y += 10;
				drawLeft(text, SIZE.section, "bold", LEADING.section);
				y += 4;
				break;
			case "body":
				drawLeft(text, SIZE.body, "normal", LEADING.body);
				y += 6;
				break;
			case "gap":
				y += 8;
				break;
		}
	}

	const pages = doc.getNumberOfPages();
	for (let p = 1; p <= pages; p++) {
		doc.setPage(p);
		doc.setFont(FONT, "normal");
		doc.setFontSize(SIZE.footer);
		doc.setTextColor(120, 120, 120);
		const label = String(p);
		doc.text(label, (pageW - doc.getTextWidth(label)) / 2, pageH - PAGE.bottom / 2);
	}

	return doc;
}

export async function generateResearchPaperPdfBuffer(
	content: string,
	meta: ResearchPaperMeta = {},
): Promise<ArrayBuffer | null> {
	const doc = await renderResearchPaperPdf(content, meta);
	if (!doc) return null;
	return doc.output("arraybuffer") as ArrayBuffer;
}

export async function downloadMarkdownAsPdf(
	content: string,
	filename: string,
	meta: ResearchPaperMeta = {},
): Promise<void> {
	if (typeof window === "undefined") return;
	const doc = await renderResearchPaperPdf(content, meta);
	if (!doc) return;
	doc.save(`${researchPaperFilename(filename)}.pdf`);
}
