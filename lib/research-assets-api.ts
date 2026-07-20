import { apiUrl } from "@/lib/api";
import { authHeaders } from "@/lib/auth";
import type { ResearchProjectType } from "@/lib/research-project-types";

export type ResearchDataset = {
	id: string;
	title: string;
	description: string;
	discipline: string;
	format: string;
	year: string;
	license: string;
	accessUrl: string;
	sizeLabel: string;
	tags: string[];
	visibility: "private" | "shared";
	hasFile: boolean;
	fileName: string;
	createdAt: string;
	updatedAt: string;
};

export type AttachmentPayload = {
	name: string;
	mime: string;
	data: string;
};

export type ResearchSourceSelection = {
	documentIds: string[];
	datasetIds: string[];
	noteIds: string[];
	/** Research Note workspace projects (notebook + linked assets). */
	projectIds?: string[];
};

async function parseError(res: Response, fallback: string): Promise<string> {
	try {
		const data = (await res.json()) as { error?: string };
		if (data.error?.trim()) return data.error;
	} catch {
		/* ignore */
	}
	return fallback;
}

function parseTagsText(tagsText: string): string[] {
	return tagsText
		.split(",")
		.map((t) => t.trim())
		.filter(Boolean)
		.slice(0, 20);
}

export function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") resolve(reader.result);
			else reject(new Error("Could not read file."));
		};
		reader.onerror = () => reject(new Error("Could not read file."));
		reader.readAsDataURL(file);
	});
}

export function downloadDataUrl(dataUrl: string, fileName: string): void {
	const a = document.createElement("a");
	a.href = dataUrl;
	a.download = fileName;
	a.rel = "noopener";
	document.body.appendChild(a);
	a.click();
	a.remove();
}

export async function fetchDatasets(): Promise<ResearchDataset[]> {
	const res = await fetch(apiUrl("/api/research/datasets"), { headers: authHeaders() });
	if (res.status === 401) throw new Error("Sign in to view your datasets.");
	if (!res.ok) throw new Error(await parseError(res, "Could not load datasets."));
	const data = (await res.json()) as { datasets?: ResearchDataset[] };
	return data.datasets ?? [];
}

export async function createDataset(input: {
	title: string;
	description: string;
	discipline: string;
	format: string;
	year: string;
	license: string;
	accessUrl: string;
	sizeLabel: string;
	tagsText: string;
	visibility: "private" | "shared";
	projectId?: string;
	fileName?: string;
	fileMime?: string;
	fileData?: string;
}): Promise<ResearchDataset> {
	const res = await fetch(apiUrl("/api/research/datasets"), {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify({
			title: input.title,
			description: input.description,
			discipline: input.discipline,
			format: input.format,
			year: input.year,
			license: input.license,
			accessUrl: input.accessUrl,
			sizeLabel: input.sizeLabel,
			tags: parseTagsText(input.tagsText),
			visibility: input.visibility,
			projectId: input.projectId,
			fileName: input.fileName,
			fileMime: input.fileMime,
			fileData: input.fileData,
		}),
	});
	if (!res.ok) throw new Error(await parseError(res, "Could not save dataset."));
	const data = (await res.json()) as { dataset?: ResearchDataset };
	if (!data.dataset) throw new Error("Could not save dataset.");
	return data.dataset;
}

export async function fetchDataset(id: string): Promise<ResearchDataset> {
	const res = await fetch(apiUrl(`/api/research/datasets/${encodeURIComponent(id)}`), {
		headers: authHeaders(),
	});
	if (res.status === 401) throw new Error("Sign in to view this dataset.");
	if (res.status === 404) throw new Error("Dataset not found.");
	if (!res.ok) throw new Error(await parseError(res, "Could not load dataset."));
	const data = (await res.json()) as { dataset?: ResearchDataset };
	if (!data.dataset) throw new Error("Dataset not found.");
	return data.dataset;
}

