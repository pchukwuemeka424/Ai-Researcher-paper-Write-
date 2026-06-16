# Ai-Researcher-paper-Write-

AI-powered academic research and paper writing platform built for Nigerian students and lecturers. Combines agentic AI workflows, real-time literature retrieval, and citation-verified writing in a governed university-grade platform.

---

## Overview

**TrustLed Aula** helps students and lecturers with every stage of academic research:

- Research idea generation and evaluation
- Structured research outline creation (grounded in real papers)
- Full research paper drafting with citation verification
- Literature reviews, thesis proposals, and study comparisons
- Lecture planning and course preparation
- Saved sessions and long-term research memory

Built for universities, colleges, polytechnics, and individual lecturers across Nigeria and beyond.

---

## How the Agentic AI Works

The platform is built around a stateful `ChatService` that orchestrates AI, tools, and data sources in a multi-step loop. Here is the pipeline for every research interaction:

```
User Message
     │
     ▼
1. Session Management
   └─ Creates or resumes a MongoDB session with a workflow-specific system prompt

     │
     ▼
2. Literature Retrieval (Automatic)
   └─ If the workflow requires it, the agent fetches real papers BEFORE calling the LLM:
      ├─ AlphaXiv  → searches recent academic preprints
      ├─ arXiv     → fallback export API for older literature
      └─ Tavily    → web search fallback when databases return no results

     │
     ▼
3. Context Injection
   └─ Retrieved paper abstracts and metadata are injected into the system prompt
      so the LLM writes grounded, source-backed responses only

     │
     ▼
4. LLM Streaming (OpenRouter)
   └─ Sends the enriched conversation history to the model
   └─ Streams token deltas in real-time over WebSocket to the frontend

     │
     ▼
5. Post-Processing
   ├─ Research paper references formatted and cleaned
   ├─ Full paper auto-saved to MongoDB (SavedResearch)
   └─ Token usage tracked and deducted from student quota

     │
     ▼
6. Agent Events (WebSocket)
   └─ Every phase emits typed events the frontend listens to:
      agent_start → tool_execution_start → tool_execution_end
      → message_update (delta) → message_end → token_usage → agent_end
```

All responses are non-hallucinated: the LLM is only permitted to cite papers that were fetched and injected at step 2.

---

## Research Workflows

Workflows are Markdown prompt files in `backend/prompts/`. Each defines a structured agentic protocol the AI follows step by step. The following workflows are available:

| Workflow | Command | Description |
|---|---|---|
| Research Paper | `/chat-paper` | Full paper draft with inline citations |
| Deep Research | `/deepresearch` | Multi-step investigation: plan → gather evidence → draft → cite → review → deliver |
| Literature Review | `/lit` | AI-synthesized review grounded in retrieved papers |
| Draft | `/draft` | Structured paper section drafting |
| Compare | `/compare` | Side-by-side study comparison with citations |
| Summarize | `/summarize` | Concise summary of a topic or paper |
| Review | `/review` | Critical academic review of existing work |
| Audit | `/audit` | Citation and source integrity audit |
| Auto Research | `/autoresearch` | Autonomous experiment loop: try → measure → keep → repeat |
| Watch | `/watch` | Monitor a topic for new developments |
| Log | `/log` | Session journaling and structured note-taking |
| Replicate | `/replicate` | Attempt to reproduce research findings |
| Recipe | `/recipe` | Step-by-step research methodology builder |
| Jobs | `/jobs` | Background task tracking |

### Deep Research Workflow in Detail

The `/deepresearch` workflow is the most advanced. It runs a 7-step agentic pipeline:

1. **Plan** — Creates a structured plan artifact with key questions, evidence needed, and a task ledger. Asks the user to confirm before proceeding.
2. **Scale** — Decides whether to use direct search (simple questions) or spawn parallel researcher subagents (broad, multi-faceted topics).
3. **Gather Evidence** — Searches using `web_search`, `fetch_content`, and paper databases. Researcher subagents run concurrently when used.
4. **Draft** — Synthesises all evidence into a structured report. No invented sources.
5. **Cite** — A verifier agent adds inline citations and verifies every URL.
6. **Review** — A reviewer agent checks for unsupported claims, logical gaps, and overconfident statements. FATAL issues are fixed before delivery.
7. **Deliver** — Final output and a provenance sidecar are written to `papers/<slug>.md` and `<slug>.provenance.md`.

