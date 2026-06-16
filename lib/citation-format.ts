import { formatByFamily } from "@/lib/citation-format-extended";
import { getStyleFamily, type CitationStyle } from "@/lib/citation-styles";
import { getSourceBucket, type SourceType } from "@/lib/source-types";

export type { CitationStyle } from "@/lib/citation-styles";
export type { SourceType } from "@/lib/source-types";
export {
	CITATION_STYLES,
	CITATION_STYLE_GROUPS,
	DEFAULT_CITATION_STYLE,
	getStyleLabel,
} from "@/lib/citation-styles";
export { SOURCE_TYPES, SOURCE_TYPE_GROUPS, getSourceTypeLabel } from "@/lib/source-types";

export type ReferenceInput = {
	sourceType: SourceType;
	authors: string;
	title: string;
	subtitle?: string;
	year: string;
	publisher?: string;
	journal?: string;
	volume?: string;
	issue?: string;
	pages?: string;
	doi?: string;
	url?: string;
	accessDate?: string;
	edition?: string;
	city?: string;
	bookTitle?: string;
	editors?: string;
	conference?: string;
	siteName?: string;
};

export type ParsedAuthor = {
	last: string;
	first: string;
	middle?: string;
};

function trim(s: string | undefined): string {
	return (s ?? "").trim();
}

function initials(first: string, middle?: string): string {
	const parts = [first, middle].filter(Boolean).join(" ");
	return parts
		.split(/[\s.-]+/)
		.filter(Boolean)
		.map((p) => p[0]?.toUpperCase() ?? "")
		.join("");
}

/** Parse "Smith, John A.; Doe, Jane" or "John Smith and Jane Doe" */
export function parseAuthors(raw: string): ParsedAuthor[] {
	const text = trim(raw);
	if (!text) return [];

	return text.split(/\s*;\s*|\s+and\s+/i).flatMap((segment) => {
		const part = segment.trim();
		if (!part) return [];

		if (part.includes(",")) {
			const [last, rest] = part.split(",").map((s) => s.trim());
			const names = (rest ?? "").split(/\s+/).filter(Boolean);
			return [{ last: last ?? part, first: names[0] ?? "", middle: names.slice(1).join(" ") || undefined }];
		}

		const names = part.split(/\s+/);
		if (names.length === 1) return [{ last: names[0]!, first: "" }];
		return [{ last: names[names.length - 1]!, first: names[0] ?? "", middle: names.slice(1, -1).join(" ") || undefined }];
	});
}

function authorListApa(authors: ParsedAuthor[], max = 20): string {
	if (!authors.length) return "";
	const fmt = (a: ParsedAuthor) => {
		const ini = initials(a.first, a.middle);
		return ini ? `${a.last}, ${ini}.` : a.last;
	};
	if (authors.length === 1) return fmt(authors[0]!);
	if (authors.length <= max) {
		const all = authors.slice(0, -1).map(fmt);
		return `${all.join(", ")}, & ${fmt(authors[authors.length - 1]!)}`;
	}
	return `${fmt(authors[0]!)}, et al.`;
}

function authorListMla(authors: ParsedAuthor[]): string {
	if (!authors.length) return "";
	const fmt = (a: ParsedAuthor, invert: boolean) => {
		const ini = initials(a.first, a.middle);
		if (invert) return ini ? `${a.last}, ${a.first}${a.middle ? ` ${a.middle}` : ""}` : a.last;
		return `${a.first}${a.middle ? ` ${a.middle}` : ""} ${a.last}`.trim();
	};
	if (authors.length === 1) return fmt(authors[0]!, true) + ".";
	if (authors.length === 2) return `${fmt(authors[0]!, true)}, and ${fmt(authors[1]!, false)}.`;
	return `${fmt(authors[0]!, true)}, et al.`;
}

function authorListChicago(authors: ParsedAuthor[]): string {
	if (!authors.length) return "";
	const fmt = (a: ParsedAuthor) => {
		const ini = initials(a.first, a.middle);
		return ini ? `${a.last}, ${ini}.` : a.last;
	};
	if (authors.length === 1) return fmt(authors[0]!);
	if (authors.length === 2) return `${fmt(authors[0]!)}, and ${fmt(authors[1]!)}`;
	if (authors.length === 3) return `${fmt(authors[0]!)}, ${fmt(authors[1]!)}, and ${fmt(authors[2]!)}`;
	return `${fmt(authors[0]!)}, ${fmt(authors[1]!)}, et al.`;
}