export async function fetchDatasetFile(id: string): Promise<AttachmentPayload | null> {
	const res = await fetch(apiUrl(`/api/research/datasets/${encodeURIComponent(id)}/file`), {
		headers: authHeaders(),
	});
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(await parseError(res, "Could not download file."));
	const data = (await res.json()) as { file?: AttachmentPayload };
	return data.file ?? null;
}

export async function deleteDataset(id: string): Promise<void> {
	const res = await fetch(apiUrl(`/api/research/datasets/${encodeURIComponent(id)}`), {
		method: "DELETE",
		headers: authHeaders(),
	});
	if (!res.ok) throw new Error(await parseError(res, "Could not remove dataset."));
}

export type GraphChartType = "bar" | "line" | "area" | "pie" | "scatter";

export type GraphExplanation = {
	summary: string;
	insights: string[];
	takeaways: string;
	caveats: string;
	generatedBy: "agent" | "heuristic";
};

export type GraphInstructionPlan = {
	goal: string;
	preferredChartType?: GraphChartType | null;
	xKeyHint?: string | null;
	yKeyHints?: string[];
	categoryHint?: string | null;
	valueHint?: string | null;
	filters?: string[];
	sortBy?: string | null;
	sortDirection?: "asc" | "desc" | null;
	limit?: number | null;
	aggregation?: "none" | "sum" | "avg" | "count" | null;
	titleHint?: string | null;
	notes?: string;
	interpretedBy: "agent" | "heuristic";
};

export type GraphAgentStep = {
	id: string;
	agent: string;
	status: "ok" | "skipped" | "fallback";
	detail: string;
};

export type GraphPlotResult = {
	chartType: GraphChartType;
	title: string;
	description: string;
	xKey: string;
	yKeys: string[];
	nameKey?: string;
	valueKey?: string;
	series: Array<Record<string, string | number>>;
	columns: string[];
	rowCount: number;
	usedAgent: boolean;
	datasetTitle: string;
	explanation: GraphExplanation;
	userPrompt?: string;
	instructionPlan?: GraphInstructionPlan | null;
	agentSteps?: GraphAgentStep[];
};

export async function plotDataset(
	id: string,
	input: { chartType: GraphChartType; prompt?: string },
): Promise<GraphPlotResult> {
	const res = await fetch(apiUrl(`/api/research/datasets/${encodeURIComponent(id)}/plot`), {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify(input),
	});
	if (!res.ok) throw new Error(await parseError(res, "Could not plot dataset."));
	const data = (await res.json()) as { plot?: GraphPlotResult };
	if (!data.plot) throw new Error("Could not plot dataset.");
	return data.plot;
}

export type ProjectStatus = "draft" | "in_progress" | "completed";

export type ResearchProjectSection = {
	id: string;
	title: string;
	content: string;
};

export type ResearchProject = {
	id: string;
	title: string;
	description: string;
	projectType: ResearchProjectType;
	sections: ResearchProjectSection[];
	status: ProjectStatus;
	favorite: boolean;
	progress: number;
	startedAt: string;
	createdAt: string;
	updatedAt: string;
	counts: {
		documents: number;
		datasets: number;
		notes: number;
		references: number;
	};
};

export type ResearchDocument = {
	id: string;
	title: string;
	fileName: string;
	fileMime: string;
	sizeLabel: string;
	kind: "doc" | "pdf" | "sheet" | "other";
	hasFile: boolean;
	createdAt: string;
	updatedAt: string;
};

export type ResearchNote = {
	id: string;
	title: string;
	content: string;
	createdAt: string;
	updatedAt: string;
};

export type ResearchReferenceItem = {
	id: string;
	title: string;
	citation: string;
	sourceUrl: string;
	createdAt: string;
	updatedAt: string;
};

export type ResearchActivity = {
	id: string;
	kind: "dataset" | "document" | "note" | "reference" | "project";
	label: string;
	at: string;
};

