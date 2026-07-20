# context-providers/ — MCP-ready AI context layer

Implements the API-vs-MCP decision (spec §5a): **build on the Anthropic
Messages API now, with an MCP-ready architecture for later.**

Each provider exposes a clean function to fetch relevant project material for
the AI drafting engine, and is deliberately shaped so it can be re-exposed as an
**MCP server/resource** later with minimal refactor:

- `NotesContext` — Materials / notes pages
- `DataContext` — spreadsheet data + computed stats
- `FiguresContext` — figure/asset metadata
- `LabLogContext` — electronic lab notebook entries
- `ReferencesContext` — the reference library
- `DraftsContext` — sibling draft sections (cross-agent handoff)
- `TemplateContext` — journal/thesis templates (incl. upload-to-learn)

`assembleProjectContext` merges all of the above so section agents in
`ai/agents/` can read everything the user inserts in any tab.
