# create-spawn-dock

SpawnDock bootstrap CLI for local TMA projects.

## Usage

```bash
npx create-spawn-dock --token <pairing-token> [project-dir]
```

## What it does

- clones `SpawnDock/tma-project`
- claims the pairing token against the control plane
- writes `spawndock.config.json`, `.env.local`, `spawndock.dev-tunnel.json`, and `opencode.json`
- installs dependencies in the generated project

## Generated MCP URL

The bootstrap writes `MCP_SERVER_URL` to `<controlPlaneUrl>/mcp/sse`.

## Development

```bash
npm test
```
