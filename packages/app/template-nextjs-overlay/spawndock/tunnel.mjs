import { spawn } from "node:child_process"
import { resolveCommand } from "./command.mjs"

const child = spawn(resolveCommand("pnpm"), ["exec", "spawn-dock-tunnel"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
})

child.on("exit", (code) => {
  process.exit(typeof code === "number" ? code : 1)
})

child.on("error", (error) => {
  console.error(error)
  process.exit(1)
})
