export type SourceType =
	| "journal"
	| "book"
	| "website"
	| "chapter"
	| "conference"
	| "report"
	| "thesis"
	| "dissertation"
	| "patent"
	| "newspaper"
	| "magazine"
	| "blog"
	| "video"
	| "film"
	| "podcast"
	| "dataset"
	| "software"
	| "encyclopedia"
	| "standard"
	| "legislation"
	| "interview"
	| "artwork"
	| "map"
	| "archive";

export type SourceTypeGroup = {
	id: string;
	label: string;
	types: { id: SourceType; label: string }[];
};

export const SOURCE_TYPE_GROUPS: SourceTypeGroup[] = [
	{
		id: "scholarly",
		label: "Scholarly",
		types: [
			{ id: "journal", label: "Journal article" },
			{ id: "book", label: "Book" },
			{ id: "chapter", label: "Book chapter" },
			{ id: "conference", label: "Conference paper" },
			{ id: "thesis", label: "Thesis" },
			{ id: "dissertation", label: "Dissertation" },
			{ id: "report", label: "Report / white paper" },
			{ id: "dataset", label: "Dataset" },
			{ id: "standard", label: "Technical standard" },
		],
	},
	{
		id: "web-media",
		label: "Web & media",
		types: [
			{ id: "website", label: "Website" },
			{ id: "blog", label: "Blog post" },
			{ id: "video", label: "Online video" },
			{ id: "podcast", label: "Podcast episode" },
			{ id: "software", label: "Software" },
		],
	},
	{
		id: "popular",
		label: "Popular & periodicals",
		types: [
			{ id: "newspaper", label: "Newspaper article" },
			{ id: "magazine", label: "Magazine article" },
			{ id: "encyclopedia", label: "Encyclopedia entry" },
			{ id: "film", label: "Film / motion picture" },
		],
	},
	{
		id: "other",
		label: "Other",
		types: [
			{ id: "patent", label: "Patent" },
			{ id: "legislation", label: "Legislation / statute" },
			{ id: "interview", label: "Interview" },
			{ id: "artwork", label: "Artwork" },
			{ id: "map", label: "Map" },
			{ id: "archive", label: "Archive material" },
		],
	},
];

export const SOURCE_TYPES = SOURCE_TYPE_GROUPS.flatMap((g) => g.types);

export function getSourceTypeLabel(id: SourceType): string {
	return SOURCE_TYPES.find((t) => t.id === id)?.label ?? id;
}

/** Maps extended types to formatter behaviour bucket */
export type SourceBucket = "journal" | "book" | "website" | "chapter" | "conference";

export function getSourceBucket(type: SourceType): SourceBucket {
	switch (type) {
		case "book":
		case "thesis":
		case "dissertation":
		case "report":
		case "encyclopedia":
		case "standard":
		case "software":
		case "artwork":
		case "map":
		case "archive":
		case "patent":
			return "book";
		case "website":
		case "blog":
		case "video":
		case "podcast":
		case "dataset":
		case "film":
			return "website";
		case "newspaper":
		case "magazine":
			return "journal";
		case "legislation":
		case "interview":
			return "book";
		case "chapter":
			return "chapter";
		case "conference":
			return "conference";
		case "journal":
		default:
			return "journal";
	}
}
