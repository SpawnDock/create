# create-spawn-dock

SpawnDock bootstrap CLI for local TMA projects.

This repository now follows an `effect-template`-style layout:

- root workspace with `packages/app`
- TypeScript + Effect entrypoint
- no embedded TMA starter overlay inside the CLI repo

The canonical TMA starter lives only in `https://github.com/SpawnDock/tma-project`.
`create-spawn-dock` clones that repo and writes only project-specific runtime files.

## Usage

Until the npm package is published, run it directly from GitHub:

```bash
npx --yes github:SpawnDock/create-spawn-dock#main --token <pairing-token> [project-dir]
```

After npm publish, the intended short form remains:

```bash
npx @spawn-dock/create-spawn-dock --token <pairing-token> [project-dir]
```

## What it writes

- `spawndock.config.json`
- `.env.local`
- `spawndock.dev-tunnel.json`
- `opencode.json`
- `public/tonconnect-manifest.json`

Generated MCP config points to `<controlPlaneUrl>/mcp/sse`.

## Development

```bash
pnpm install
pnpm test
pnpm build
```
