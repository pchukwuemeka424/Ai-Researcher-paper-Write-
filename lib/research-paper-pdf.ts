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

/** Nigerian states — strip geographic "X State" from PDF (keep "X State University"). */
const NIGERIA_STATE_NAMES = [
	"Abia",
	"Adamawa",
	"Akwa Ibom",
	"Anambra",
	"Bauchi",
	"Bayelsa",
	"Benue",
	"Borno",
	"Cross River",
	"Delta",
	"Ebonyi",
	"Edo",
	"Ekiti",
	"Enugu",
	"Gombe",
	"Imo",
	"Jigawa",
	"Kaduna",
	"Kano",
	"Katsina",
	"Kebbi",
	"Kogi",
	"Kwara",
	"Lagos",
	"Nasarawa",
	"Niger",
	"Ogun",
	"Ondo",
	"Osun",
	"Oyo",
	"Plateau",
	"Rivers",
	"Sokoto",
	"Taraba",
	"Yobe",
	"Zamfara",
] as const;

const NIGERIA_STATE_PATTERN = new RegExp(
	`\\b(?:${NIGERIA_STATE_NAMES.map((name) => name.replace(/\s+/g, "\\s+")).join("|")})\\s+State\\b(?!\\s+University)`,
	"gi",
);

type PdfChartSpec = {
	type: "bar" | "line" | "area" | "pie" | "scatter";
	title: string;
	caption?: string;
	xKey: string;
	yKeys: string[];
	data: Array<Record<string, string | number>>;
};

type PdfBlock =
	| {
			kind: "title" | "section" | "body" | "byline" | "affiliation";
			text: string;
	  }
	| { kind: "rule" | "gap" }
	| { kind: "table"; headers: string[]; rows: string[][] }
	| { kind: "chart"; chart: PdfChartSpec }
	| { kind: "image"; title: string; caption: string; nodes: string[]; edges: string[] }
	| { kind: "figure"; title: string; caption: string; mime: string; dataUrl: string };

type FontFace = "normal" | "bold" | "italic" | "bolditalic";

