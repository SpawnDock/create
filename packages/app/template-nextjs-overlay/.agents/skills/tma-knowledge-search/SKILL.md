---
name: tma-knowledge-search
description: Search the SpawnDock TMA knowledge API for Telegram Mini App and SpawnDock-specific implementation guidance. Use when Codex needs authoritative TMA workflow details, Telegram WebApp API usage, SpawnDock TMA template behavior, or wants to verify how a feature should be built for Telegram Mini Apps before answering or coding.
---

# TMA Knowledge Search

Use this skill when local repo context is not enough for a Telegram Mini App question and the answer should come from the SpawnDock TMA knowledge base.

## Workflow

1. Form a focused English query about the TMA implementation detail you need.
2. Run `scripts/search_tma_knowledge.py "<query>"`.
3. Read the returned `answer` first, then inspect any `sources`.
4. Use the API result as the primary TMA-specific reference in your answer or implementation plan.

## Query Rules

- Prefer English queries even if the user writes in another language.
- Ask about one concrete problem at a time.
- Include key TMA terms in the query: `Telegram Mini App`, `WebApp`, `MainButton`, `theme`, `viewport`, `SpawnDock`, `Next.js template`, and similar domain words when relevant.
- Re-query with a narrower prompt if the first result is generic.
- Avoid unnecessary repeat calls: the endpoint can rate-limit quickly on the free tier.

## Output Handling

- Treat the API response as TMA-specific guidance, not as a generic web best-practices source.
- If the API returns no useful sources, say that clearly and fall back to repo code or official Telegram docs as needed.
- Keep citations lightweight: mention the knowledge API result and summarize the relevant guidance rather than dumping raw JSON.

## Resources

- `scripts/search_tma_knowledge.py`: sends the POST request and prints a readable summary or raw JSON.
- The script automatically uses `SPAWNDOCK_API_TOKEN`, `API_TOKEN`, or the nearest `spawndock.config.json` `apiToken` when available.
- `references/api.md`: request and response contract for the knowledge endpoint.
