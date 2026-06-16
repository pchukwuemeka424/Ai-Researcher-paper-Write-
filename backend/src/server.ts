import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import Fastify from "fastify";

import { connectMongo, disconnectMongo } from "./db/connect.js";
import { extractBearerToken, verifyAuthToken } from "./lib/auth-token.js";
import { createAppContext } from "./lib/app-context.js";
import { getRepoRoot } from "./lib/paths.js";
import { ensureSupportedNodeVersion } from "./system/node-version.js";
import { listOutputs } from "./server/outputs.js";
import { ChatService } from "./services/chat.service.js";
import { getUserById, loginUser, registerLecturer, registerStudent } from "./services/auth.service.js";
import {
	createUser,
	deleteUser,
	getDashboardStats,
	listRecentSessions,
	listUsers,
	updateUser,
} from "./services/dashboard.service.js";
import {
	deleteAllSavedResearch,
	deleteSavedResearch,
	getOutputArtifactContentOrRead,
	getSavedResearchById,
	listOutputArtifacts,
	listSavedResearch,
	saveResearchPaper,
	syncOutputArtifacts,
	updateSavedResearchById,
} from "./services/research.service.js";
import { listWorkflows } from "./services/workflows.js";
import { fetchPapersForQuery } from "./services/alphaxiv.service.js";
import { generateResearchOutline } from "./services/outline.service.js";
import {
	assertStudentHasTokenBalance,
	deductStudentTokens,
} from "./services/student-token.service.js";
import { generateCoursePresentation } from "./services/lesson-presentation.service.js";
import { generateCourseOutline } from "./services/lesson-planner.service.js";
import {
	deleteSavedCoursePlan,
	getSavedCoursePlan,
	listSavedCoursePlans,
	saveCoursePlan,
} from "./services/lesson-planner-save.service.js";
import {
	deleteAllSavedResearchIdeas,
	deleteSavedResearchIdea,
	listSavedResearchIdeas,
	saveResearchIdea,
	updateResearchIdeaStatus,
} from "./services/saved-research-idea.service.js";
import {
	deleteResearchIdeaSession,
	listResearchIdeaSessions,
	saveResearchIdeaSession,
} from "./services/research-session.service.js";
import {
	deleteSavedResearchOutline,
	listSavedResearchOutlines,
	saveResearchOutlineRecord,
} from "./services/saved-research-outline.service.js";
import {
	adminDeleteLecture,
	getLectureAdminStats,
	listAllLectures,
} from "./services/admin-lessons.service.js";
import {
	deleteAdminSession,
	getAdminSession,
	stopAdminSession,
} from "./services/admin-sessions.service.js";
import {
	getTokenAdminStats,
	listUsersTokenQuotas,
	bulkResetUserTokens,
	resetUserTokens,
	setUserTokensUsed,
} from "./services/admin-tokens.service.js";
import {
	bulkDeleteUsers,
	bulkUpdateUserStatus,
	createUser as adminCreateUser,
	deleteUser as adminDeleteUser,
	getDashboardStats as adminGetDashboardStats,
	listRecentSessions as adminListRecentSessions,
	listRecentSessionTopics as adminListRecentSessionTopics,
	listUsers as adminListUsers,
	resetUserPassword,
	updateUser as adminUpdateUser,
} from "./services/admin-users.service.js";
import { AdminRequiredError, requireAdmin } from "./lib/require-admin.js";
import {
	createDatabaseBackup,
	listBackupFiles,
	listBackupTables,
	readBackupFile,
} from "./services/admin-backup.service.js";
import { ensureDefaultAdmin } from "./services/bootstrap-admin.service.js";

async function resolveUserId(authorization?: string): Promise<string | null> {
	const token = extractBearerToken(authorization);
	if (!token) return null;
	const payload = verifyAuthToken(token);
	return payload?.sub ?? null;
}

function resolveUserIdFromWsUrl(urlPath: string | undefined): string | null {
	if (!urlPath) return null;
	try {
		const url = new URL(urlPath, "http://localhost");
		const token = url.searchParams.get("token");
		if (!token) return null;
		const payload = verifyAuthToken(token);
		return payload?.sub ?? null;
	} catch {
		return null;
	}
}

