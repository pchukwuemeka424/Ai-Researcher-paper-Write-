import { getDisciplineLabel } from "@/lib/research-disciplines";

const IDEA_TYPE_LABELS: Record<string, string> = {
	empirical: "Empirical",
	theoretical: "Theoretical",
	interdisciplinary: "Interdisciplinary",
	applied: "Applied",
};

export type OutlineIdeaInput = {
	title: string;
	approach: string;
	type: string;
};

export type OutlinePaper = {
	title: string;
	abstract: string;
	arxivId: string | null;
	authors: string[];
	publicationDate: string | null;
	url: string;
};

/** Hostnames allowed in outline source links (HTTPS only). */
const ALLOWED_LINK_HOSTS = [
	"arxiv.org",
	"alphaxiv.org",
	"scholar.google.com",
	"openalex.org",
	"semanticscholar.org",
	"doi.org",
	"pubmed.ncbi.nlm.nih.gov",
	"ncbi.nlm.nih.gov",
	"eric.ed.gov",
	"dl.acm.org",
	"acm.org",
	"apa.org",
	"aeaweb.org",
	"aera.net",
	"masteringmetrics.com",
	"aima.cs.berkeley.edu",
	"proquest.com",
	"ebsco.com",
	"oup.com",
	"oxforduniversitypress.com",
	"global.oup.com",
	"uchicago.edu",
	"press.uchicago.edu",
	"sagepub.com",
	"us.sagepub.com",
] as const;

export type ReadingSource = {
	citation: string;
	relevance: string;
	/** Curated HTTPS URL (publisher, DOI resolver, or official database). */
	url: string;
	linkLabel: string;
};

export function isAllowlistedSourceUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "https:") return false;
		const host = parsed.hostname.replace(/^www\./, "");
		return ALLOWED_LINK_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
	} catch {
		return false;
	}
}

export function formatSourceCitation(source: ReadingSource): string {
	if (!isAllowlistedSourceUrl(source.url)) {
		return source.citation;
	}

	const withEmbeddedTitle = source.citation.replace(/\*([^*]+)\*/, `[*$1*](${source.url})`);
	if (withEmbeddedTitle !== source.citation) {
		return withEmbeddedTitle;
	}

	return `[${source.linkLabel}](${source.url}) — ${source.citation}`;
}

export type SearchLink = { label: string; url: string };

export function buildTopicSearchLinks(disciplineId: string, query: string): SearchLink[] {
	const q = encodeURIComponent(query.trim());
	if (!q) return [];

	const links: SearchLink[] = [
		{ label: "Google Scholar", url: `https://scholar.google.com/scholar?q=${q}` },
		{ label: "OpenAlex", url: `https://openalex.org/works?filter=default.search:${q}` },
		{ label: "Semantic Scholar", url: `https://www.semanticscholar.org/search?q=${q}` },
	];

	if (disciplineId === "medicine" || disciplineId === "public-health") {
		links.push({ label: "PubMed", url: `https://pubmed.ncbi.nlm.nih.gov/?term=${q}` });
	}
	if (disciplineId === "education") {
		links.push({ label: "ERIC", url: `https://eric.ed.gov/?q=${q}` });
	}
	if (disciplineId === "computer-science" || disciplineId === "engineering") {
		links.push({ label: "ACM Digital Library", url: `https://dl.acm.org/action/doSearch?AllField=${q}` });
	}

	return links.filter((link) => isAllowlistedSourceUrl(link.url));
}

export const METHODOLOGY_SOURCES: ReadingSource[] = [
	{
		citation:
			"Creswell, J. W., & Creswell, J. D. (2018). *Research Design: Qualitative, Quantitative, and Mixed Methods Approaches* (5th ed.). SAGE.",
		relevance: "Core framework for aligning methods with your research question and scope.",
		url: "https://doi.org/10.4135/9781502226094",
		linkLabel: "View on DOI",
	},
	{
		citation:
			"Booth, W. C., Colomb, G. G., Williams, J. M., & Bizup, J. (2016). *The Craft of Research* (4th ed.). University of Chicago Press.",
		relevance: "Practical guidance on framing questions, arguments, and literature engagement.",
		url: "https://doi.org/10.7208/chicago/9780226811317",
		linkLabel: "View on DOI",
	},
];

