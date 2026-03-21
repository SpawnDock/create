# __SPAWNDOCK_PROJECT_NAME__

This project was bootstrapped from the SpawnDock TMA starter repository and
patched for SpawnDock local development.

## Scripts

- `npm run dev` starts Next.js and the SpawnDock tunnel client together.
- `npm run dev:next` starts only the local Next.js dev server.
- `npm run dev:tunnel` starts only the SpawnDock tunnel client.

## Local config

- `spawndock.config.json` contains preview/runtime values for the local app.
- `spawndock.dev-tunnel.json` contains the control plane URL, project slug, device secret, and local port for `@spawn-dock/dev-tunnel`.
- `opencode.json` wires the project to `@spawn-dock/mcp`.
- `.env.local` mirrors the runtime values needed by the local app.

## Flow

1. Run `npm run dev`.
2. Open the SpawnDock preview URL in Telegram.
3. Use OpenCode in this directory with the generated `opencode.json`.
4. Edit locally and refresh to see the changes.