export type ResearchWorkspace = {
	project: ResearchProject;
	datasets: ResearchDataset[];
	documents: ResearchDocument[];
	notes: ResearchNote[];
	references: ResearchReferenceItem[];
	activity: ResearchActivity[];
};

export async function fetchWorkspace(projectId: string): Promise<ResearchWorkspace> {
	const res = await fetch(
		apiUrl(`/api/research/projects/${encodeURIComponent(projectId)}/workspace`),
		{ headers: authHeaders() },
	);
	if (res.status === 401) throw new Error("Sign in to view your research project.");
	if (!res.ok) throw new Error(await parseError(res, "Could not load project workspace."));
	return (await res.json()) as ResearchWorkspace;
}

export async function fetchProjects(): Promise<ResearchProject[]> {
	const res = await fetch(apiUrl("/api/research/projects"), { headers: authHeaders() });
	if (res.status === 401) throw new Error("Sign in to view your research folders.");
	if (!res.ok) throw new Error(await parseError(res, "Could not load research folders."));
	const data = (await res.json()) as { projects?: ResearchProject[] };
	return data.projects ?? [];
}

export async function createProject(input: {
	title: string;
	description?: string;
	projectType?: ResearchProjectType;
}): Promise<ResearchProject> {
	const res = await fetch(apiUrl("/api/research/projects"), {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify(input),
	});
	if (!res.ok) throw new Error(await parseError(res, "Could not create research folder."));
	const data = (await res.json()) as { project?: ResearchProject };
	if (!data.project) throw new Error("Could not create research folder.");
	return data.project;
}

export async function deleteProject(projectId: string): Promise<void> {
	const res = await fetch(apiUrl(`/api/research/projects/${encodeURIComponent(projectId)}`), {
		method: "DELETE",
		headers: authHeaders(),
	});
	if (!res.ok) throw new Error(await parseError(res, "Could not delete research folder."));
}

export async function fetchNotebook(projectId: string): Promise<{
	notebookData: unknown | null;
	updatedAt: string;
}> {
	const res = await fetch(
		apiUrl(`/api/research/projects/${encodeURIComponent(projectId)}/notebook`),
		{ headers: authHeaders() },
	);
	if (res.status === 401) throw new Error("Sign in to view your notebook.");
	if (!res.ok) throw new Error(await parseError(res, "Could not load notebook."));
	return (await res.json()) as { notebookData: unknown | null; updatedAt: string };
}

export async function saveNotebook(
	projectId: string,
	notebookData: unknown,
): Promise<{ updatedAt: string }> {
	const res = await fetch(
		apiUrl(`/api/research/projects/${encodeURIComponent(projectId)}/notebook`),
		{
			method: "PUT",
			headers: { "Content-Type": "application/json", ...authHeaders() },
			body: JSON.stringify({ notebookData }),
		},
	);
	if (!res.ok) throw new Error(await parseError(res, "Could not save notebook."));
	const data = (await res.json()) as { updatedAt?: string };
	return { updatedAt: data.updatedAt ?? new Date().toISOString() };
}

export async function updateProject(
	projectId: string,
	input: {
		title?: string;
		description?: string;
		status?: ProjectStatus;
		favorite?: boolean;
		projectType?: ResearchProjectType;
		sections?: Array<{ id: string; title?: string; content?: string }>;
	},
): Promise<ResearchProject> {
	const res = await fetch(apiUrl(`/api/research/projects/${encodeURIComponent(projectId)}`), {
		method: "PATCH",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify(input),
	});
	if (!res.ok) throw new Error(await parseError(res, "Could not update project."));
	const data = (await res.json()) as { project?: ResearchProject };
	if (!data.project) throw new Error("Could not update project.");
	return data.project;
}

