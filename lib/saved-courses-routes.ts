export const SAVED_COURSES_PAGE_PATH = "/lesson-planner/saved";

export function savedCourseOutlinePath(id: string): string {
	return `/lesson-planner?saved=${encodeURIComponent(id)}`;
}

export function savedCoursePresentationPath(id: string): string {
	return `/lesson-planner/presentation?saved=${encodeURIComponent(id)}`;
}
