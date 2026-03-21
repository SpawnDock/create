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
