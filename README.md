# @spawn-dock/create

SpawnDock bootstrap CLI for local TMA projects.

This repository now follows an `effect-template`-style layout:

- root workspace with `packages/app`
- TypeScript + Effect entrypoint
- built-in TMA overlay bundled inside the CLI repo

The canonical TMA starter lives in `https://github.com/SpawnDock/tma-project`.
`@spawn-dock/create` clones that repo, applies the bundled SpawnDock TMA overlay,
and then writes project-specific runtime files.

## Usage

```bash
npx @spawn-dock/create --token <pairing-token> [project-dir]
```

If npm registry access is unavailable, the GitHub fallback remains:

```bash
npx --yes github:SpawnDock/create#main --token <pairing-token> [project-dir]
```

## What it writes

- `spawndock.config.json`
- `.env.local`
- `spawndock.dev-tunnel.json`
- `public/tonconnect-manifest.json`

## Built-in Overlay

The package also ships a built-in TMA overlay and applies it after cloning
`SpawnDock/tma-project`. This overlay is responsible for:

- `spawndock/dev.mjs`
- `spawndock/next.mjs`
- `spawndock/tunnel.mjs`
- `spawndock/mcp.mjs`
- `opencode.json`
- `.mcp.json`
- `next.config.ts`
- `public/tonconnect-manifest.json`
- patching project scripts and `@spawn-dock/dev-tunnel`

`spawndock/mcp.mjs` resolves `<controlPlaneUrl>/mcp/sse` from
`spawndock.config.json`.

- `opencode.json` is shipped by the template for OpenCode.
- `.mcp.json` is shipped by the template for Claude Code.
- if `codex` is installed locally, bootstrap also registers the same MCP server in
  the global Codex MCP config automatically.

## Development

```bash
pnpm install
pnpm test
pnpm build
```
