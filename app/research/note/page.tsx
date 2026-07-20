import { ResearchNotePage } from "@/components/research/ResearchNotePage";

export const metadata = {
	title: "Research Note",
	description: "Research notebook: notes, data, lab log, and AI drafts.",
};

export default function ResearchNoteRoutePage() {
	return <ResearchNotePage variant="lecturer" />;
}
