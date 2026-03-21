#!/usr/bin/env node
import { spawnSync } from "node:child_process"

const commands = [
  ["pnpm", ["build"]],
  ["corepack", ["pnpm", "build"]],
]

let lastStatus = 1

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
  })

  if (result.error && result.error.code === "ENOENT") {
    continue
  }

  lastStatus = result.status ?? 1

  if (lastStatus === 0) {
    process.exit(0)
  }
}

process.exit(lastStatus)