function authorListHarvard(authors: ParsedAuthor[]): string {
	if (!authors.length) return "";
	const fmt = (a: ParsedAuthor) => {
		const ini = initials(a.first, a.middle);
		return ini ? `${a.last}, ${ini}.` : a.last;
	};
	if (authors.length === 1) return fmt(authors[0]!);
	if (authors.length === 2) return `${fmt(authors[0]!)} and ${fmt(authors[1]!)}`;
	if (authors.length === 3) return `${fmt(authors[0]!)}, ${fmt(authors[1]!)}, and ${fmt(authors[2]!)}`;
	return `${fmt(authors[0]!)}, et al.`;
}

function fullTitle(title: string, subtitle?: string): string {
	const t = trim(title);
	const s = trim(subtitle);
	return s ? `${t}: ${s}` : t;
}

function italicMarkup(text: string): string {
	return `"${text}"`;
}

function titleCaseApa(text: string): string {
	return text;
}

function pages(p: string | undefined): string {
	const v = trim(p);
	if (!v) return "";
	return v.includes("-") ? v : v;
}

function formatApa(input: ReferenceInput, authors: ParsedAuthor[]): string {
	const year = trim(input.year);
	const title = fullTitle(input.title, input.subtitle);
	const author = authorListApa(authors);

	switch (input.sourceType) {
		case "book": {
			const pub = trim(input.publisher);
			const ed = trim(input.edition);
			const parts = [
				author && `${author}`,
				year && `(${year}).`,
				titleCaseApa(title) + ".",
				ed && `(${ed} ed.).`,
				pub && `${pub}.`,
			].filter(Boolean);
			return parts.join(" ").replace(/\s+/g, " ").trim();
		}
		case "journal": {
			const journal = trim(input.journal);
			const vol = trim(input.volume);
			const iss = trim(input.issue);
			const pg = pages(input.pages);
			const doi = trim(input.doi);
			let volIssue = "";
			if (vol) volIssue = iss ? `${vol}(${iss})` : vol;
			const tail = doi ? `https://doi.org/${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}` : trim(input.url);
			const parts = [
				author && `${author}`,
				year && `(${year}).`,
				`${titleCaseApa(title)}.`,
				journal && `${journal}`,
				volIssue && `, ${volIssue}`,
				pg && `, ${pg}`,
				".",
				tail && ` ${tail}`,
			].filter(Boolean);
			return parts.join("").replace(/\s+,/g, ",").replace(/\s+/g, " ").trim();
		}
		case "website": {
			const site = trim(input.siteName);
			const url = trim(input.url);
			const accessed = trim(input.accessDate);
			const parts = [
				author && `${author}`,
				year && `(${year}).`,
				`${titleCaseApa(title)}.`,
				site && `${site}.`,
				url,
				accessed && `(Retrieved ${accessed})`,
			].filter(Boolean);
			return parts.join(" ").replace(/\s+/g, " ").trim();
		}
		case "chapter": {
			const book = trim(input.bookTitle);
			const eds = trim(input.editors);
			const pub = trim(input.publisher);
			const pg = pages(input.pages);
			const parts = [
				author && `${author}`,
				year && `(${year}).`,
				`${titleCaseApa(title)}.`,
				book && `In ${eds ? `${eds} (Ed.), ` : ""}${bookCase(book)}.`,
				pg && `(pp. ${pg}).`,
				pub && `${pub}.`,
			].filter(Boolean);
			return parts.join(" ").replace(/\s+/g, " ").trim();
		}
		case "conference": {
			const conf = trim(input.conference);
			const pub = trim(input.publisher);
			const pg = pages(input.pages);
			const parts = [
				author && `${author}`,
				year && `(${year}).`,
				`${titleCaseApa(title)}.`,
				conf && `Paper presented at ${conf}`,
				pg && `, ${pg}`,
				pub && `. ${pub}.`,
			].filter(Boolean);
			return parts.join("").replace(/\s+/g, " ").trim();
		}
		default:
			return "";
	}
}

