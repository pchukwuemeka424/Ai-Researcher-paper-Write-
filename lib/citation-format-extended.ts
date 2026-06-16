import type { ParsedAuthor, ReferenceInput } from "@/lib/citation-format";
import type { CitationStyle, StyleFamily } from "@/lib/citation-styles";

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

function fullTitle(title: string, subtitle?: string): string {
	const t = trim(title);
	const s = trim(subtitle);
	return s ? `${t}: ${s}` : t;
}

function cleanDoi(doi?: string): string {
	if (!doi) return "";
	return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/[.,;]+$/, "");
}

/** IEEE: F. M. Last and B. Last, "Title," Journal, vol. x, no. y, pp. z, Year. */
function authorListIeee(authors: ParsedAuthor[]): string {
	if (!authors.length) return "";
	const fmt = (a: ParsedAuthor) => {
		const ini = initials(a.first, a.middle);
		return ini ? `${ini}. ${a.last}` : a.last;
	};
	if (authors.length === 1) return fmt(authors[0]!);
	if (authors.length === 2) return `${fmt(authors[0]!)} and ${fmt(authors[1]!)}`;
	if (authors.length <= 6) {
		return authors.map(fmt).join(", ").replace(/, ([^,]+)$/, ", and $1");
	}
	return `${fmt(authors[0]!)} et al.`;
}

export function formatIeee(input: ReferenceInput, authors: ParsedAuthor[]): string {
	const author = authorListIeee(authors);
	const title = fullTitle(input.title, input.subtitle);
	const year = trim(input.year);

	switch (input.sourceType) {
		case "journal":
		case "magazine":
		case "newspaper": {
			const journal = trim(input.journal) || trim(input.siteName);
			const vol = trim(input.volume);
			const iss = trim(input.issue);
			const pg = trim(input.pages);
			return [
				author && `${author},`,
				`"${title},"`,
				journal && `${journal},`,
				vol && `vol. ${vol},`,
				iss && `no. ${iss},`,
				pg && `pp. ${pg},`,
				year && `${year}.`,
			]
				.filter(Boolean)
				.join(" ")
				.replace(/\s+/g, " ")
				.trim();
		}
		case "book":
		case "thesis":
		case "dissertation":
		case "report": {
			const pub = trim(input.publisher) || trim(input.city);
			return [author && `${author},`, `*${title}*.`, pub && `${pub},`, year && `${year}.`].filter(Boolean).join(" ").trim();
		}
		case "conference": {
			const conf = trim(input.conference);
			return [author && `${author},`, `"${title},"`, conf && `in *${conf}*,`, year && `${year}.`].filter(Boolean).join(" ").trim();
		}
		case "website":
		case "blog":
		case "video":
		case "podcast": {
			const url = trim(input.url);
			return [author && `${author},`, `"${title},"`, url && `[Online]. Available: ${url}.`, year && `Accessed: ${year}.`].filter(Boolean).join(" ").trim();
		}
		default:
			return [author && `${author},`, `"${title},"`, year && `${year}.`].filter(Boolean).join(" ").trim();
	}
}

/** Vancouver: Last FM, Last FM. Title. Journal. Year;Vol(Issue):Pages. */
function authorListVancouver(authors: ParsedAuthor[]): string {
	if (!authors.length) return "";
	const fmt = (a: ParsedAuthor) => {
		const ini = initials(a.first, a.middle);
		return `${a.last}${ini ? ` ${ini}` : ""}`;
	};
	if (authors.length <= 6) return authors.map(fmt).join(", ");
	return `${fmt(authors[0]!)} et al`;
}

export function formatVancouver(input: ReferenceInput, authors: ParsedAuthor[]): string {
	const author = authorListVancouver(authors);
	const title = fullTitle(input.title, input.subtitle);
	const year = trim(input.year);

	switch (input.sourceType) {
		case "journal":
		case "magazine": {
			const journal = trim(input.journal);
			const vol = trim(input.volume);
			const iss = trim(input.issue);
			const pg = trim(input.pages);
			let volPart = "";
			if (vol) volPart = iss ? `${year};${vol}(${iss})` : `${year};${vol}`;
			else if (year) volPart = year;
			return [author && `${author}.`, `${title}.`, journal && `${journal}.`, volPart && `${volPart}:`, pg && `${pg}.`].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
		}
		case "book":
		case "report":
		case "thesis": {
			const pub = trim(input.publisher);
			return [author && `${author}.`, `${title}.`, pub && `${pub};`, year && `${year}.`].filter(Boolean).join(" ").trim();
		}
		case "website":
		case "blog": {
			const url = trim(input.url);
			return [author && `${author}.`, `${title}.`, url && `[Internet]. ${year}.`, trim(input.accessDate) && `Available from: ${url}`].filter(Boolean).join(" ").trim();
		}
		default:
			return [author && `${author}.`, `${title}.`, year && `${year}.`].filter(Boolean).join(" ").trim();
	}
}

