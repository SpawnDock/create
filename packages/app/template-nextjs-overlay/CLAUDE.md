# SpawnDock TMA Template

- Treat this repository as a Telegram Mini App project first, not as a generic web app.
- Prefer `pnpm run dev` for the main local workflow because it starts both Next.js and the SpawnDock dev tunnel.
- When local repo context is not enough for a Telegram Mini App or SpawnDock-specific implementation question, use the local `tma-knowledge-search` skill at `.agents/skills/tma-knowledge-search`.
- Run that skill with Node from the project root: `node .agents/skills/tma-knowledge-search/scripts/search_tma_knowledge.mjs "<query>"`.
- Query that skill in English, keep the question focused, and use its answer before falling back to generic web guidance.
