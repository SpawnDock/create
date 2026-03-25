import { spawn } from "node:child_process"

import { resolveCommand } from "./command.mjs"
import { readSpawndockConfig, resolveMcpApiKey, resolveMcpServerUrl } from "./config.mjs"

const config = readSpawndockConfig()
const mcpServerUrl = process.env.MCP_SERVER_URL ?? resolveMcpServerUrl(config)
const mcpServerApiKey = process.env.MCP_SERVER_API_KEY ?? resolveMcpApiKey(config)

const child = spawn(resolveCommand("pnpm"), ["exec", "spawn-dock-mcp"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    MCP_SERVER_URL: mcpServerUrl,
    MCP_SERVER_API_KEY: mcpServerApiKey,
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
