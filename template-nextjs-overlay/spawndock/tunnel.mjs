import { spawn } from "node:child_process"

const child = spawn("pnpm", ["exec", "spawn-dock-tunnel", "dev"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit"
})

child.on("exit", (code) => {
  process.exit(typeof code === "number" ? code : 1)
})

child.on("error", (error) => {
  console.error(error)
  process.exit(1)
})
