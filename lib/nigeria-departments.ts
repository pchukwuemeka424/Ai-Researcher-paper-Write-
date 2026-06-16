export type NigeriaDepartment = {
	id: string;
	label: string;
};

export type NigeriaDepartmentGroup = {
	id: string;
	label: string;
	departments: NigeriaDepartment[];
};

export const NIGERIA_DEPARTMENT_GROUPS: NigeriaDepartmentGroup[] = [
	{
		id: "engineering",
		label: "Engineering & Technology",
		departments: [
			{ id: "civil-engineering", label: "Civil Engineering" },
			{ id: "mechanical-engineering", label: "Mechanical Engineering" },
			{ id: "electrical-electronics", label: "Electrical & Electronics Engineering" },
			{ id: "computer-engineering", label: "Computer Engineering" },
			{ id: "chemical-engineering", label: "Chemical Engineering" },
			{ id: "petroleum-engineering", label: "Petroleum Engineering" },
			{ id: "agricultural-engineering", label: "Agricultural Engineering" },
			{ id: "industrial-engineering", label: "Industrial & Production Engineering" },
			{ id: "metallurgical-engineering", label: "Metallurgical & Materials Engineering" },
			{ id: "systems-engineering", label: "Systems Engineering" },
			{ id: "architecture", label: "Architecture" },
			{ id: "building-technology", label: "Building Technology" },
			{ id: "quantity-surveying", label: "Quantity Surveying" },
			{ id: "estate-management", label: "Estate Management" },
			{ id: "urban-regional-planning", label: "Urban & Regional Planning" },
			{ id: "surveying-geoinformatics", label: "Surveying & Geoinformatics" },
		],
	},
	{
		id: "computing",
		label: "Computing & Information Technology",
		departments: [
			{ id: "computer-science", label: "Computer Science" },
			{ id: "information-technology", label: "Information Technology" },
			{ id: "software-engineering", label: "Software Engineering" },
			{ id: "information-systems", label: "Information Systems" },
			{ id: "cyber-security", label: "Cyber Security" },
			{ id: "data-science", label: "Data Science & Analytics" },
			{ id: "library-information-science", label: "Library & Information Science" },
		],
	},
	{
		id: "sciences",
		label: "Physical & Life Sciences",
		departments: [
			{ id: "mathematics", label: "Mathematics" },
			{ id: "statistics", label: "Statistics" },
			{ id: "physics", label: "Physics" },
			{ id: "chemistry", label: "Chemistry" },
			{ id: "biochemistry", label: "Biochemistry" },
			{ id: "microbiology", label: "Microbiology" },
			{ id: "biology", label: "Biology" },
			{ id: "botany", label: "Botany" },
			{ id: "zoology", label: "Zoology" },
			{ id: "geology", label: "Geology" },
			{ id: "geography", label: "Geography" },
			{ id: "environmental-science", label: "Environmental Science" },
			{ id: "marine-science", label: "Marine Science" },
			{ id: "industrial-chemistry", label: "Industrial Chemistry" },
		],
	},
	{
		id: "medical",
		label: "Medical & Health Sciences",
		departments: [
			{ id: "medicine-surgery", label: "Medicine & Surgery" },
			{ id: "nursing", label: "Nursing Science" },
			{ id: "pharmacy", label: "Pharmacy" },
			{ id: "medical-laboratory-science", label: "Medical Laboratory Science" },
			{ id: "physiology", label: "Physiology" },
			{ id: "anatomy", label: "Anatomy" },
			{ id: "public-health", label: "Public Health" },
			{ id: "dentistry", label: "Dentistry" },
			{ id: "optometry", label: "Optometry" },
			{ id: "physiotherapy", label: "Physiotherapy" },
			{ id: "radiography", label: "Radiography" },
			{ id: "nutrition-dietetics", label: "Nutrition & Dietetics" },
			{ id: "veterinary-medicine", label: "Veterinary Medicine" },
		],
	},
	{
		id: "agriculture",
		label: "Agriculture & Natural Resources",
		departments: [
			{ id: "agricultural-economics", label: "Agricultural Economics" },
			{ id: "agronomy", label: "Agronomy" },
			{ id: "animal-science", label: "Animal Science" },
			{ id: "crop-science", label: "Crop Science" },
			{ id: "soil-science", label: "Soil Science" },
			{ id: "fisheries", label: "Fisheries & Aquaculture" },
			{ id: "forestry-wildlife", label: "Forestry & Wildlife Management" },
			{ id: "food-science-technology", label: "Food Science & Technology" },
			{ id: "home-economics", label: "Home Economics" },
		],
	},
	{
		id: "social-sciences",
		label: "Social Sciences",
		departments: [
			{ id: "economics", label: "Economics" },
			{ id: "political-science", label: "Political Science" },
			{ id: "sociology", label: "Sociology" },
			{ id: "psychology", label: "Psychology" },
			{ id: "international-relations", label: "International Relations" },
			{ id: "criminology", label: "Criminology & Security Studies" },
			{ id: "social-work", label: "Social Work" },
			{ id: "demography", label: "Demography & Social Statistics" },
		],
	},
	{
		id: "management",
		label: "Management & Business",
		departments: [
			{ id: "business-administration", label: "Business Administration" },
			{ id: "accounting", label: "Accounting" },
			{ id: "banking-finance", label: "Banking & Finance" },
			{ id: "marketing", label: "Marketing" },
			{ id: "insurance", label: "Insurance" },
			{ id: "entrepreneurship", label: "Entrepreneurship" },
			{ id: "human-resource-management", label: "Human Resource Management" },
			{ id: "public-administration", label: "Public Administration" },
			{ id: "transport-management", label: "Transport Management" },
			{ id: "hospitality-tourism", label: "Hospitality & Tourism Management" },
		],
	},
	{
		id: "arts-humanities",
		label: "Arts & Humanities",
		departments: [
			{ id: "english-language", label: "English Language" },
			{ id: "english-literature", label: "English & Literary Studies" },
			{ id: "history-international-studies", label: "History & International Studies" },
			{ id: "philosophy", label: "Philosophy" },
			{ id: "linguistics", label: "Linguistics" },
			{ id: "theatre-arts", label: "Theatre Arts" },
			{ id: "music", label: "Music" },
			{ id: "fine-applied-arts", label: "Fine & Applied Arts" },
			{ id: "religious-studies", label: "Religious Studies" },
			{ id: "foreign-languages", label: "Foreign Languages" },
		],
	},
	{
		id: "communication-education-law",
		label: "Communication, Education & Law",
		departments: [
			{ id: "mass-communication", label: "Mass Communication" },
			{ id: "education", label: "Education" },
			{ id: "guidance-counselling", label: "Guidance & Counselling" },
			{ id: "adult-education", label: "Adult Education" },
			{ id: "law", label: "Law" },
		],
	},
];

