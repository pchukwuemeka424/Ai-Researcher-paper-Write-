export type Discipline = {
	id: string;
	label: string;
};

export type DisciplineGroup = {
	id: string;
	label: string;
	disciplines: Discipline[];
};

export const DISCIPLINE_GROUPS: DisciplineGroup[] = [
	{
		id: "stem",
		label: "STEM",
		disciplines: [
			{ id: "computer-science", label: "Computer Science" },
			{ id: "engineering", label: "Engineering" },
			{ id: "mathematics", label: "Mathematics" },
			{ id: "physics", label: "Physics" },
			{ id: "chemistry", label: "Chemistry" },
			{ id: "biology", label: "Biology" },
			{ id: "medicine", label: "Medicine & Health Sciences" },
			{ id: "environmental-science", label: "Environmental Science" },
		],
	},
	{
		id: "social",
		label: "Social Sciences",
		disciplines: [
			{ id: "psychology", label: "Psychology" },
			{ id: "sociology", label: "Sociology" },
			{ id: "economics", label: "Economics" },
			{ id: "political-science", label: "Political Science" },
			{ id: "anthropology", label: "Anthropology" },
			{ id: "education", label: "Education" },
			{ id: "law", label: "Law" },
		],
	},
	{
		id: "humanities",
		label: "Humanities & Arts",
		disciplines: [
			{ id: "history", label: "History" },
			{ id: "philosophy", label: "Philosophy" },
			{ id: "literature", label: "Literature" },
			{ id: "linguistics", label: "Linguistics" },
			{ id: "art-history", label: "Art History" },
			{ id: "music", label: "Music" },
			{ id: "theology", label: "Theology & Religious Studies" },
		],
	},
	{
		id: "business",
		label: "Business & Applied",
		disciplines: [
			{ id: "business-administration", label: "Business Administration" },
			{ id: "marketing", label: "Marketing" },
			{ id: "finance", label: "Finance" },
			{ id: "public-health", label: "Public Health" },
			{ id: "urban-planning", label: "Urban Planning" },
			{ id: "communication", label: "Communication & Media Studies" },
		],
	},
];

export const DEFAULT_DISCIPLINE = "computer-science";

export function getDisciplineLabel(id: string): string {
	for (const group of DISCIPLINE_GROUPS) {
		const match = group.disciplines.find((d) => d.id === id);
		if (match) return match.label;
	}
	return id;
}