---

## Outline Generation Pipeline

The outline generator runs its own agentic sub-pipeline before the LLM writes anything:

1. User provides: topic, discipline, research scope (undergraduate / masters / doctoral / faculty), and a selected research idea.
2. The system builds a combined search query from the topic, idea title, and discipline label.
3. Up to 8 real papers are fetched from AlphaXiv (with arXiv/Tavily fallback).
4. Paper abstracts are formatted and injected as context into the LLM prompt.
5. The LLM writes a structured Markdown outline grounded only in those papers.
6. ArXiv metadata (IDs, repository names, preprint labels) is stripped from the output.
7. A formatted "Sources for further reading" section is appended from the fetched paper list.

---

## Literature Sources

The platform retrieves live academic literature from three sources in priority order:

1. **AlphaXiv** — Primary source. Searches recent academic preprints via the AlphaXiv public API.
2. **arXiv** — Fallback. Uses the arXiv export API when AlphaXiv returns no results.
3. **Tavily** — Final fallback. Web search for topics not well-covered by preprint databases.

All three are configurable via environment variables and can be individually disabled.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | Fastify 5, TypeScript, Node.js |
| Database | MongoDB (via Mongoose) |
| AI Gateway | OpenRouter (supports GPT-5, Claude, and others) |
| Real-time | WebSocket (via `@fastify/websocket`) |
| Paper Search | AlphaXiv, arXiv export API, Tavily |
| Package managers | npm / pnpm |

---

## Prerequisites

- Node.js `>=20.19.0 <26`
- MongoDB running locally or via a remote URI

---

## Environment Variables

Copy `.env.example` to `.env` (root and/or `backend/.env`) and fill in values:

```env
OPENROUTER_API_KEY=           # Required — your OpenRouter API key
MONGODB_URI=mongodb://127.0.0.1:27017/feynman
PORT=3141
FEYNMAN_MODEL=openrouter/openai/gpt-5.1
AUTH_SECRET=change-me-in-production

# Optional: faster model for outline generation
# FEYNMAN_FAST_MODEL=openrouter/openai/gpt-4o-mini

# Optional: AlphaXiv paper search (enabled by default)
# ALPHAXIV_ENABLED=true
# ALPHAXIV_API_KEY=

# Optional: Tavily fallback search
# TAVILY_ENABLED=true
# TAVILY_API_KEY=

# Optional: default admin account
# DEFAULT_ADMIN_EMAIL=admin@aula.com
# DEFAULT_ADMIN_PASSWORD=admin123
```

Do not commit real secrets. `.env` and `backend/.env` are in `.gitignore`.

---

## Install

```bash
npm install
cd backend && npm install
```

---

## Run in Development

Start frontend:

```bash
npm run dev
```

Start backend (from repo root):

```bash
npm run dev:backend
```

Default local URLs:

- Frontend: http://localhost:3000
- Backend: http://127.0.0.1:3141

---

## Build

```bash
npm run build:all
```

## Start Production Build

```bash
npm run start
```

---

## Project Structure

```
.
├── app/                  # Next.js pages (App Router)
│   ├── research/         # Research paper and outline pages
│   ├── dashboard/        # Student and user dashboards
│   ├── lesson-planner/   # Lecturer course planning
│   └── admin/            # Admin panel
├── components/           # React UI components
├── lib/                  # Frontend utilities and API clients
├── hooks/                # React hooks (auth, socket, etc.)
├── backend/
│   ├── src/
│   │   ├── services/     # Core logic: chat, LLM, outline, research, auth
│   │   ├── db/models/    # Mongoose schemas
│   │   ├── server/       # Fastify routes and server setup
│   │   └── config/       # Environment and constants
│   └── prompts/          # Workflow prompt files (Markdown)
└── public/               # Static assets
```

---

## Notes

- `.env` and `backend/.env` are excluded from git.
- `node_modules`, `.next`, `backend/dist`, and `out` are excluded from git.
- The AI model is swappable via `FEYNMAN_MODEL` — any model on OpenRouter works.
- Student users have token quotas managed by the admin panel.