export const NIGERIA_PROGRAM_LEVELS: NigeriaDepartment[] = [
	{ id: "bsc", label: "BSc / Bachelor's" },
	{ id: "ba", label: "BA / Bachelor of Arts" },
	{ id: "beng", label: "BEng / Bachelor of Engineering" },
	{ id: "bed", label: "BEd / Bachelor of Education" },
	{ id: "llb", label: "LLB / Bachelor of Laws" },
	{ id: "btech", label: "BTech / Bachelor of Technology" },
	{ id: "hnd", label: "HND" },
	{ id: "nd", label: "ND / National Diploma" },
	{ id: "msc", label: "MSc / Master's" },
	{ id: "mba", label: "MBA" },
	{ id: "mphil", label: "MPhil" },
	{ id: "phd", label: "PhD / Doctorate" },
	{ id: "pgd", label: "PGD / Postgraduate Diploma" },
];

export const NIGERIA_DEPARTMENTS: NigeriaDepartment[] = NIGERIA_DEPARTMENT_GROUPS.flatMap(
	(group) => group.departments,
);

export function getDepartmentLabel(id: string): string {
	return NIGERIA_DEPARTMENTS.find((d) => d.id === id)?.label ?? id;
}

export function getProgramLevelLabel(id: string): string {
	return NIGERIA_PROGRAM_LEVELS.find((p) => p.id === id)?.label ?? id;
}

export function formatStudentProgram(departmentId: string, programLevelId: string): string {
	const department = getDepartmentLabel(departmentId);
	const level = getProgramLevelLabel(programLevelId);
	return `${department} (${level})`;
}
