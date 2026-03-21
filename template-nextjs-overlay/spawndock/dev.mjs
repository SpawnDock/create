import { spawn } from "node:child_process"
import { setTimeout } from "node:timers"

const scripts = [
  ["node", ["spawndock/next.mjs"]],
  ["node", ["spawndock/tunnel.mjs"]]
]

const children = []

const stopChildren = (signal) => {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal ?? "SIGTERM")
    }
  }
}

process.on("SIGINT", () => {
  stopChildren("SIGINT")
  process.exit(0)
})

process.on("SIGTERM", () => {
  stopChildren("SIGTERM")
  process.exit(0)
})

for (const [command, args] of scripts) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  })

  children.push(child)

  child.on("exit", (code) => {
    if (typeof code === "number" && code !== 0) {
      stopChildren()
      process.exit(code)
    }
  })
}

setTimeout(() => {
  console.log("SpawnDock dev session is ready.")
}, 0)