function bookCase(s: string): string {
	return s;
}

function formatMla(input: ReferenceInput, authors: ParsedAuthor[]): string {
	const author = authorListMla(authors);
	const title = fullTitle(input.title, input.subtitle);
	const year = trim(input.year);

	switch (input.sourceType) {
		case "book": {
			const pub = trim(input.publisher);
			const ed = trim(input.edition);
			return [author, `"${title}."`, ed && `${ed} ed.,`, pub && `${pub},`, year && `${year}.`].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
		}
		case "journal": {
			const journal = trim(input.journal);
			const vol = trim(input.volume);
			const iss = trim(input.issue);
			const pg = pages(input.pages);
			const doi = trim(input.doi);
			return [
				author,
				`"${title}."`,
				journal && `${italicMarkup(journal)},`,
				vol && `vol. ${vol},`,
				iss && `no. ${iss},`,
				year && `${year},`,
				pg && `pp. ${pg}.`,
				doi && `doi:${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}.`,
			]
				.filter(Boolean)
				.join(" ")
				.replace(/\s+/g, " ")
				.trim();
		}
		case "website": {
			const site = trim(input.siteName);
			const url = trim(input.url);
			const accessed = trim(input.accessDate);
			return [author, `"${title}."`, site && `${site},`, year && `${year},`, url && `${url}.`, accessed && `Accessed ${accessed}.`].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
		}
		case "chapter": {
			const book = trim(input.bookTitle);
			const eds = trim(input.editors);
			const pub = trim(input.publisher);
			const pg = pages(input.pages);
			return [
				author,
				`"${title}."`,
				book && `${book},`,
				eds && `edited by ${eds},`,
				pub && `${pub},`,
				year && `${year},`,
				pg && `pp. ${pg}.`,
			]
				.filter(Boolean)
				.join(" ")
				.replace(/\s+/g, " ")
				.trim();
		}
		case "conference": {
			const conf = trim(input.conference);
			const pg = pages(input.pages);
			return [author, `"${title}."`, conf && `${conf},`, year && `${year},`, pg && `pp. ${pg}.`].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
		}
		default:
			return "";
	}
}

function formatChicago(input: ReferenceInput, authors: ParsedAuthor[]): string {
	const author = authorListChicago(authors);
	const title = fullTitle(input.title, input.subtitle);
	const year = trim(input.year);

	switch (input.sourceType) {
		case "book": {
			const pub = trim(input.publisher);
			const city = trim(input.city);
			return [author, `${year}.`, `${title}.`, city && pub ? `${city}: ${pub}.` : pub && `${pub}.`].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
		}
		case "journal": {
			const journal = trim(input.journal);
			const vol = trim(input.volume);
			const iss = trim(input.issue);
			const pg = pages(input.pages);
			const doi = trim(input.doi);
			return [
				author,
				`${year}.`,
				`"${title}."`,
				journal && `${journal}`,
				vol && `${vol}`,
				iss && `, no. ${iss}`,
				pg && `: ${pg}`,
				".",
				doi && ` https://doi.org/${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}.`,
			]
				.filter(Boolean)
				.join("")
				.replace(/\s+/g, " ")
				.trim();
		}
		case "website": {
			const url = trim(input.url);
			const accessed = trim(input.accessDate);
			return [author, `${year}.`, `"${title}."`, url && `${url}.`, accessed && `(accessed ${accessed}).`].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
		}
		case "chapter": {
			const book = trim(input.bookTitle);
			const eds = trim(input.editors);
			const pub = trim(input.publisher);
			const pg = pages(input.pages);
			return [
				author,
				`${year}.`,
				`"${title}."`,
				book && `In ${book},`,
				eds && `edited by ${eds},`,
				pg && `${pg},`,
				pub && `${pub}.`,
			]
				.filter(Boolean)
				.join(" ")
				.replace(/\s+/g, " ")
				.trim();
		}
		case "conference": {
			const conf = trim(input.conference);
			return [author, `${year}.`, `"${title}."`, conf && `Presented at ${conf}.`].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
		}
		default:
			return "";
	}
}