export const DISCIPLINE_SOURCES: Record<string, ReadingSource[]> = {
	"computer-science": [
		{
			citation:
				"Russell, S., & Norvig, P. (2021). *Artificial Intelligence: A Modern Approach* (4th ed.). Pearson.",
			relevance: "Foundational reference for computational and AI-related research design.",
			url: "https://aima.cs.berkeley.edu/",
			linkLabel: "Open textbook site",
		},
		{
			citation: "ACM Digital Library — Peer-reviewed proceedings and journals in computing.",
			relevance: "Primary database for recent methods and empirical studies in computer science.",
			url: "https://dl.acm.org/",
			linkLabel: "Browse ACM DL",
		},
	],
	psychology: [
		{
			citation: "American Psychological Association. (2020). *Publication Manual of the APA* (7th ed.). APA.",
			relevance: "Standard for reporting, citing, and structuring psychology research.",
			url: "https://www.apa.org/pubs/books/4200066",
			linkLabel: "APA book page",
		},
		{
			citation: "APA PsycInfo — Index of psychology and behavioural science literature.",
			relevance: "Essential database for systematic reviews in psychology.",
			url: "https://www.apa.org/pubs/databases/psycinfo",
			linkLabel: "PsycInfo overview",
		},
	],
	sociology: [
		{
			citation: "Bryman, A. (2016). *Social Research Methods* (5th ed.). Oxford University Press.",
			relevance: "Widely used methods text for qualitative and quantitative social inquiry.",
			url: "https://doi.org/10.1093/oso/9780199689453.001.0001",
			linkLabel: "View on DOI",
		},
		{
			citation: "Sociological Abstracts (ProQuest) — Coverage of sociology and related social sciences.",
			relevance: "Starting point for mapping debates and prior studies in your subfield.",
			url: "https://www.proquest.com/products-services/sociological-abstracts.html",
			linkLabel: "ProQuest product page",
		},
	],
	economics: [
		{
			citation:
				"Angrist, J. D., & Pischke, J.-S. (2014). *Mastering 'Metrics: The Path from Cause to Effect*. Princeton University Press.",
			relevance: "Accessible introduction to causal empirical design.",
			url: "https://www.masteringmetrics.com/",
			linkLabel: "Companion site",
		},
		{
			citation: "EconLit (American Economic Association) — Economics journal articles and working papers.",
			relevance: "Authoritative index for economics literature searches.",
			url: "https://www.aeaweb.org/econlit/",
			linkLabel: "EconLit home",
		},
	],
	education: [
		{
			citation:
				"American Educational Research Association. (2011). *Standards for Reporting on Empirical Social Science Research in AERA Publications*.",
			relevance: "Reporting standards for rigorous education research.",
			url: "https://doi.org/10.3102/0013189X11413121",
			linkLabel: "View on DOI",
		},
		{
			citation: "ERIC (Education Resources Information Center) — Education policy and practice literature.",
			relevance: "Major open database for education research.",
			url: "https://eric.ed.gov/",
			linkLabel: "Search ERIC",
		},
	],
	medicine: [
		{
			citation:
				"Glasziou, P., Altman, D. G., Bossuyt, P., et al. (2014). Reducing waste from incomplete or unusable reports of biomedical research. *The Lancet*, 383(9913), 267–276.",
			relevance: "Context for transparent, reproducible health sciences reporting.",
			url: "https://doi.org/10.1016/S0140-6736(13)62228-X",
			linkLabel: "View on DOI",
		},
		{
			citation: "PubMed / MEDLINE — Biomedical and clinical literature.",
			relevance: "Primary source for health sciences literature searches.",
			url: "https://pubmed.ncbi.nlm.nih.gov/",
			linkLabel: "Search PubMed",
		},
	],
	"public-health": [
		{
			citation: "PubMed / MEDLINE — Population and clinical health literature.",
			relevance: "Core database for public health evidence reviews.",
			url: "https://pubmed.ncbi.nlm.nih.gov/",
			linkLabel: "Search PubMed",
		},
		{
			citation:
				"Glasziou, P., et al. (2014). Reducing waste from incomplete or unusable reports of biomedical research. *The Lancet*, 383(9913), 267–276.",
			relevance: "Reporting quality standards for health research.",
			url: "https://doi.org/10.1016/S0140-6736(13)62228-X",
			linkLabel: "View on DOI",
		},
	],
	history: [
		{
			citation:
				"Turabian, K. L. (2018). *A Manual for Writers of Research Papers, Theses, and Dissertations* (9th ed.). University of Chicago Press.",
			relevance: "Conventions for historical argument, evidence, and citation.",
			url: "https://doi.org/10.7208/9780226499289",
			linkLabel: "View on DOI",
		},
		{
			citation: "Historical Abstracts (EBSCO) — Scholarly history and related humanities.",
			relevance: "Database for historiography and secondary scholarship.",
			url: "https://www.ebsco.com/products/research-databases/historical-abstracts",
			linkLabel: "EBSCO product page",
		},
	],
	"business-administration": [
		{
			citation:
				"Saunders, M., Lewis, P., & Thornhill, A. (2019). *Research Methods for Business Students* (8th ed.). Pearson.",
			relevance: "Applied methods guide suited to management and business topics.",
			url: "https://doi.org/10.5040/9781350315916",
			linkLabel: "View on DOI",
		},
		{
			citation: "ABI/INFORM Collection (ProQuest) — Business, management, and trade publications.",
			relevance: "Key database for scholarly and industry business research.",
			url: "https://www.proquest.com/products-services/abi-inform-collection.html",
			linkLabel: "ProQuest product page",
		},
	],
};