type JsPdfDoc = {
	setFont: (face: string, style: FontFace) => void;
	setFontSize: (size: number) => void;
	getTextWidth: (text: string) => number;
	text: (
		text: string,
		x: number,
		y: number,
		options?: { maxWidth?: number; align?: "left" | "center" | "right" | "justify" },
	) => void;
	setTextColor: (r: number, g: number, b: number) => void;
	setDrawColor: (r: number, g: number, b: number) => void;
	setFillColor: (r: number, g: number, b: number) => void;
	setLineWidth: (width: number) => void;
	line: (x1: number, y1: number, x2: number, y2: number) => void;
	rect: (x: number, y: number, width: number, height: number, style?: "S" | "F" | "FD") => void;
	roundedRect: (
		x: number,
		y: number,
		width: number,
		height: number,
		rx: number,
		ry: number,
		style?: "S" | "F" | "FD",
	) => void;
	circle: (x: number, y: number, radius: number, style?: "S" | "F" | "FD") => void;
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

/** Remove geographic "Abia State"-style phrases from PDF output. */
export function stripGeographicStateNames(text: string): string {
	let out = text
		.replace(NIGERIA_STATE_PATTERN, "")
		.replace(/\(\s*[,;]?\s*\)/g, "")
		.replace(/\s*,\s*,+/g, ",")
		.replace(/\s+([,;:.])/g, "$1")
		.replace(/([,;])\s*(?=[,;])/g, "")
		.replace(/\b(in|at|of|from|within)\s*,\s*/gi, "$1 ")
		.replace(/\b(in|at|of|from|within)\s*\.(?=\s|$)/gi, ".")
		.replace(/^[,\s;]+|[,\s;]+$/g, "")
		.replace(/\s{2,}/g, " ")
		.trim();

	// Drop labels left empty after stripping a location (e.g. "Study area: Abia State").
	out = out.replace(/^study\s*area\s*:?\s*$/i, "").trim();
	return out;
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
	text = stripGeographicStateNames(text);
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
			const looseTableLines = p.raw
				.split(/\n/)
				.map((line) => line.trim())
				.filter((line) => line.split("|").length >= 3);
			if (looseTableLines.length >= 2) {
				const cells = (line: string) =>
					line
						.replace(/^\||\|$/g, "")
						.split("|")
						.map((cell) => normalizePdfText(cell));
				const headers = cells(looseTableLines[0]!);
				const rows = looseTableLines
					.slice(1)
					.map(cells)
					.filter((row) => row.length === headers.length);
				if (headers.length >= 2 && rows.length) {
					blocks.push({ kind: "table", headers, rows });
					continue;
				}
			}
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

		if (token.type === "table") {
			const table = token as Tokens.Table;
			const rowValues = (cells: Tokens.TableCell[]) =>
				cells.map((cell) => flattenTokens(cell.tokens));
			blocks.push({
				kind: "table",
				headers: rowValues(table.header),
				rows: table.rows.map(rowValues),
			});
			continue;
		}

		if (token.type === "code" && (token as Tokens.Code).lang?.toLowerCase() === "research-chart") {
			try {
				const chart = JSON.parse((token as Tokens.Code).text) as {
					type?: PdfChartSpec["type"];
					title?: string;
					caption?: string;
					xKey?: string;
					yKeys?: string[];
					data?: Array<Record<string, string | number>>;
				};
				const validTypes = new Set<PdfChartSpec["type"]>(["bar", "line", "area", "pie", "scatter"]);
				if (
					chart.type &&
					validTypes.has(chart.type) &&
					chart.xKey &&
					chart.yKeys?.length &&
					chart.data?.length
				) {
					blocks.push({
						kind: "chart",
						chart: {
							type: chart.type,
							title: chart.title?.trim() || "Research data visualization",
							caption: chart.caption?.trim(),
							xKey: chart.xKey,
							yKeys: chart.yKeys.slice(0, 5),
							data: chart.data.slice(0, 30),
						},
					});
				}
			} catch {
				/* Ignore an incomplete chart block while streaming. */
			}
			continue;
		}

		if (token.type === "code" && (token as Tokens.Code).lang?.toLowerCase() === "research-image") {
			try {
				const image = JSON.parse((token as Tokens.Code).text) as {
					title?: string;
					caption?: string;
					nodes?: Array<{ id?: string; label?: string }>;
					edges?: Array<{ from?: string; to?: string; label?: string }>;
				};
				blocks.push({
					kind: "image",
					title: image.title?.trim() || "Conceptual illustration",
					caption: image.caption?.trim() || "AI-generated conceptual illustration.",
					nodes: (image.nodes ?? [])
						.map((node) => node.label?.trim() ?? "")
						.filter(Boolean)
						.slice(0, 9),
					edges: (image.edges ?? [])
						.filter((edge) => edge.from && edge.to)
						.map((edge) => `${edge.from} → ${edge.to}${edge.label ? `: ${edge.label}` : ""}`)
						.slice(0, 12),
				});
			} catch {
				/* Ignore an incomplete image block while streaming. */
			}
			continue;
		}

		if (token.type === "code" && (token as Tokens.Code).lang?.toLowerCase() === "research-figure") {
			try {
				const figure = JSON.parse((token as Tokens.Code).text) as {
					title?: string;
					caption?: string;
					mime?: string;
					dataUrl?: string;
				};
				const dataUrl = figure.dataUrl?.trim() ?? "";
				if (dataUrl.startsWith("data:image/")) {
					blocks.push({
						kind: "figure",
						title: figure.title?.trim() || "Research figure",
						caption: figure.caption?.trim() || "From research note Figures.",
						mime: figure.mime?.trim() || "image/png",
						dataUrl,
					});
				}
			} catch {
				/* Ignore an incomplete figure block while streaming. */
			}
			continue;
		}

		if (token.type === "space") {
			blocks.push({ kind: "gap" });
		}
	}

	return pruneEmptyStudyAreaSections(blocks);
}