function formatHarvard(input: ReferenceInput, authors: ParsedAuthor[]): string {
	const author = authorListHarvard(authors);
	const title = fullTitle(input.title, input.subtitle);
	const year = trim(input.year);

	switch (input.sourceType) {
		case "book": {
			const pub = trim(input.publisher);
			const ed = trim(input.edition);
			return [author, `(${year})`, `${title}.`, ed && `${ed} edn.`, pub && `${pub}.`].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
		}
		case "journal": {
			const journal = trim(input.journal);
			const vol = trim(input.volume);
			const iss = trim(input.issue);
			const pg = pages(input.pages);
			const doi = trim(input.doi);
			return [
				author,
				`(${year})`,
				`'${title}',`,
				journal && `${journal},`,
				vol && `${vol}`,
				iss && `(${iss})`,
				pg && `, pp. ${pg}.`,
				doi && ` doi: ${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}.`,
			]
				.filter(Boolean)
				.join(" ")
				.replace(/\s+/g, " ")
				.trim();
		}
		case "website": {
			const url = trim(input.url);
			const accessed = trim(input.accessDate);
			return [author, `(${year})`, `${title}.`, url && `Available at: ${url}`, accessed && `(Accessed: ${accessed}).`].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
		}
		case "chapter": {
			const book = trim(input.bookTitle);
			const eds = trim(input.editors);
			const pub = trim(input.publisher);
			const pg = pages(input.pages);
			return [
				author,
				`(${year})`,
				`'${title}', in`,
				eds && `${eds} (eds.)`,
				book && `${book},`,
				pub && `${pub},`,
				pg && `pp. ${pg}.`,
			]
				.filter(Boolean)
				.join(" ")
				.replace(/\s+/g, " ")
				.trim();
		}
		case "conference": {
			const conf = trim(input.conference);
			return [author, `(${year})`, `'${title}',`, conf && `${conf}.`].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
		}
		default:
			return "";
	}
}

function withSourceBucket(input: ReferenceInput): ReferenceInput {
	const bucket = getSourceBucket(input.sourceType);
	if (bucket === input.sourceType) return input;
	return { ...input, sourceType: bucket as SourceType };
}

export function formatCitation(style: CitationStyle, input: ReferenceInput): string {
	const authors = parseAuthors(input.authors);
	const title = trim(input.title);

	if (!title && !input.authors) {
		return "";
	}

	const normalized = withSourceBucket(input);
	const family = getStyleFamily(style);

	return formatByFamily(family, style, normalized, authors, {
		apa: formatApa,
		mla: formatMla,
		chicago: formatChicago,
		harvard: formatHarvard,
	});
}

export function formatBibliography(style: CitationStyle, entries: ReferenceInput[]): string {
	const lines = entries
		.map((entry) => formatCitation(style, entry))
		.filter(Boolean);
	if (style === "bibtex") return lines.join("\n\n");
	return lines.join("\n\n");
}

export const EMPTY_REFERENCE: ReferenceInput = {
	sourceType: "journal",
	authors: "",
	title: "",
	year: new Date().getFullYear().toString(),
};

export function validateReference(input: ReferenceInput): string[] {
	const errors: string[] = [];
	if (!trim(input.title)) errors.push("Title is required");
	if (!trim(input.year)) errors.push("Publication year is required");
	if (!trim(input.authors)) errors.push("At least one author is recommended");

	const bucket = getSourceBucket(input.sourceType);
	switch (bucket) {
		case "book":
			if (!trim(input.publisher) && !["thesis", "dissertation", "report"].includes(input.sourceType)) {
				errors.push("Publisher is recommended for books");
			}
			break;
		case "journal":
			if (!trim(input.journal) && !trim(input.siteName)) errors.push("Publication name is required");
			break;
		case "website":
			if (!trim(input.url)) errors.push("URL is required for web sources");
			break;
		case "chapter":
			if (!trim(input.bookTitle)) errors.push("Book title is required for chapters");
			break;
		case "conference":
			if (!trim(input.conference)) errors.push("Conference name is required");
			break;
	}
	return errors;
}