export function formatAma(input: ReferenceInput, authors: ParsedAuthor[]): string {
	return formatVancouver(input, authors).replace(/;/g, ";").replace(/\.\s+/g, ". ");
}

export function formatAcs(input: ReferenceInput, authors: ParsedAuthor[]): string {
	const author = authorListVancouver(authors);
	const title = fullTitle(input.title, input.subtitle);
	const year = trim(input.year);
	const journal = trim(input.journal);
	const vol = trim(input.volume);
	const pg = trim(input.pages);
	const doi = cleanDoi(input.doi);
	if (input.sourceType === "journal" || input.sourceType === "magazine") {
		return [author && `${author}.`, `${title}.`, journal && `*${journal}*`, year && `${year}`, vol && `, *${vol}*`, pg && `, ${pg}`, doi && `. https://doi.org/${doi}.`].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
	}
	return [author && `${author}.`, `${title}.`, year && `${year}.`].filter(Boolean).join(" ").trim();
}

export function formatNature(input: ReferenceInput, authors: ParsedAuthor[], style: CitationStyle): string {
	const author = authorListVancouver(authors);
	const title = fullTitle(input.title, input.subtitle);
	const year = trim(input.year);
	const journal = trim(input.journal);
	const vol = trim(input.volume);
	const pg = trim(input.pages);
	const doi = cleanDoi(input.doi);

	if (input.sourceType === "journal" || input.sourceType === "magazine") {
		const parts = [author && `${author}`, `${title}.`, journal && `*${journal}*`];
		if (style === "science") {
			parts.push(vol && `${vol},`, pg && `${pg}`, year && `(${year}).`);
		} else {
			parts.push(vol && `${vol},`, pg && `${pg} (${year}).`);
		}
		if (doi) parts.push(`https://doi.org/${doi}`);
		return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
	}
	return [author && `${author}`, `${title}.`, year && `(${year}).`].filter(Boolean).join(" ").trim();
}

export function formatCse(input: ReferenceInput, authors: ParsedAuthor[], numbered: boolean): string {
	const author = authorListVancouver(authors);
	const title = fullTitle(input.title, input.subtitle);
	const year = trim(input.year);
	if (numbered) {
		return formatVancouver(input, authors);
	}
	return [author && `${author}.`, year && `${year}.`, `${title}.`, trim(input.journal) && `*${input.journal}*.`].filter(Boolean).join(" ").trim();
}

export function formatAsa(input: ReferenceInput, authors: ParsedAuthor[]): string {
	const author = authorListVancouver(authors);
	const title = fullTitle(input.title, input.subtitle);
	const year = trim(input.year);
	const journal = trim(input.journal);
	const vol = trim(input.volume);
	const iss = trim(input.issue);
	const pg = trim(input.pages);
	if (input.sourceType === "journal") {
		return [author && `${author}.`, year && `${year}.`, `"${title}."`, journal && `*${journal}*`, vol && `${vol}`, iss && `(${iss})`, pg && `:${pg}.`].filter(Boolean).join(" ").trim();
	}
	return [author && `${author}.`, year && `${year}.`, `*${title}*.`].filter(Boolean).join(" ").trim();
}

export function formatLegal(input: ReferenceInput, authors: ParsedAuthor[], style: CitationStyle): string {
	const author = authors.length ? `${authors[0]!.last}` : trim(input.authors);
	const title = fullTitle(input.title, input.subtitle);
	const year = trim(input.year);
	if (style === "oscola") {
		return [author && `${author},`, `'${title}'`, year && `(${year})`].filter(Boolean).join(" ").trim();
	}
	if (style === "aglc") {
		return [author && `${author},`, `'${title}'`, year && `(${year})`].filter(Boolean).join(" ").trim();
	}
	return [author && `${author},`, `"${title},"`, year && `${year}.`].filter(Boolean).join(" ").trim();
}

