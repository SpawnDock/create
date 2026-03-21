import { spawn } from "node:child_process"

import { readSpawndockConfig, resolveMcpServerUrl } from "./config.mjs"

const config = readSpawndockConfig()
const mcpServerUrl = process.env.MCP_SERVER_URL ?? resolveMcpServerUrl(config)

const child = spawn("pnpm", ["exec", "spawn-dock-mcp"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    MCP_SERVER_URL: mcpServerUrl,
  },
  stdio: "inherit",
})

child.on("exit", (code) => {
  process.exit(typeof code === "number" ? code : 1)
})

child.on("error", (error) => {
  console.error(error)
  process.exit(1)
})
