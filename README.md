# create-spawn-dock

SpawnDock bootstrap CLI for local TMA projects.

This repository now follows an `effect-template`-style layout:

- root workspace with `packages/app`
- TypeScript + Effect entrypoint
- built-in TMA overlay bundled inside the CLI repo

The canonical TMA starter lives in `https://github.com/SpawnDock/tma-project`.
`create-spawn-dock` clones that repo, applies the bundled SpawnDock TMA overlay,
and then writes project-specific runtime files.

## Usage

```bash
npx @spawn-dock/create-spawn-dock --token <pairing-token> [project-dir]
```

If npm registry access is unavailable, the GitHub fallback remains:

```bash
npx --yes github:SpawnDock/create-spawn-dock#main --token <pairing-token> [project-dir]
```

## What it writes

- `spawndock.config.json`
- `.env.local`
- `spawndock.dev-tunnel.json`
- `opencode.json`
- `public/tonconnect-manifest.json`

## Built-in Overlay

The package also ships a built-in TMA overlay and applies it after cloning
`SpawnDock/tma-project`. This overlay is responsible for:

- `spawndock/dev.mjs`
- `spawndock/next.mjs`
- `spawndock/tunnel.mjs`
- `next.config.ts`
- `public/tonconnect-manifest.json`
- patching project scripts and `@spawn-dock/dev-tunnel`

Generated MCP config points to `<controlPlaneUrl>/mcp/sse`.

## Development

```bash
pnpm install
pnpm test
pnpm build
```
