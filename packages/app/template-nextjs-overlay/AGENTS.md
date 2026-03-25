# SpawnDock TMA Template

You are an AI agent working inside the SpawnDock Telegram Mini App template.

Your job is to build and improve a production-ready Telegram Mini App in this repository. Treat this as a real TMA project, not as a generic web app and not as a docs-only exercise.

## Default Mode

- Work end-to-end inside the repo: design, implement, and validate when the user is asking for a result.
- Prefer concrete code and file changes over abstract advice unless the user explicitly wants brainstorming only.
- If requirements are incomplete, choose the smallest sensible TMA-first default and keep moving.
- Ask a question only when missing information would materially change the product flow or create a high risk of doing the wrong work.

## Project Contract

- Preserve the current stack: Next.js, App Router, TypeScript, SpawnDock scripts, and the existing Telegram/TMA integrations.
- Do not replace the framework, routing model, or core dev workflow unless the user explicitly asks for that change.
- Prefer changes that fit the existing `src/app` structure, shared styling approach, and `spawndock/*.mjs` wrappers.
- Use `pnpm` commands, not `npm`, unless a task explicitly requires otherwise.

## TMA Rules

- Always treat the app as a Telegram Mini App first.
- Prefer mobile-first, touch-first UX and layouts that work well inside Telegram WebView.
- Use Telegram WebApp APIs where appropriate: `ready`, `expand`, `MainButton`, `BackButton`, `themeParams`, `HapticFeedback`, `openLink`, `openTelegramLink`, `sendData`, and viewport APIs.
- Respect Telegram theming. Do not hardcode colors where Telegram theme params should drive the UI.
- Avoid browser patterns that are fragile inside Telegram WebView: `alert()`, `confirm()`, `prompt()`, `target=\"_blank\"`, `window.open()`, and desktop-first navigation patterns.
- Do not introduce `BrowserRouter`-style assumptions for TMA navigation.

## TMA Knowledge Search

- When local repo context is not enough for a Telegram Mini App or SpawnDock-specific implementation question, use the local `tma-knowledge-search` skill before generic web search.
- In generated projects the local skill lives at `.agents/skills/tma-knowledge-search`.
- Query the skill in English and ask one focused implementation question at a time.
- Read the returned `answer` first, then inspect `sources` when they are present.
- SpawnDock bootstrap also mirrors the same skill into `~/.codex/skills/tma-knowledge-search` when possible so Codex can discover it natively.

## Dev Flow

- `pnpm run dev` is the primary local workflow. It starts the Next.js dev server and the SpawnDock dev tunnel together.
- `pnpm run dev:next` starts only the local Next.js server.
- `pnpm run dev:tunnel` starts only the SpawnDock tunnel client.
- `pnpm run agent` starts the Next.js server, the tunnel, and the local agent runtime launcher.
- If the user asks to run the project, preview the app, or get a tunnel URL, prefer `pnpm run dev`.
- Do not describe `pnpm run dev` as “just Next.js dev”; in this template it is the combined app-plus-tunnel flow.
- If `spawndock.config.json` or `spawndock.dev-tunnel.json` is missing or invalid, the project is probably not fully bootstrapped yet.

## Implementation Expectations

- Build only what is needed for the requested feature set.
- Keep the architecture simple, shippable, and easy to extend.
- Reuse existing components and patterns before introducing new abstractions.
- Add loading, empty, and error states for user-facing flows when they matter.
- Make the smallest set of changes that fully solves the task.

## Validation

- Run the narrowest relevant checks after changes.
- Prefer `pnpm run build` for code validation.
- Use `pnpm run dev` when the task depends on runtime behavior, preview behavior, or the SpawnDock tunnel.
- If you could not run a relevant check, say so explicitly.

## Success Criteria

- The result fits the current template and preserves its workflow.
- The app behaves like a proper Telegram Mini App and respects Telegram constraints.
- The main local development flow, especially `pnpm run dev`, remains intact.
- The code is ready for real iteration, not just for demo output.
