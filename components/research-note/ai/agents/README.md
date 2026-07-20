# ai/agents/ — multi-agent draft orchestration

Aligned with GAHI `/research` (chat-paper + papers search):

1. Resolves the section agent for the **active section only**
2. Reads the **existing write-up** (spine when refining)
3. Checks **every other filled section** (Title → Abstract → …)
4. Injects a **reader checklist** (`sectionChecklists.ts`) so Generate/Refine
   must cover what readers expect (problem/gap/aims, themes/gap, methods rigor,
   facts-first results, interpretation + limitations, etc.)
5. For Introduction → Conclusion: fetches papers from `/api/papers/search`
   into a **CITATION BANK** with exact APA strings `(Author, Year)`.
   Introduction requires **at least 4** distinct bank cites; if the first draft
   is short on cites, a second citation-fix pass runs automatically.
6. Title / Abstract / Keywords / Acknowledgements / Supplementary: no research-API cites

| Section | Research API + cites | Checklist focus |
|---------|----------------------|-----------------|
| Introduction | Yes | Problem, gap, aims, contribution preview |
| Literature Review | Yes | Themes, debates, fit, gap |
| Materials & Methods | Yes | Sample, collection, analysis, ethics |
| Results | Yes (light) | Facts, aims link, figures — no “so what” |
| Discussion | Yes | Meaning, prior work, limits, implications |
| Conclusion | Yes (light) | Contribution, take-home, forward look |
| Acknowledgements / Supplementary | No | Thanks only / extra materials |
