import { spawn } from "node:child_process"
import readline from "node:readline"

import {
  readSpawndockConfig,
  resolveAllowedDevOrigins,
  resolveConfiguredLocalPort,
} from "./config.mjs"
import { resolveCommand, resolveSpawnOptions } from "./command.mjs"
import { findAvailablePort } from "./port.mjs"

const config = readSpawndockConfig()
const requestedLocalPort = resolveConfiguredLocalPort(config)
const localPort = process.env.SPAWNDOCK_PORT
  ? requestedLocalPort
  : await findAvailablePort(requestedLocalPort)
const allowedOrigins = resolveAllowedDevOrigins(config)
const previewOrigin = config.previewOrigin ?? ""

if (localPort !== requestedLocalPort) {
  console.warn(
    `SpawnDock local port ${requestedLocalPort} is busy, using ${localPort} instead.`
  )
}

const pnpmCommand = resolveCommand("pnpm")
const child = spawn(pnpmCommand, ["exec", "next", "dev", "-p", String(localPort)], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    SPAWNDOCK_ALLOWED_DEV_ORIGINS: allowedOrigins.join(","),
    SPAWNDOCK_PREVIEW_PATH: config.previewPath ?? "",
    SPAWNDOCK_ASSET_PREFIX: config.previewPath ?? "",
    SPAWNDOCK_SERVER_ACTIONS_ALLOWED_ORIGINS: config.previewHost ?? "",
  },
  stdio: ["inherit", "pipe", "pipe"],
  ...resolveSpawnOptions(pnpmCommand),
})

const exitWithChild = (code) => {
  process.exit(typeof code === "number" ? code : 1)
}

const rewriteNextLine = (line) => {
  if (previewOrigin.length === 0) {
    return line
  }

  if (line.includes("Local:")) {
    return `   - Local:         ${previewOrigin}`
  }

  if (line.includes("Network:")) {
    return `   - Network:       ${previewOrigin}`
  }

  return line
}

const forwardStream = (stream, writer) => {
  if (!stream) {
    return
  }

  const interfaceHandle = readline.createInterface({
    input: stream,
  })

  interfaceHandle.on("line", (line) => {
    writer(`${rewriteNextLine(line)}\n`)
  })
}

forwardStream(child.stdout, (chunk) => {
  process.stdout.write(chunk)
})

forwardStream(child.stderr, (chunk) => {
  process.stderr.write(chunk)
})

child.on("exit", exitWithChild)
child.on("error", (error) => {
  console.error(error)
  process.exit(1)
})
