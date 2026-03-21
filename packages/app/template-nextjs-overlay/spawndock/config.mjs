import { readFileSync } from "node:fs"
import { resolve } from "node:path"

export const readSpawndockConfig = (cwd = process.cwd()) =>
  JSON.parse(readFileSync(resolve(cwd, "spawndock.config.json"), "utf8"))

export const resolveLocalOrigin = (config) =>
  `http://127.0.0.1:${config.localPort ?? 3000}`

export const resolvePreviewOrigin = (config) =>
  config.previewOrigin ?? ""

export const resolveAllowedDevOrigins = (config) =>
  [config.previewOrigin].filter(Boolean)

export const resolveMcpServerUrl = (config) => {
  if (typeof config.mcpServerUrl === "string" && config.mcpServerUrl.length > 0) {
    return config.mcpServerUrl
  }

  if (typeof config.controlPlaneUrl === "string" && config.controlPlaneUrl.length > 0) {
    const url = new URL(config.controlPlaneUrl)
    const normalizedPath = url.pathname.replace(/\/$/, "")
    url.pathname = normalizedPath.length > 0 ? `${normalizedPath}/mcp/sse` : "/mcp/sse"
    return url.toString()
  }

  throw new Error("Missing mcpServerUrl or controlPlaneUrl in spawndock.config.json")
}