/** Drop a Study area heading when its body was only a geographic state name. */
function pruneEmptyStudyAreaSections(blocks: PdfBlock[]): PdfBlock[] {
	const out: PdfBlock[] = [];
	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i]!;
		if (block.kind === "section" && /^study\s*area$/i.test(block.text.trim())) {
			const next = blocks[i + 1];
			const hasBody =
				next &&
				((next.kind === "body" && normalizePdfText(next.text).length > 0) ||
					next.kind === "table" ||
					next.kind === "chart" ||
					next.kind === "image" ||
					next.kind === "figure");
			if (!hasBody) continue;
		}
		out.push(block);
	}
	return out;
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

	const width = Math.max(24, maxWidth);
	doc.setFont(fontName, fontStyle);
	doc.setFontSize(fontSize);

	const split = (doc as unknown as { splitTextToSize: (t: string, w: number) => string[] }).splitTextToSize;
	if (typeof split === "function") {
		const lines = split.call(doc, clean, width).map((line) => normalizePdfText(String(line)));
		const safe: string[] = [];
		for (const line of lines) {
			if (!line) continue;
			doc.setFont(fontName, fontStyle);
			doc.setFontSize(fontSize);
			// Guard against rare metric misses that leave a line wider than the page.
			if (doc.getTextWidth(line) <= width + 0.5) {
				safe.push(line);
				continue;
			}
			const words = line.split(/\s+/).filter(Boolean);
			let current = "";
			for (const word of words) {
				const trial = current ? `${current} ${word}` : word;
				doc.setFont(fontName, fontStyle);
				doc.setFontSize(fontSize);
				if (!current || doc.getTextWidth(trial) <= width) {
					current = trial;
				} else {
					safe.push(current);
					current = word;
				}
			}
			if (current) safe.push(current);
		}
		return safe.length ? safe : [clean];
	}

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
		_align: "left" | "justify" = "left",
		lineMaxWidth = maxWidth,
	) => {
		doc.setFont(FONT, face);
		doc.setFontSize(size);
		doc.setTextColor(...color);
		const lh = lineHeight(size, factor);
		for (const rawLine of lines) {
			const line = normalizePdfText(rawLine);
			if (!line) {
				y += lh * 0.35;
				continue;
			}
			doc.setFont(FONT, face);
			doc.setFontSize(size);
			// Re-wrap any line that still exceeds the printable width.
			const parts =
				doc.getTextWidth(line) > lineMaxWidth + 0.5
					? wrapLines(doc, line, lineMaxWidth, FONT, face, size)
					: [line];
			for (const part of parts) {
				ensure(lh);
				doc.setFont(FONT, face);
				doc.setFontSize(size);
				doc.setTextColor(...color);
				doc.text(part, x, y);
				y += lh;
			}
		}
	};

	const drawLeft = (
		text: string,
		size: number,
		face: FontFace,
		factor: number,
		indent = 0,
		align: "left" | "justify" = "left",
	) => {
		const width = maxWidth - indent;
		const lines = wrapLines(doc, text, width, FONT, face, size);
		drawLines(lines, size, face, factor, PAGE.left + indent, COLOR.text, align, width);
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

	const drawTable = (headers: string[], rows: string[][]) => {
		if (!headers.length) return;
		const columnCount = Math.min(headers.length, 12);
		const columnWidth = maxWidth / columnCount;
		const fontSize = columnCount > 8 ? 6.5 : columnCount > 5 ? 7.5 : 8.5;
		const padding = 3;
		const cellLines = (value: string) =>
			wrapLines(doc, normalizePdfText(value), columnWidth - padding * 2, FONT, "normal", fontSize);
		const rowHeight = (values: string[]) =>
			Math.max(
				fontSize * 1.35 + padding * 2,
				...values.slice(0, columnCount).map((value) => cellLines(value).length * fontSize * 1.25 + padding * 2),
			);
		const drawRow = (values: string[], header = false) => {
			const height = rowHeight(values);
			doc.setFont(FONT, header ? "bold" : "normal");
			doc.setFontSize(fontSize);
			for (let column = 0; column < columnCount; column++) {
				const x = PAGE.left + column * columnWidth;
				if (header) {
					doc.setFillColor(235, 238, 245);
					doc.rect(x, y, columnWidth, height, "F");
				}
				doc.setDrawColor(175, 180, 190);
				doc.rect(x, y, columnWidth, height, "S");
				doc.setTextColor(...COLOR.text);
				const lines = cellLines(values[column] ?? "");
				lines.forEach((line, lineIndex) => {
					doc.text(line, x + padding, y + padding + fontSize + lineIndex * fontSize * 1.25);
				});
			}
			y += height;
		};
		const addTablePage = () => {
			doc.addPage();
			y = PAGE.top;
			drawRow(headers, true);
		};

		const headerHeight = rowHeight(headers);
		if (y + headerHeight > pageH - PAGE.bottom) {
			doc.addPage();
			y = PAGE.top;
		}
		drawRow(headers, true);
		for (const row of rows.slice(0, 40)) {
			const height = rowHeight(row);
			if (y + height > pageH - PAGE.bottom) addTablePage();
			drawRow(row);
		}
		y += 10;
	};

	const drawChart = (chart: PdfChartSpec) => {
		const yKey = chart.yKeys[0];
		if (!yKey) return;
		const values = chart.data
			.map((row) => ({
				label: String(row[chart.xKey] ?? ""),
				value: Number(row[yKey]),
			}))
			.filter((item) => Number.isFinite(item.value))
			.slice(0, 16);
		if (!values.length) return;

		const chartHeight = 220;
		ensure(chartHeight + 55);
		drawCenter(`Figure: ${chart.title}`, 10, "bold", 1.25);
		y += 6;
		const plotX = PAGE.left + 42;
		const plotY = y;
		const plotWidth = maxWidth - 54;
		const plotHeight = 150;
		const minValue = Math.min(0, ...values.map((item) => item.value));
		const maxValue = Math.max(0, ...values.map((item) => item.value));
		const range = maxValue - minValue || 1;
		const valueY = (value: number) => plotY + plotHeight - ((value - minValue) / range) * plotHeight;
		const zeroY = valueY(0);

		doc.setDrawColor(90, 100, 115);
		doc.setLineWidth(0.8);
		doc.line(plotX, plotY, plotX, plotY + plotHeight);
		doc.line(plotX, zeroY, plotX + plotWidth, zeroY);
		doc.setFont(FONT, "normal");
		doc.setFontSize(6.5);
		doc.setTextColor(...COLOR.muted);
		doc.text(normalizePdfText(String(maxValue)), PAGE.left, plotY + 5);
		doc.text(normalizePdfText(String(minValue)), PAGE.left, plotY + plotHeight);

		const colors: Array<[number, number, number]> = [
			[79, 70, 229],
			[8, 145, 178],
			[5, 150, 105],
			[217, 119, 6],
			[220, 38, 38],
		];
		const step = plotWidth / Math.max(values.length, 1);
		const points = values.map((item, index) => ({
			x: plotX + step * index + step / 2,
			y: valueY(item.value),
			...item,
		}));

		if (chart.type === "line" || chart.type === "area" || chart.type === "scatter") {
			points.forEach((point, index) => {
				const color = colors[index % colors.length]!;
				doc.setFillColor(...color);
				doc.circle(point.x, point.y, 2.5, "F");
				if (chart.type !== "scatter" && index > 0) {
					const previous = points[index - 1]!;
					doc.setDrawColor(79, 70, 229);
					doc.setLineWidth(1.5);
					doc.line(previous.x, previous.y, point.x, point.y);
				}
			});
		} else {
			const barWidth = Math.max(5, step * 0.62);
			points.forEach((point, index) => {
				const color = colors[index % colors.length]!;
				doc.setFillColor(...color);
				const top = Math.min(point.y, zeroY);
				doc.rect(point.x - barWidth / 2, top, barWidth, Math.max(1, Math.abs(zeroY - point.y)), "F");
			});
		}

		doc.setFontSize(6);
		points.forEach((point) => {
			const label = normalizePdfText(point.label).slice(0, 12);
			const width = doc.getTextWidth(label);
			doc.text(label, point.x - width / 2, plotY + plotHeight + 10);
		});
		y = plotY + plotHeight + 22;
		if (chart.caption) {
			drawCenter(chart.caption, 8, "italic", 1.25, COLOR.muted);
		}
		y += 12;
	};

	const drawConceptImage = (block: Extract<PdfBlock, { kind: "image" }>) => {
		if (!block.nodes.length) return;
		const rows = Math.ceil(block.nodes.length / 3);
		const figureHeight = 55 + rows * 78;
		ensure(figureHeight + 40);
		drawCenter(`Figure: ${block.title}`, 10, "bold", 1.25);
		y += 8;
		const top = y;
		const boxWidth = (maxWidth - 24) / 3;
		const boxHeight = 48;
		block.nodes.forEach((node, index) => {
			const column = index % 3;
			const row = Math.floor(index / 3);
			const x = PAGE.left + column * (boxWidth + 12);
			const boxY = top + row * 78;
			doc.setFillColor(239, 242, 255);
			doc.setDrawColor(79, 70, 229);
			doc.roundedRect(x, boxY, boxWidth, boxHeight, 6, 6, "FD");
			const lines = wrapLines(doc, node, boxWidth - 12, FONT, "bold", 8);
			doc.setFont(FONT, "bold");
			doc.setFontSize(8);
			lines.slice(0, 3).forEach((line, lineIndex) => {
				const lineWidth = doc.getTextWidth(line);
				doc.text(line, x + (boxWidth - lineWidth) / 2, boxY + 18 + lineIndex * 10);
			});
			if (index < block.nodes.length - 1) {
				const nextColumn = (index + 1) % 3;
				if (nextColumn !== 0) {
					doc.setDrawColor(100, 116, 139);
					doc.line(x + boxWidth, boxY + boxHeight / 2, x + boxWidth + 10, boxY + boxHeight / 2);
				}
			}
		});
		y = top + rows * 78;
		drawCenter(block.caption, 8, "italic", 1.25, COLOR.muted);
		y += 12;
	};

	const drawRasterFigure = (block: Extract<PdfBlock, { kind: "figure" }>) => {
		const match = /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/i.exec(block.dataUrl);
		if (!match) {
			drawCenter(`Figure: ${block.title}`, 10, "bold", 1.25);
			drawCenter(block.caption, 8, "italic", 1.25, COLOR.muted);
			y += 8;
			return;
		}
		const formatRaw = match[1]!.toLowerCase();
		const format =
			formatRaw.includes("jpeg") || formatRaw.includes("jpg")
				? "JPEG"
				: formatRaw.includes("webp")
					? "WEBP"
					: "PNG";
		const base64 = match[2]!;
		const maxH = 280;
		ensure(maxH + 50);
		drawCenter(`Figure: ${block.title}`, 10, "bold", 1.25);
		y += 6;
		try {
			const props = (
				doc as unknown as {
					getImageProperties: (data: string) => { width: number; height: number };
				}
			).getImageProperties(block.dataUrl);
			const ratio = props.width > 0 ? props.height / props.width : 0.75;
			let w = maxWidth;
			let h = w * ratio;
			if (h > maxH) {
				h = maxH;
				w = h / Math.max(ratio, 0.01);
			}
			const x = PAGE.left + (maxWidth - w) / 2;
			(
				doc as unknown as {
					addImage: (
						data: string,
						format: string,
						x: number,
						y: number,
						w: number,
						h: number,
					) => void;
				}
			).addImage(block.dataUrl, format, x, y, w, h);
			y += h + 8;
			void base64;
		} catch {
			drawCenter("[Figure image could not be embedded]", 9, "italic", 1.25, COLOR.muted);
			y += 8;
		}
		drawCenter(block.caption, 8, "italic", 1.25, COLOR.muted);
		y += 12;
	};

	const blocks = buildBlocks(markdown, meta);

	for (const block of blocks) {
		const text = "text" in block ? normalizePdfText(block.text) : "";
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
				drawLeft(text, SIZE.body, "normal", LEADING.body, 0, "left");
				y += 6;
				break;
			case "gap":
				y += 8;
				break;
			case "table":
				drawTable(block.headers, block.rows);
				break;
			case "chart":
				drawChart(block.chart);
				break;
			case "image":
				drawConceptImage(block);
				break;
			case "figure":
				drawRasterFigure(block);
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
