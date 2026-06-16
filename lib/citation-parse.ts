import {
	formatCitation,
	type CitationStyle,
	type ReferenceInput,
	type SourceType,
} from "@/lib/citation-format";

export type ParseConfidence = "high" | "medium" | "low";

export type ParsedReference = {
	reference: ReferenceInput;
	confidence: ParseConfidence;
	warnings: string[];
	original: string;
};

function trim(s: string | undefined): string {
	return (s ?? "").trim();
}

/** Split pasted text into individual reference strings */
export function splitPastedReferences(text: string): string[] {
	const normalized = text.replace(/\r\n/g, "\n").trim();
	if (!normalized) return [];

	const numbered = normalized
		.split(/\n(?=\s*\d+[\.)]\s+)/)
		.map((block) => block.replace(/^\s*\d+[\.)]\s*/, "").trim())
		.filter(Boolean);

	if (numbered.length > 1) return numbered;

	const paragraphs = normalized.split(/\n\s*\n+/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
	if (paragraphs.length > 1) return paragraphs;

	return [normalized.replace(/\n/g, " ").trim()];
}

function extractDoi(text: string): { doi?: string; rest: string } {
	const doiUrl = text.match(/https?:\/\/(?:dx\.)?doi\.org\/(10\.\S+?)(?=[\s.,;)\]]|$)/i);
	if (doiUrl) {
		return {
			doi: doiUrl[1]!.replace(/[.,;]+$/, ""),
			rest: text.replace(doiUrl[0], " ").replace(/\s+/g, " ").trim(),
		};
	}
	const doiLabel = text.match(/\bdoi:\s*(10\.\S+?)(?=[\s.,;)\]]|$)/i);
	if (doiLabel) {
		return {
			doi: doiLabel[1]!.replace(/[.,;]+$/, ""),
			rest: text.replace(doiLabel[0], " ").replace(/\s+/g, " ").trim(),
		};
	}
	return { rest: text };
}

function extractUrl(text: string): { url?: string; rest: string } {
	const match = text.match(/https?:\/\/[^\s)\]]+/i);
	if (!match) return { rest: text };
	const url = match[0]!.replace(/[.,;]+$/, "");
	return { rest: text.replace(match[0]!, " ").replace(/\s+/g, " ").trim(), url };
}

function extractYear(text: string): { year?: string; rest: string } {
	const paren = text.match(/\((\d{4})(?:[^)]*)?\)/);
	if (paren) {
		return {
			year: paren[1],
			rest: (text.slice(0, paren.index) + text.slice(paren.index! + paren[0].length)).replace(/\s+/g, " ").trim(),
		};
	}
	const trailing = text.match(/,\s*(\d{4})\.?\s*$/);
	if (trailing) {
		return {
			year: trailing[1],
			rest: text.slice(0, trailing.index).trim(),
		};
	}
	const harvard = text.match(/\((\d{4})\)/);
	if (harvard) {
		return { year: harvard[1], rest: text };
	}
	return { rest: text };
}

