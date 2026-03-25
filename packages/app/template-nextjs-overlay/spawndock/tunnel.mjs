import { spawn } from "node:child_process"
import { resolveCommand, resolveSpawnOptions } from "./command.mjs"

const pnpmCommand = resolveCommand("pnpm")
const child = spawn(pnpmCommand, ["exec", "spawn-dock-tunnel"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  ...resolveSpawnOptions(pnpmCommand),
})

child.on("exit", (code) => {
  process.exit(typeof code === "number" ? code : 1)
})

child.on("error", (error) => {
  console.error(error)
  process.exit(1)
})
