export type CitationStyle =
	| "apa-7"
	| "apa-6"
	| "mla-9"
	| "mla-8"
	| "chicago-author-date"
	| "chicago-notes"
	| "turabian"
	| "harvard"
	| "harvard-cite-them-right"
	| "ieee"
	| "vancouver"
	| "ama"
	| "acs"
	| "nature"
	| "science"
	| "cell"
	| "lancet"
	| "cse-name-year"
	| "cse-citation-sequence"
	| "asa"
	| "apsa"
	| "oscola"
	| "aglc"
	| "bluebook"
	| "abnt"
	| "din-1505"
	| "springer-basic"
	| "elsevier-harvard"
	| "oxford-humsoc"
	| "bibtex";

export type CitationStyleGroup = {
	id: string;
	label: string;
	styles: { id: CitationStyle; label: string; hint: string }[];
};

export const CITATION_STYLE_GROUPS: CitationStyleGroup[] = [
	{
		id: "common",
		label: "Common & humanities",
		styles: [
			{ id: "apa-7", label: "APA 7th edition", hint: "Psychology, education, social sciences" },
			{ id: "apa-6", label: "APA 6th edition", hint: "Legacy APA style" },
			{ id: "mla-9", label: "MLA 9th edition", hint: "Literature, arts, humanities" },
			{ id: "mla-8", label: "MLA 8th edition", hint: "Legacy MLA style" },
			{ id: "chicago-author-date", label: "Chicago — Author–date", hint: "Sciences and social sciences" },
			{ id: "chicago-notes", label: "Chicago — Notes & bibliography", hint: "History, arts" },
			{ id: "turabian", label: "Turabian", hint: "Student papers (Chicago-based)" },
			{ id: "harvard", label: "Harvard", hint: "Author–date, UK universities" },
			{ id: "harvard-cite-them-right", label: "Harvard (Cite Them Right)", hint: "UK institutional standard" },
			{ id: "oxford-humsoc", label: "Oxford — Humanities", hint: "Oxford University referencing" },
		],
	},
	{
		id: "stem",
		label: "STEM & medicine",
		styles: [
			{ id: "ieee", label: "IEEE", hint: "Engineering, computer science, electronics" },
			{ id: "vancouver", label: "Vancouver", hint: "Biomedical journals, ICMJE" },
			{ id: "ama", label: "AMA", hint: "American Medical Association" },
			{ id: "acs", label: "ACS", hint: "American Chemical Society" },
			{ id: "nature", label: "Nature", hint: "Nature portfolio journals" },
			{ id: "science", label: "Science", hint: "AAAS Science journal" },
			{ id: "cell", label: "Cell", hint: "Cell Press journals" },
			{ id: "lancet", label: "Lancet", hint: "The Lancet family" },
			{ id: "cse-name-year", label: "CSE — Name–year", hint: "Council of Science Editors" },
			{ id: "cse-citation-sequence", label: "CSE — Citation–sequence", hint: "Numbered in-text references" },
		],
	},
	{
		id: "social",
		label: "Social sciences & law",
		styles: [
			{ id: "asa", label: "ASA", hint: "American Sociological Association" },
			{ id: "apsa", label: "APSA", hint: "American Political Science Association" },
			{ id: "oscola", label: "OSCOLA", hint: "UK legal citations" },
			{ id: "aglc", label: "AGLC", hint: "Australian Guide to Legal Citation" },
			{ id: "bluebook", label: "Bluebook", hint: "US legal citation (simplified)" },
		],
	},
	{
		id: "international",
		label: "International & publishers",
		styles: [
			{ id: "abnt", label: "ABNT", hint: "Brazilian technical standard NBR 6023" },
			{ id: "din-1505", label: "DIN 1505", hint: "German citation standard" },
			{ id: "springer-basic", label: "Springer — Basic", hint: "Springer Nature reference style" },
			{ id: "elsevier-harvard", label: "Elsevier — Harvard", hint: "Elsevier author–date" },
			{ id: "bibtex", label: "BibTeX (plain)", hint: "LaTeX bibliography entry" },
		],
	},
];

export const CITATION_STYLES = CITATION_STYLE_GROUPS.flatMap((g) => g.styles);

export const DEFAULT_CITATION_STYLE: CitationStyle = "apa-7";

export type StyleFamily =
	| "apa"
	| "mla"
	| "chicago"
	| "harvard"
	| "ieee"
	| "vancouver"
	| "ama"
	| "acs"
	| "nature"
	| "cse"
	| "asa"
	| "legal"
	| "abnt"
	| "din"
	| "springer"
	| "elsevier"
	| "bibtex";

const STYLE_FAMILY: Record<CitationStyle, StyleFamily> = {
	"apa-7": "apa",
	"apa-6": "apa",
	"mla-9": "mla",
	"mla-8": "mla",
	"chicago-author-date": "chicago",
	"chicago-notes": "chicago",
	turabian: "chicago",
	harvard: "harvard",
	"harvard-cite-them-right": "harvard",
	ieee: "ieee",
	vancouver: "vancouver",
	ama: "ama",
	acs: "acs",
	nature: "nature",
	science: "nature",
	cell: "nature",
	lancet: "vancouver",
	"cse-name-year": "cse",
	"cse-citation-sequence": "cse",
	asa: "asa",
	apsa: "asa",
	oscola: "legal",
	aglc: "legal",
	bluebook: "legal",
	abnt: "abnt",
	"din-1505": "din",
	"springer-basic": "springer",
	"elsevier-harvard": "elsevier",
	"oxford-humsoc": "harvard",
	bibtex: "bibtex",
};

export function getStyleFamily(style: CitationStyle): StyleFamily {
	return STYLE_FAMILY[style] ?? "apa";
}

export function getStyleLabel(style: CitationStyle): string {
	return CITATION_STYLES.find((s) => s.id === style)?.label ?? style;
}