function resolveStaticRoot(repoRoot: string): string | null {
	const candidates = [
		resolve(repoRoot, "out"),
		resolve(repoRoot, "dist"),
	];
	for (const candidate of candidates) {
		if (existsSync(join(candidate, "index.html"))) {
			return candidate;
		}
	}
	return null;
}

function resolveStaticHtml(staticRoot: string, urlPath: string): string | null {
	const pathname = urlPath.split("?")[0]?.split("#")[0] ?? "/";
	const normalized =
		pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

	const candidates =
		normalized === "/"
			? [join(staticRoot, "index.html")]
			: [
					join(staticRoot, normalized.slice(1), "index.html"),
					join(staticRoot, `${normalized.slice(1)}.html`),
				];

	for (const candidate of candidates) {
		if (existsSync(candidate) && statSync(candidate).isFile()) {
			return candidate;
		}
	}
	return null;
}

export async function startServer(port: number): Promise<void> {
	ensureSupportedNodeVersion();
	await connectMongo();
	await ensureDefaultAdmin();

	const ctx = createAppContext();
	const chat = new ChatService(ctx);
	const repoRoot = getRepoRoot();
	const staticRoot = resolveStaticRoot(repoRoot);
	const workflows = listWorkflows(ctx.backendRoot);

	const app = Fastify({ logger: false });

	await app.register(cors, {
		origin: true,
		methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	});
	await app.register(websocket);

	if (staticRoot) {
		await app.register(fastifyStatic, {
			root: staticRoot,
			prefix: "/",
			decorateReply: false,
		});
	}

	app.get("/api/health", async () => ({ ok: true, version: ctx.version }));

	app.post("/api/auth/register", async (request, reply) => {
		const body = request.body as {
			name?: string;
			email?: string;
			password?: string;
			department?: string;
			institution?: string;
		};
		if (!body.name?.trim() || !body.email?.trim() || !body.password || !body.department?.trim()) {
			return reply.code(400).send({ error: "Name, email, password, and department are required." });
		}
		try {
			const result = await registerLecturer({
				name: body.name,
				email: body.email,
				password: body.password,
				department: body.department,
				institution: body.institution,
			});
			return result;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(400).send({ error: message });
		}
	});

	app.post("/api/auth/register-student", async (request, reply) => {
		const body = request.body as {
			name?: string;
			email?: string;
			password?: string;
			department?: string;
			institution?: string;
		};
		if (!body.name?.trim() || !body.email?.trim() || !body.password || !body.department?.trim()) {
			return reply.code(400).send({ error: "Name, email, password, and program are required." });
		}
		try {
			const result = await registerStudent({
				name: body.name,
				email: body.email,
				password: body.password,
				department: body.department,
				institution: body.institution,
			});
			return result;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(400).send({ error: message });
		}
	});

	app.post("/api/auth/login", async (request, reply) => {
		const body = request.body as { email?: string; password?: string };
		if (!body.email?.trim() || !body.password) {
			return reply.code(400).send({ error: "Email and password are required." });
		}
		try {
			const result = await loginUser({ email: body.email, password: body.password });
			return result;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(401).send({ error: message });
		}
	});

	app.get("/api/auth/me", async (request, reply) => {
		const token = extractBearerToken(request.headers.authorization);
		if (!token) return reply.code(401).send({ error: "Authentication required." });

		const payload = verifyAuthToken(token);
		if (!payload) return reply.code(401).send({ error: "Invalid or expired session." });

		const user = await getUserById(payload.sub);
		if (!user) return reply.code(401).send({ error: "User not found." });
		return { user };
	});

	app.get("/api/workflows", async () => ({
		workflows: workflows.map((w) => ({
			name: w.name,
			description: w.description,
			args: w.args,
			command: w.command,
		})),
	}));

	app.get("/api/papers/search", async (request, reply) => {
		const query = (request.query as { q?: string }).q?.trim();
		if (!query) {
			return reply.code(400).send({ error: "Query parameter q is required." });
		}

		try {
			const limitRaw = (request.query as { limit?: string }).limit;
			const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
			const papers = await fetchPapersForQuery(query, {
				limit: Number.isFinite(limit) ? limit : undefined,
			});
			return { query, papers };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(502).send({ error: message });
		}
	});

	app.post("/api/research/outline", async (request, reply) => {
		const body = request.body as {
			idea?: {
				id?: string;
				title?: string;
				rationale?: string;
				approach?: string;
				type?: string;
				feasibility?: string;
			};
			discipline?: string;
			disciplineLabel?: string;
			topic?: string;
			scope?: string;
		};

		if (!body.idea?.title?.trim()) {
			return reply.code(400).send({ error: "idea.title is required." });
		}
		if (!body.disciplineLabel?.trim()) {
			return reply.code(400).send({ error: "disciplineLabel is required." });
		}
		if (!body.topic?.trim()) {
			return reply.code(400).send({ error: "topic is required." });
		}

		const scope = body.scope?.trim();
		const validScopes = new Set(["undergraduate", "masters", "doctoral", "faculty"]);
		if (!scope || !validScopes.has(scope)) {
			return reply.code(400).send({ error: "scope must be undergraduate, masters, doctoral, or faculty." });
		}

		const ideaId = body.idea.id?.trim() || body.idea.title.trim();

		try {
			const userId = await resolveUserId(request.headers.authorization);
			if (userId) {
				await assertStudentHasTokenBalance(userId);
			}

			const result = await generateResearchOutline({
				idea: {
					title: body.idea.title.trim(),
					rationale: body.idea.rationale?.trim() ?? "",
					approach: body.idea.approach?.trim() ?? "",
					type: body.idea.type?.trim() ?? "empirical",
					feasibility: body.idea.feasibility?.trim() ?? "medium",
				},
				disciplineLabel: body.disciplineLabel.trim(),
				topic: body.topic.trim(),
				scope: scope as "undergraduate" | "masters" | "doctoral" | "faculty",
			});

			let tokenQuota;
			if (userId && result.usage?.totalTokens) {
				tokenQuota = await deductStudentTokens(userId, result.usage.totalTokens);
			}

			if (userId) {
				await saveResearchOutlineRecord(userId, {
					ideaId,
					ideaTitle: body.idea.title.trim(),
					discipline: body.discipline?.trim() || body.disciplineLabel.trim(),
					topic: body.topic.trim(),
					scope: scope as "undergraduate" | "masters" | "doctoral" | "faculty",
					outline: result.outline,
				});
			}

			return {
				outline: result.outline,
				papers: result.papers,
				...(tokenQuota ? { tokenQuota } : {}),
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(502).send({ error: message });
		}
	});

	app.post("/api/lesson-planner/generate", async (request, reply) => {
		const body = request.body as {
			title?: string;
			department?: string;
			departmentLabel?: string;
			level?: string;
		};

		if (!body.title?.trim()) {
			return reply.code(400).send({ error: "title is required." });
		}
		if (!body.department?.trim() || !body.departmentLabel?.trim()) {
			return reply.code(400).send({ error: "department is required." });
		}

		const validLevels = new Set([
			"foundation",
			"undergraduate-l1",
			"undergraduate-l2",
			"undergraduate-l3",
			"postgraduate",
			"professional",
		]);
		const level = body.level?.trim();
		if (!level || !validLevels.has(level)) {
			return reply.code(400).send({ error: "Invalid teaching level." });
		}

		try {
			const result = await generateCourseOutline({
				title: body.title.trim(),
				departmentLabel: body.departmentLabel.trim(),
				level: level as "foundation" | "undergraduate-l1" | "undergraduate-l2" | "undergraduate-l3" | "postgraduate" | "professional",
			});
			return { outline: result.outline, plan: result.outline };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(502).send({ error: message });
		}
	});

	app.post("/api/lesson-planner/presentation", async (request, reply) => {
		const body = request.body as {
			title?: string;
			department?: string;
			departmentLabel?: string;
			level?: string;
			outline?: string;
		};

		if (!body.title?.trim()) {
			return reply.code(400).send({ error: "title is required." });
		}
		if (!body.department?.trim() || !body.departmentLabel?.trim()) {
			return reply.code(400).send({ error: "department is required." });
		}
		if (!body.outline?.trim()) {
			return reply.code(400).send({ error: "outline is required." });
		}

		const validLevels = new Set([
			"foundation",
			"undergraduate-l1",
			"undergraduate-l2",
			"undergraduate-l3",
			"postgraduate",
			"professional",
		]);
		const level = body.level?.trim();
		if (!level || !validLevels.has(level)) {
			return reply.code(400).send({ error: "Invalid teaching level." });
		}

		try {
			const presentation = await generateCoursePresentation({
				title: body.title.trim(),
				departmentLabel: body.departmentLabel.trim(),
				level: level as "foundation" | "undergraduate-l1" | "undergraduate-l2" | "undergraduate-l3" | "postgraduate" | "professional",
				outline: body.outline.trim(),
			});
			return { presentation };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(502).send({ error: message });
		}
	});

	app.get("/api/lesson-planner/saved", async (request) => {
		const userId = await resolveUserId(request.headers.authorization);
		const plans = await listSavedCoursePlans(userId);
		return { plans };
	});

	app.get<{ Params: { id: string } }>("/api/lesson-planner/saved/:id", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		const plan = await getSavedCoursePlan(request.params.id, userId);
		if (!plan) {
			return reply.code(404).send({ error: "Saved course plan not found." });
		}
		return { plan };
	});

	app.post("/api/lesson-planner/saved", async (request, reply) => {
		const body = request.body as {
			id?: string;
			title?: string;
			department?: string;
			level?: string;
			outline?: string;
			presentation?: unknown;
		};

		if (!body.title?.trim() || !body.department?.trim() || !body.level?.trim() || !body.outline?.trim()) {
			return reply.code(400).send({ error: "Title, department, level, and outline are required." });
		}

		try {
			const userId = await resolveUserId(request.headers.authorization);
			const plan = await saveCoursePlan({
				userId,
				id: body.id?.trim() || null,
				title: body.title.trim(),
				department: body.department.trim(),
				level: body.level.trim(),
				outline: body.outline.trim(),
				presentation: body.presentation ?? null,
			});
			return { plan };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const status = message.includes("permission") || message.includes("Sign in") ? 403 : 502;
			return reply.code(status).send({ error: message });
		}
	});

	app.delete<{ Params: { id: string } }>("/api/lesson-planner/saved/:id", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		const deleted = await deleteSavedCoursePlan(request.params.id, userId);
		if (!deleted) {
			const status = userId ? 404 : 403;
			return reply.code(status).send({
				error:
					status === 403
						? "Sign in to remove course plans saved to your account."
						: "Saved course plan not found.",
			});
		}
		return { ok: true };
	});

	app.get("/api/status", async () => chat.getStatus());

	app.get("/api/outputs", async () => {
		await syncOutputArtifacts(ctx.workingDir);
		const outputs = await listOutputArtifacts();
		return {
			outputs: outputs.length > 0 ? outputs : listOutputs(ctx.workingDir),
			source: outputs.length > 0 ? "database" : "disk",
		};
	});

	app.get<{ Params: { "*": string } }>("/api/outputs/*", async (request, reply) => {
		const rel = request.params["*"];
		try {
			const decoded = decodeURIComponent(rel);
			const result = await getOutputArtifactContentOrRead(ctx.workingDir, decoded);
			return { content: result.content, path: result.path, source: result.source };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(400).send({ error: message });
		}
	});

	app.get("/api/research/saved", async (request) => {
		const userId = await resolveUserId(request.headers.authorization);
		const papers = await listSavedResearch(userId);
		return { papers };
	});

	app.get<{ Params: { id: string } }>("/api/research/saved/:id", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		const paper = await getSavedResearchById(request.params.id, userId);
		if (!paper) {
			return reply.code(404).send({ error: "Saved research not found." });
		}
		return { paper };
	});

	app.patch<{ Params: { id: string } }>("/api/research/saved/:id", async (request, reply) => {
		const body = request.body as { topic?: string; content?: string };
		if (!body.topic?.trim() && !body.content?.trim()) {
			return reply.code(400).send({ error: "Topic or content is required." });
		}
		try {
			const userId = await resolveUserId(request.headers.authorization);
			const paper = await updateSavedResearchById(request.params.id, body, userId);
			if (!paper) {
				return reply.code(404).send({ error: "Saved research not found." });
			}
			return { paper };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(400).send({ error: message });
		}
	});

	app.post("/api/research/saved", async (request, reply) => {
		const body = request.body as {
			topic?: string;
			content?: string;
			sessionId?: string;
			workflow?: string;
			tokenUsage?: {
				promptTokens?: number;
				completionTokens?: number;
				totalTokens?: number;
			};
		};
		if (!body.topic?.trim() || !body.content?.trim()) {
			return reply.code(400).send({ error: "Topic and content are required." });
		}
		try {
			const userId = await resolveUserId(request.headers.authorization);
			const tokenUsage =
				body.tokenUsage &&
				typeof body.tokenUsage.promptTokens === "number" &&
				typeof body.tokenUsage.completionTokens === "number" &&
				typeof body.tokenUsage.totalTokens === "number"
					? {
							promptTokens: body.tokenUsage.promptTokens,
							completionTokens: body.tokenUsage.completionTokens,
							totalTokens: body.tokenUsage.totalTokens,
						}
					: undefined;

			const paper = await saveResearchPaper({
				userId,
				sessionId: body.sessionId,
				topic: body.topic,
				content: body.content,
				workflow: body.workflow,
				tokenUsage,
			});
			return { paper };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(400).send({ error: message });
		}
	});

	app.delete("/api/research/saved", async (request) => {
		const userId = await resolveUserId(request.headers.authorization);
		const deleted = await deleteAllSavedResearch(userId);
		return { ok: true, deleted };
	});

	app.delete<{ Params: { id: string } }>("/api/research/saved/:id", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		const deleted = await deleteSavedResearch(request.params.id, userId);
		if (!deleted) {
			const status = userId ? 404 : 403;
			return reply
				.code(status)
				.send({
					error:
						status === 403
							? "Sign in to remove research saved to your account."
							: "Saved research not found.",
				});
		}
		return { ok: true };
	});

	app.get("/api/research/ideas/saved", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		if (!userId) return reply.code(401).send({ error: "Authentication required." });
		const ideas = await listSavedResearchIdeas(userId);
		return { ideas };
	});

	app.post("/api/research/ideas/saved", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		if (!userId) return reply.code(401).send({ error: "Authentication required." });

		const body = request.body as {
			ideaId?: string;
			title?: string;
			rationale?: string;
			approach?: string;
			type?: string;
			feasibility?: string;
			discipline?: string;
			topic?: string;
			status?: "saved" | "in_progress" | "completed";
		};

		if (
			!body.ideaId?.trim() ||
			!body.title?.trim() ||
			!body.rationale?.trim() ||
			!body.approach?.trim() ||
			!body.type?.trim() ||
			!body.feasibility?.trim() ||
			!body.discipline?.trim() ||
			!body.topic?.trim()
		) {
			return reply.code(400).send({ error: "All idea fields are required." });
		}

		try {
			const idea = await saveResearchIdea(userId, {
				ideaId: body.ideaId,
				title: body.title,
				rationale: body.rationale,
				approach: body.approach,
				type: body.type,
				feasibility: body.feasibility,
				discipline: body.discipline,
				topic: body.topic,
				status: body.status,
			});
			return { idea };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(400).send({ error: message });
		}
	});

	app.patch<{ Params: { id: string } }>("/api/research/ideas/saved/:id", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		if (!userId) return reply.code(401).send({ error: "Authentication required." });

		const body = request.body as { status?: "saved" | "in_progress" | "completed" };
		if (!body.status || !["saved", "in_progress", "completed"].includes(body.status)) {
			return reply.code(400).send({ error: "Valid status is required." });
		}

		const idea = await updateResearchIdeaStatus(request.params.id, userId, body.status);
		if (!idea) return reply.code(404).send({ error: "Saved idea not found." });
		return { idea };
	});

	app.delete("/api/research/ideas/saved", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		if (!userId) return reply.code(401).send({ error: "Authentication required." });
		const deleted = await deleteAllSavedResearchIdeas(userId);
		return { ok: true, deleted };
	});

	app.delete<{ Params: { id: string } }>("/api/research/ideas/saved/:id", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		if (!userId) return reply.code(401).send({ error: "Authentication required." });
		const deleted = await deleteSavedResearchIdea(request.params.id, userId);
		if (!deleted) return reply.code(404).send({ error: "Saved idea not found." });
		return { ok: true };
	});

	app.get("/api/research/sessions", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		if (!userId) return reply.code(401).send({ error: "Authentication required." });
		const sessions = await listResearchIdeaSessions(userId);
		return { sessions };
	});

	app.post("/api/research/sessions", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		if (!userId) return reply.code(401).send({ error: "Authentication required." });

		const body = request.body as {
			discipline?: string;
			topic?: string;
			scope?: string;
			ideas?: Array<{
				id?: string;
				title?: string;
				rationale?: string;
				approach?: string;
				type?: string;
				feasibility?: string;
			}>;
		};

		if (!body.discipline?.trim() || !body.topic?.trim() || !body.ideas?.length) {
			return reply.code(400).send({ error: "discipline, topic, and ideas are required." });
		}

		const validScopes = new Set(["undergraduate", "masters", "doctoral", "faculty"]);
		const scope = body.scope?.trim();
		if (!scope || !validScopes.has(scope)) {
			return reply.code(400).send({ error: "Valid scope is required." });
		}

		const ideas = body.ideas
			.filter((idea) => idea.id?.trim() && idea.title?.trim())
			.map((idea) => ({
				id: idea.id!.trim(),
				title: idea.title!.trim(),
				rationale: idea.rationale?.trim() ?? "",
				approach: idea.approach?.trim() ?? "",
				type: idea.type?.trim() ?? "empirical",
				feasibility: idea.feasibility?.trim() ?? "medium",
			}));

		if (!ideas.length) {
			return reply.code(400).send({ error: "At least one valid idea is required." });
		}

		try {
			const session = await saveResearchIdeaSession(userId, {
				discipline: body.discipline,
				topic: body.topic,
				scope: scope as "undergraduate" | "masters" | "doctoral" | "faculty",
				ideas,
			});
			return { session };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(400).send({ error: message });
		}
	});

	app.delete<{ Params: { id: string } }>("/api/research/sessions/:id", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		if (!userId) return reply.code(401).send({ error: "Authentication required." });
		const deleted = await deleteResearchIdeaSession(request.params.id, userId);
		if (!deleted) return reply.code(404).send({ error: "Session not found." });
		return { ok: true };
	});

	app.get("/api/research/outlines/saved", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		if (!userId) return reply.code(401).send({ error: "Authentication required." });
		const outlines = await listSavedResearchOutlines(userId);
		return { outlines };
	});

	app.delete<{ Params: { id: string } }>("/api/research/outlines/saved/:id", async (request, reply) => {
		const userId = await resolveUserId(request.headers.authorization);
		if (!userId) return reply.code(401).send({ error: "Authentication required." });
		const deleted = await deleteSavedResearchOutline(request.params.id, userId);
		if (!deleted) return reply.code(404).send({ error: "Outline not found." });
		return { ok: true };
	});

	app.post("/api/research/outputs/sync", async () => {
		const synced = await syncOutputArtifacts(ctx.workingDir);
		const outputs = await listOutputArtifacts();
		return { synced, outputs };
	});

	app.post("/api/session/reset", async (request) => {
		const body = request.body as { workflow?: string; topic?: string; prompt?: string };
		await chat.resetSession(body);
		return { ok: true, status: chat.getStatus() };
	});

	app.post("/api/chat/abort", async () => {
		await chat.abort();
		return { ok: true };
	});

	app.get("/api/sessions/:id/messages", async (request, reply) => {
		const { id } = request.params as { id: string };
		try {
			const messages = await chat.getSessionMessages(id);
			return { messages };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(400).send({ error: message });
		}
	});

	app.get("/api/dashboard/stats", async () => getDashboardStats());

	app.get("/api/dashboard/sessions", async () => ({
		sessions: await listRecentSessions(),
	}));

	app.get("/api/users", async () => ({ users: await listUsers() }));

	app.post("/api/users", async (request, reply) => {
		const body = request.body as { name?: string; email?: string; role?: string; status?: string };
		if (!body.name?.trim() || !body.email?.trim()) {
			return reply.code(400).send({ error: "Name and email are required." });
		}
		try {
			const user = await createUser({
				name: body.name,
				email: body.email,
				role: body.role,
				status: body.status,
			});
			return { user };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(400).send({ error: message });
		}
	});

	app.patch<{ Params: { id: string } }>("/api/users/:id", async (request, reply) => {
		const body = request.body as Partial<{ name: string; email: string; role: string; status: string }>;
		try {
			const user = await updateUser(request.params.id, body);
			if (!user) return reply.code(404).send({ error: "User not found." });
			return { user };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(400).send({ error: message });
		}
	});

	app.delete<{ Params: { id: string } }>("/api/users/:id", async (request, reply) => {
		const deleted = await deleteUser(request.params.id);
		if (!deleted) return reply.code(404).send({ error: "User not found." });
		return { ok: true };
	});

	app.get("/api/admin/stats", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			return { stats: await adminGetDashboardStats() };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.get<{ Querystring: { limit?: string } }>("/api/admin/sessions/recent-topics", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const limit = Number.parseInt(request.query.limit ?? "8", 10);
			const sessions = await adminListRecentSessionTopics(Number.isFinite(limit) ? limit : 8);
			return { sessions };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.get<{ Querystring: { limit?: string } }>("/api/admin/sessions", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const limit = Number.parseInt(request.query.limit ?? "50", 10);
			const sessions = await adminListRecentSessions(Number.isFinite(limit) ? limit : 50);
			return { sessions };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.get<{ Params: { id: string } }>("/api/admin/sessions/:id", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const session = await getAdminSession(request.params.id);
			if (!session) return reply.code(404).send({ error: "Session not found." });
			return { session };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.post<{ Params: { id: string } }>("/api/admin/sessions/:id/stop", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const session = await stopAdminSession(request.params.id);
			if (!session) return reply.code(404).send({ error: "Session not found." });
			return { session };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.delete<{ Params: { id: string } }>("/api/admin/sessions/:id", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const deleted = await deleteAdminSession(request.params.id);
			if (!deleted) return reply.code(404).send({ error: "Session not found." });
			return { ok: true };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.get("/api/admin/users", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			return { users: await adminListUsers() };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.post("/api/admin/users", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const body = request.body as {
				name?: string;
				email?: string;
				role?: string;
				status?: string;
				department?: string;
				institution?: string;
				password?: string;
			};
			if (!body.name?.trim() || !body.email?.trim()) {
				return reply.code(400).send({ error: "Name and email are required." });
			}
			const user = await adminCreateUser({
				name: body.name,
				email: body.email,
				role: body.role,
				status: body.status,
				department: body.department,
				institution: body.institution,
				password: body.password,
			});
			return { user };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(400).send({ error: message });
		}
	});

	app.patch<{ Params: { id: string } }>("/api/admin/users/:id", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const body = request.body as Partial<{
				name: string;
				email: string;
				role: string;
				status: string;
				department: string;
				institution: string;
			}>;
			const user = await adminUpdateUser(request.params.id, body);
			if (!user) return reply.code(404).send({ error: "User not found." });
			return { user };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(400).send({ error: message });
		}
	});

	app.delete<{ Params: { id: string } }>("/api/admin/users/:id", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const deleted = await adminDeleteUser(request.params.id);
			if (!deleted) return reply.code(404).send({ error: "User not found." });
			return { ok: true };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.post<{ Params: { id: string } }>("/api/admin/users/:id/reset-password", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const body = request.body as { password?: string };
			if (!body.password?.trim()) {
				return reply.code(400).send({ error: "Password is required." });
			}
			const user = await resetUserPassword(request.params.id, body.password);
			if (!user) return reply.code(404).send({ error: "User not found." });
			return { user };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(400).send({ error: message });
		}
	});

	app.post("/api/admin/users/bulk-status", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const body = request.body as { ids?: string[]; status?: "active" | "inactive" };
			if (!body.ids?.length || !body.status) {
				return reply.code(400).send({ error: "ids and status are required." });
			}
			return await bulkUpdateUserStatus(body.ids, body.status);
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.post("/api/admin/users/bulk-delete", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const body = request.body as { ids?: string[] };
			if (!body.ids?.length) {
				return reply.code(400).send({ error: "ids are required." });
			}
			return await bulkDeleteUsers(body.ids);
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.get("/api/admin/lectures", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const [lectures, stats] = await Promise.all([listAllLectures(), getLectureAdminStats()]);
			return { lectures, stats };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.delete<{ Params: { id: string } }>("/api/admin/lectures/:id", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const deleted = await adminDeleteLecture(request.params.id);
			if (!deleted) return reply.code(404).send({ error: "Lecture not found." });
			return { ok: true };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.get("/api/admin/tokens", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const [users, stats] = await Promise.all([listUsersTokenQuotas(), getTokenAdminStats()]);
			return { users, stats };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.post("/api/admin/tokens/bulk-reset", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const body = request.body as { ids?: string[] };
			if (!body.ids?.length) {
				return reply.code(400).send({ error: "ids are required." });
			}
			return await bulkResetUserTokens(body.ids);
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.patch<{ Params: { id: string } }>("/api/admin/tokens/:id", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const body = request.body as { reset?: boolean; tokensUsed?: number };
			let record;
			if (body.reset) {
				record = await resetUserTokens(request.params.id);
			} else if (body.tokensUsed !== undefined) {
				record = await setUserTokensUsed(request.params.id, body.tokensUsed);
			} else {
				return reply.code(400).send({ error: "Provide reset: true or tokensUsed." });
			}
			if (!record) return reply.code(404).send({ error: "User not found." });
			return { user: record };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.get("/api/admin/backup/tables", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const tables = await listBackupTables();
			return { tables };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.get("/api/admin/backup/files", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			return { files: listBackupFiles() };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.post("/api/admin/backup", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const file = await createDatabaseBackup();
			return { file };
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			return reply.code(500).send({ error: message });
		}
	});

	app.get<{ Params: { filename: string } }>("/api/admin/backup/files/:filename", async (request, reply) => {
		try {
			await requireAdmin(request.headers.authorization);
			const { content, size } = readBackupFile(request.params.filename);
			return reply
				.header("Content-Type", "application/json; charset=utf-8")
				.header("Content-Disposition", `attachment; filename="${request.params.filename}"`)
				.header("Content-Length", String(size))
				.send(content);
		} catch (error) {
			if (error instanceof AdminRequiredError) {
				return reply.code(error.statusCode).send({ error: error.message });
			}
			const message = error instanceof Error ? error.message : String(error);
			const status = message.includes("not found") || message.includes("Invalid") ? 404 : 500;
			return reply.code(status).send({ error: message });
		}
	});

	app.register(async (scoped) => {
		scoped.get("/ws", { websocket: true }, (socket, request) => {
			const socketUserId = resolveUserIdFromWsUrl(request.url);

			const send = (payload: Record<string, unknown>) => {
				if (socket.readyState === socket.OPEN) {
					socket.send(JSON.stringify(payload));
				}
			};

			const unsubscribe = chat.subscribe(send);

			send({
				type: "connected",
				status: chat.getStatus(),
				workflows: workflows.map((w) => ({
					name: w.name,
					description: w.description,
					command: w.command,
				})),
			});

			socket.on("message", async (raw: Buffer | ArrayBuffer | Buffer[]) => {
				try {
					const data = JSON.parse(String(raw)) as {
						type?: string;
						message?: string;
						workflow?: string;
						topic?: string;
					};

					if (data.type === "reset") {
						await chat.resetSession({
							workflow: data.workflow,
							topic: data.topic,
							prompt: data.message,
							userId: socketUserId ?? undefined,
						});
						send({ type: "reset_complete", status: chat.getStatus() });
						return;
					}

					if (data.type === "abort") {
						await chat.abort();
						send({ type: "aborted" });
						return;
					}

					if (data.type === "prompt" && data.message) {
						await chat.sendMessage(data.message, socketUserId ?? undefined);
						send({ type: "prompt_complete" });
						return;
					}

					send({ type: "error", error: "Unknown message type." });
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					send({ type: "error", error: message });
				}
			});

			socket.on("close", () => unsubscribe());
		});
	});

	if (staticRoot) {
		app.setNotFoundHandler(async (request, reply) => {
			if (request.url.startsWith("/api/") || request.url.startsWith("/ws")) {
				return reply.code(404).send({ error: "Not found" });
			}

			const htmlPath = resolveStaticHtml(staticRoot, request.url);
			if (htmlPath) {
				return reply.type("text/html; charset=utf-8").send(readFileSync(htmlPath));
			}

			return reply.code(404).send({ error: "Not found" });
		});
	}

	await app.listen({ port, host: "0.0.0.0" });
	console.log(`Feynman web UI: http://localhost:${port}`);
	if (!staticRoot) {
		console.log("Frontend not built. Run: npm run build:web");
	}

	const shutdown = async () => {
		await chat.abort();
		await app.close();
		await disconnectMongo();
	};

	process.on("SIGINT", () => void shutdown().then(() => process.exit(0)));
	process.on("SIGTERM", () => void shutdown().then(() => process.exit(0)));
}