export function formatAbnt(input: ReferenceInput, authors: ParsedAuthor[]): string {
	const author = authorListVancouver(authors).toUpperCase();
	const title = fullTitle(input.title, input.subtitle);
	const year = trim(input.year);
	const pub = trim(input.publisher);
	const city = trim(input.city);
	if (input.sourceType === "book" || input.sourceType === "thesis") {
		return [author && `${author}.`, `**${title}**.`, city && pub ? `${city}: ${pub},` : pub, year && `${year}.`].filter(Boolean).join(" ").trim();
	}
	return [author && `${author}.`, title && `${title}.`, trim(input.journal), year && `${year}.`].filter(Boolean).join(" ").trim();
}

export function formatDin(input: ReferenceInput, authors: ParsedAuthor[]): string {
	const author = authorListVancouver(authors);
	const title = fullTitle(input.title, input.subtitle);
	const year = trim(input.year);
	return [author && `${author}:`, title && `${title}.`, year && `${year}.`].filter(Boolean).join(" ").trim();
}

export function formatSpringer(input: ReferenceInput, authors: ParsedAuthor[]): string {
	return formatVancouver(input, authors);
}

export function formatElsevier(input: ReferenceInput, authors: ParsedAuthor[]): string {
	const author = authorListVancouver(authors);
	const title = fullTitle(input.title, input.subtitle);
	const year = trim(input.year);
	const journal = trim(input.journal);
	const vol = trim(input.volume);
	const pg = trim(input.pages);
	const doi = cleanDoi(input.doi);
	return [author && `${author},`, year && `${year}.`, `"${title},"`, journal && `${journal},`, vol && `${vol}`, pg && `, ${pg}`, doi && `. https://doi.org/${doi}`].filter(Boolean).join(" ").trim();
}

export function formatBibtex(input: ReferenceInput, authors: ParsedAuthor[]): string {
	const author = authors
		.map((a) => `${a.last}, ${a.first}${a.middle ? ` ${a.middle}` : ""}`)
		.join(" and ");
	const title = trim(input.title);
	const year = trim(input.year);
	const type =
		input.sourceType === "book"
			? "book"
			: input.sourceType === "website" || input.sourceType === "blog"
				? "misc"
				: input.sourceType === "conference"
					? "inproceedings"
					: "article";
	const lines = [`@${type}{${title.toLowerCase().replace(/\s+/g, "_").slice(0, 30)},`, `  author = {${author || trim(input.authors)}},`, `  title = {${title}},`, `  year = {${year}},`];
	if (trim(input.journal)) lines.push(`  journal = {${input.journal}},`);
	if (trim(input.volume)) lines.push(`  volume = {${input.volume}},`);
	if (trim(input.pages)) lines.push(`  pages = {${input.pages}},`);
	if (trim(input.doi)) lines.push(`  doi = {${cleanDoi(input.doi)}},`);
	if (trim(input.url)) lines.push(`  url = {${input.url}},`);
	lines.push("}");
	return lines.join("\n");
}

export function formatByFamily(
	family: StyleFamily,
	style: CitationStyle,
	input: ReferenceInput,
	authors: ParsedAuthor[],
	formatters: {
		apa: (i: ReferenceInput, a: ParsedAuthor[]) => string;
		mla: (i: ReferenceInput, a: ParsedAuthor[]) => string;
		chicago: (i: ReferenceInput, a: ParsedAuthor[]) => string;
		harvard: (i: ReferenceInput, a: ParsedAuthor[]) => string;
	},
): string {
	switch (family) {
		case "apa":
			return formatters.apa(input, authors);
		case "mla":
			return formatters.mla(input, authors);
		case "chicago":
			return formatters.chicago(input, authors);
		case "harvard":
			return formatters.harvard(input, authors);
		case "ieee":
			return formatIeee(input, authors);
		case "vancouver":
		case "ama":
			return family === "ama" ? formatAma(input, authors) : formatVancouver(input, authors);
		case "acs":
			return formatAcs(input, authors);
		case "nature":
			return formatNature(input, authors, style);
		case "cse":
			return formatCse(input, authors, style === "cse-citation-sequence");
		case "asa":
			return formatAsa(input, authors);
		case "legal":
			return formatLegal(input, authors, style);
		case "abnt":
			return formatAbnt(input, authors);
		case "din":
			return formatDin(input, authors);
		case "springer":
			return formatSpringer(input, authors);
		case "elsevier":
			return formatElsevier(input, authors);
		case "bibtex":
			return formatBibtex(input, authors);
		default:
			return formatters.apa(input, authors);
	}
}