export const DEFAULT_DISCIPLINE_SOURCES: ReadingSource[] = [
	{
		citation:
			"Hart, C. (2018). *Doing a Literature Review: Releasing the Research Imagination* (2nd ed.). SAGE.",
		relevance: "Step-by-step approach to building and structuring a literature review.",
		url: "https://doi.org/10.4135/9781473914973",
		linkLabel: "View on DOI",
	},
	{
		citation: "Google Scholar — Broad discovery with citation tracking.",
		relevance: "Use alongside your discipline's specialist databases for comprehensive coverage.",
		url: "https://scholar.google.com/",
		linkLabel: "Open Google Scholar",
	},
];

export function buildOutlineSourcesFromPapers(
	papers: OutlinePaper[],
	disciplineId: string,
	topic: string,
	idea: OutlineIdeaInput,
): string[] {
	if (papers.length === 0) {
		return buildOutlineSources(disciplineId, topic, idea);
	}

	const lines: string[] = [];

	papers.forEach((paper, index) => {
		const authorLine = formatPaperAuthors(paper.authors);
		const year = paperYear(paper.publicationDate);
		const title = paper.title.replace(/\*/g, "");
		const titleLink =
			paper.url && isAllowlistedSourceUrl(paper.url)
				? `[*${title}*](${paper.url})`
				: paper.url
					? `[*${title}*](${paper.url})`
					: `*${title}*`;
		const citation = `${authorLine} (${year}). ${titleLink}.`;

		lines.push(`${index + 1}. ${citation}`);
		lines.push(`   ${paperRelevance(paper, idea)}`);
		lines.push("");
	});

	return lines;
}

function formatPaperAuthors(authors: string[]): string {
	if (authors.length === 0) return "Unknown authors";
	if (authors.length === 1) return authors[0]!;
	if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
	return `${authors[0]} et al.`;
}

function paperYear(publicationDate: string | null): string {
	if (!publicationDate) return "n.d.";
	const year = new Date(publicationDate).getFullYear();
	return Number.isFinite(year) ? String(year) : "n.d.";
}

function paperRelevance(paper: OutlinePaper, idea: OutlineIdeaInput): string {
	const abstract = paper.abstract.replace(/\s+/g, " ").trim();
	if (abstract.length >= 40) {
		return abstract.length > 220 ? `${abstract.slice(0, 217)}…` : abstract;
	}
	return `Relevant ${(IDEA_TYPE_LABELS[idea.type] ?? idea.type).toLowerCase()} literature related to: ${idea.title.replace(/\?$/, "")}.`;
}

export function buildOutlineSources(disciplineId: string, topic: string, idea: OutlineIdeaInput): string[] {
	const disciplineLabel = getDisciplineLabel(disciplineId);
	const contextTopic = topic.trim() || idea.title;
	const fieldSources = DISCIPLINE_SOURCES[disciplineId] ?? DEFAULT_DISCIPLINE_SOURCES;
	const combined = [...METHODOLOGY_SOURCES, ...fieldSources].filter((s) => isAllowlistedSourceUrl(s.url));

	const lines: string[] = [];
	combined.forEach((source, i) => {
		lines.push(`${i + 1}. ${formatSourceCitation(source)}`);
		lines.push(`   ${source.relevance}`);
		lines.push("");
	});

	const searchQuery = [contextTopic, idea.title.replace(/\?$/, ""), disciplineLabel].filter(Boolean).join(" ");
	const searchLinks = buildTopicSearchLinks(disciplineId, searchQuery);
	const searchStart = combined.length + 1;

	lines.push(`${searchStart}. **Topic-focused search** — Start with these validated search portals:`);
	if (searchLinks.length > 0) {
		for (const link of searchLinks) {
			lines.push(`   - [${link.label}](${link.url})`);
		}
		lines.push(
			`   Suggested terms: "${contextTopic}", "${idea.title.replace(/\?$/, "")}", "${(IDEA_TYPE_LABELS[idea.type] ?? idea.type).toLowerCase()} methods".`,
		);
	} else {
		lines.push(`   Suggested terms: "${contextTopic}", "${disciplineLabel}".`);
	}
	lines.push("");

	lines.push(
		`${searchStart + 1}. **Method-aligned reading** — Prioritise studies that use approaches similar to your proposed design.`,
	);
	lines.push(`   ${idea.approach || "Review methods sections and supplementary materials in recent peer-reviewed articles."}`);
	lines.push("");
	lines.push(
		`_${combined.length + 2} starting points with linked sources. Confirm access via your institution's library where login is required._`,
	);

	return lines;
}