function extractAuthorsAndBody(text: string, year?: string): { authors: string; body: string } {
	if (year) {
		const apaSplit = text.match(/^(.+?)\s*\(\d{4}[^)]*\)\.?\s*(.+)$/s);
		if (apaSplit) {
			return { authors: apaSplit[1]!.replace(/,?\s*&\s*$/, "").trim(), body: apaSplit[2]!.trim() };
		}
		const harvardSplit = text.match(/^(.+?)\s*\(\d{4}\)\s+(.+)$/s);
		if (harvardSplit) {
			return { authors: harvardSplit[1]!.trim(), body: harvardSplit[2]!.trim() };
		}
	}

	const mlaSplit = text.match(/^(.+?)\.\s+["'](.+)$/s);
	if (mlaSplit && /[A-Z]\./.test(mlaSplit[1]!)) {
		return { authors: mlaSplit[1]!.trim(), body: mlaSplit[2]!.trim() };
	}

	const firstPeriod = text.search(/\.\s+[A-Z"']/);
	if (firstPeriod > 10) {
		return {
			authors: text.slice(0, firstPeriod + 1).trim(),
			body: text.slice(firstPeriod + 2).trim(),
		};
	}

	return { authors: "", body: text };
}

function normalizeAuthors(raw: string): string {
	return raw
		.replace(/\s+&\s+/g, "; ")
		.replace(/\s+and\s+/gi, "; ")
		.replace(/\bet\s+al\.?/gi, "et al.")
		.replace(/\.+$/, "")
		.trim();
}

function extractVolumeIssuePages(body: string): {
	volume?: string;
	issue?: string;
	pages?: string;
	rest: string;
} {
	let rest = body;

	const apaVol = rest.match(/,?\s*(\d+)\((\d+)\)\s*,?\s*([\d–—-]+)?/);
	if (apaVol) {
		const result = {
			volume: apaVol[1],
			issue: apaVol[2],
			pages: apaVol[3]?.replace(/[.,]+$/, ""),
			rest: rest.replace(apaVol[0], " ").replace(/\s+/g, " ").trim(),
		};
		return result;
	}

	const mlaVol = rest.match(/,?\s*vol\.\s*(\d+)\s*,?\s*no\.\s*(\d+)\s*,?\s*(?:pp\.\s*)?([\d–—-]+)?/i);
	if (mlaVol) {
		return {
			volume: mlaVol[1],
			issue: mlaVol[2],
			pages: mlaVol[3]?.replace(/[.,]+$/, ""),
			rest: rest.replace(mlaVol[0], " ").replace(/\s+/g, " ").trim(),
		};
	}

	const pagesOnly = rest.match(/,?\s*pp?\.\s*([\d–—-]+)/i);
	if (pagesOnly) {
		return {
			pages: pagesOnly[1]!.replace(/[.,]+$/, ""),
			rest: rest.replace(pagesOnly[0], " ").replace(/\s+/g, " ").trim(),
		};
	}

	return { rest };
}

function extractTitleAndJournal(body: string, sourceType: SourceType): {
	title: string;
	subtitle?: string;
	journal?: string;
	bookTitle?: string;
	publisher?: string;
	conference?: string;
	siteName?: string;
} {
	let work = body;

	if (sourceType === "website") {
		const titleMatch = work.match(/^["']?(.+?)["']?\.?\s*(.+)?$/);
		if (titleMatch) {
			return {
				title: titleMatch[1]!.replace(/^["']|["']$/g, "").trim(),
				siteName: titleMatch[2]?.replace(/[.,]+$/, "").trim(),
			};
		}
	}

	if (sourceType === "chapter") {
		const inBook = work.match(/^["']?(.+?)["']?\.\s*In\s+(.+)$/i);
		if (inBook) {
			const bookPart = inBook[2]!;
			const edited = bookPart.match(/^(.+?),\s*edited by\s+(.+)$/i);
			if (edited) {
				return {
					title: inBook[1]!.replace(/^["']|["']$/g, "").trim(),
					bookTitle: edited[1]!.trim(),
					publisher: edited[2]?.split(",")[0]?.trim(),
				};
			}
			return {
				title: inBook[1]!.replace(/^["']|["']$/g, "").trim(),
				bookTitle: bookPart.replace(/[.,]+$/, "").trim(),
			};
		}
	}

	if (sourceType === "conference") {
		const conf = work.match(/^["']?(.+?)["']?\.\s*(?:Paper presented at|Presented at)\s+(.+)$/i);
		if (conf) {
			return {
				title: conf[1]!.replace(/^["']|["']$/g, "").trim(),
				conference: conf[2]!.replace(/[.,]+$/, "").trim(),
			};
		}
	}

	// Journal / book: title often ends at first period before journal name (italic section)
	const quoted = work.match(/^["'](.+?)["']\.\s*(.+)$/);
	if (quoted) {
		const journalPart = quoted[2]!.replace(/,?\s*\d{4}.*$/, "").replace(/[.,]+$/, "").trim();
		return {
			title: quoted[1]!.trim(),
			journal: sourceType === "journal" ? journalPart.split(",")[0]?.trim() : undefined,
			publisher: sourceType === "book" ? journalPart : undefined,
		};
	}

	// APA: Title. Subtitle. Journal, ...
	const apaParts = work.match(/^(.+?)\.\s+([A-Z][^,]+(?:,\s*\d+.*)?)$/);
	if (apaParts && sourceType === "journal") {
		const titleBlock = apaParts[1]!;
		const colon = titleBlock.match(/^(.+?):\s+(.+)$/);
		if (colon) {
			return {
				title: colon[1]!.trim(),
				subtitle: colon[2]!.trim(),
				journal: apaParts[2]!.split(",")[0]?.replace(/\s*\d+.*$/, "").trim(),
			};
		}
		return {
			title: titleBlock.trim(),
			journal: apaParts[2]!.split(",")[0]?.replace(/\s*\d+.*$/, "").trim(),
		};
	}

	// Fallback: first sentence = title, remainder = journal/publisher
	const dotIdx = work.indexOf(". ");
	if (dotIdx > 0) {
		const title = work.slice(0, dotIdx).replace(/^["']|["']$/g, "").trim();
		const remainder = work.slice(dotIdx + 2).replace(/,?\s*\d{4}.*$/, "").trim();
		const colon = title.match(/^(.+?):\s+(.+)$/);
		return {
			title: colon ? colon[1]!.trim() : title,
			subtitle: colon?.[2]?.trim(),
			journal: sourceType === "journal" ? remainder.split(",")[0]?.trim() : undefined,
			publisher: sourceType === "book" ? remainder.split(",")[0]?.trim() : undefined,
		};
	}

	return { title: work.replace(/^["']|["']$/g, "").replace(/[.,]+$/, "").trim() };
}

function detectSourceType(text: string, url?: string, doi?: string): SourceType {
	const lower = text.toLowerCase();
	if (url && !doi) return "website";
	if (/\b(paper presented at|presented at|proceedings of)\b/i.test(text)) return "conference";
	if (/\bIn\s+.+,?\s*edited by\b/i.test(text) || /\bIn\s+[A-Z]/i.test(text)) return "chapter";
	if (doi || /\bvol\.\s*\d+/i.test(text) || /\(\d+\)\s*,\s*\d+/.test(text) || /,\s*\d+\(\d+\)/.test(text)) {
		return "journal";
	}
	if (/\b(Press|Publishers?|Books?)\b/i.test(text) && !url) return "book";
	return "journal";
}

function scoreConfidence(ref: ReferenceInput, warnings: string[]): ParseConfidence {
	if (!trim(ref.title) || !trim(ref.year)) return "low";
	if (warnings.length > 2) return "low";
	if (!trim(ref.authors)) return "medium";
	if (ref.sourceType === "journal" && !trim(ref.journal)) return "medium";
	return warnings.length ? "medium" : "high";
}

/** Parse a single pasted reference string into structured fields */
export function parsePastedReference(raw: string): ParsedReference {
	const original = raw.trim();
	const warnings: string[] = [];

	if (!original) {
		return {
			reference: { ...EMPTY, authors: "", title: "", year: "" },
			confidence: "low",
			warnings: ["Empty reference"],
			original,
		};
	}

	let text = original.replace(/\s+/g, " ").trim();

	const { doi, rest: afterDoi } = extractDoi(text);
	text = afterDoi;

	const { url, rest: afterUrl } = extractUrl(text);
	text = afterUrl;

	const { year, rest: afterYear } = extractYear(text);
	text = afterYear;

	const { authors: rawAuthors, body } = extractAuthorsAndBody(original.replace(/\s+/g, " "), year);
	const authors = normalizeAuthors(rawAuthors);

	const sourceType = detectSourceType(original, url, doi);

	const { volume, issue, pages, rest: afterVol } = extractVolumeIssuePages(body);
	const meta = extractTitleAndJournal(afterVol || body, sourceType);

	const reference: ReferenceInput = {
		sourceType,
		authors,
		title: meta.title,
		subtitle: meta.subtitle,
		year: year ?? "",
		journal: meta.journal,
		volume,
		issue,
		pages,
		doi,
		url,
		publisher: meta.publisher,
		bookTitle: meta.bookTitle,
		conference: meta.conference,
		siteName: meta.siteName,
	};

	if (!authors) warnings.push("Could not detect authors — please verify");
	if (!meta.title) warnings.push("Could not detect title — please verify");
	if (!year) warnings.push("Could not detect publication year");
	if (sourceType === "journal" && !meta.journal) warnings.push("Journal name may be incomplete");

	const confidence = scoreConfidence(reference, warnings);

	return { reference, confidence, warnings, original };
}

const EMPTY: ReferenceInput = {
	sourceType: "journal",
	authors: "",
	title: "",
	year: "",
};

export function parsePastedReferences(text: string): ParsedReference[] {
	return splitPastedReferences(text).map(parsePastedReference);
}

export type ReformattedPaste = {
	original: string;
	formatted: string;
	parsed: ParsedReference;
};

/** Parse pasted text and reformat into the target citation style */
export function reformatPastedReferences(
	text: string,
	targetStyle: CitationStyle,
): ReformattedPaste[] {
	return parsePastedReferences(text).map((parsed) => ({
		original: parsed.original,
		formatted: formatCitation(targetStyle, parsed.reference) || parsed.original,
		parsed,
	}));
}