export async function fetchDocuments(): Promise<ResearchDocument[]> {
	const res = await fetch(apiUrl("/api/research/documents"), { headers: authHeaders() });
	if (res.status === 401) throw new Error("Sign in to view your documents.");
	if (!res.ok) throw new Error(await parseError(res, "Could not load documents."));
	const data = (await res.json()) as { documents?: ResearchDocument[] };
	return data.documents ?? [];
}

export async function createDocument(input: {
	title: string;
	fileName: string;
	fileMime: string;
	fileData: string;
	sizeLabel?: string;
	projectId?: string;
}): Promise<ResearchDocument> {
	const res = await fetch(apiUrl("/api/research/documents"), {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify(input),
	});
	if (!res.ok) throw new Error(await parseError(res, "Could not upload document."));
	const data = (await res.json()) as { document?: ResearchDocument };
	if (!data.document) throw new Error("Could not upload document.");
	return data.document;
}

export async function fetchNotes(): Promise<ResearchNote[]> {
	const res = await fetch(apiUrl("/api/research/notes"), { headers: authHeaders() });
	if (res.status === 401) throw new Error("Sign in to view your findings.");
	if (!res.ok) throw new Error(await parseError(res, "Could not load findings."));
	const data = (await res.json()) as { notes?: ResearchNote[] };
	return data.notes ?? [];
}

export async function fetchDocumentFile(id: string): Promise<AttachmentPayload | null> {
	const res = await fetch(apiUrl(`/api/research/documents/${encodeURIComponent(id)}/file`), {
		headers: authHeaders(),
	});
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(await parseError(res, "Could not download document."));
	const data = (await res.json()) as { file?: AttachmentPayload };
	return data.file ?? null;
}

export async function deleteDocument(id: string): Promise<void> {
	const res = await fetch(apiUrl(`/api/research/documents/${encodeURIComponent(id)}`), {
		method: "DELETE",
		headers: authHeaders(),
	});
	if (!res.ok) throw new Error(await parseError(res, "Could not remove document."));
}

export async function createNote(input: {
	title: string;
	content: string;
	projectId?: string;
}): Promise<ResearchNote> {
	const res = await fetch(apiUrl("/api/research/notes"), {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify(input),
	});
	if (!res.ok) throw new Error(await parseError(res, "Could not save note."));
	const data = (await res.json()) as { note?: ResearchNote };
	if (!data.note) throw new Error("Could not save note.");
	return data.note;
}

export async function updateNote(
	id: string,
	input: { title?: string; content?: string },
): Promise<ResearchNote> {
	const res = await fetch(apiUrl(`/api/research/notes/${encodeURIComponent(id)}`), {
		method: "PATCH",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify(input),
	});
	if (!res.ok) throw new Error(await parseError(res, "Could not update note."));
	const data = (await res.json()) as { note?: ResearchNote };
	if (!data.note) throw new Error("Could not update note.");
	return data.note;
}

export async function deleteNote(id: string): Promise<void> {
	const res = await fetch(apiUrl(`/api/research/notes/${encodeURIComponent(id)}`), {
		method: "DELETE",
		headers: authHeaders(),
	});
	if (!res.ok) throw new Error(await parseError(res, "Could not remove note."));
}

export async function createReference(input: {
	title: string;
	citation: string;
	sourceUrl?: string;
	projectId?: string;
}): Promise<ResearchReferenceItem> {
	const res = await fetch(apiUrl("/api/research/references"), {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify(input),
	});
	if (!res.ok) throw new Error(await parseError(res, "Could not save reference."));
	const data = (await res.json()) as { reference?: ResearchReferenceItem };
	if (!data.reference) throw new Error("Could not save reference.");
	return data.reference;
}

export async function deleteReference(id: string): Promise<void> {
	const res = await fetch(apiUrl(`/api/research/references/${encodeURIComponent(id)}`), {
		method: "DELETE",
		headers: authHeaders(),
	});
	if (!res.ok) throw new Error(await parseError(res, "Could not remove reference."));
}

