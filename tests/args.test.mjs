import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { normalizeDisplayName, parseArgs } from "../src/args.mjs"
import {
  copyOverlayTree,
  patchPackageJson,
  renderTemplate,
  writeRuntimeConfig
} from "../src/template.mjs"
import { formatUsage } from "../src/run.mjs"

test("parseArgs reads token and project directory", () => {
  const result = parseArgs(["--token", "abc", "my-project"])

  assert.equal(result.token, "abc")
  assert.equal(result.projectDir, "my-project")
})

test("parseArgs reads custom claim path", () => {
  const result = parseArgs(["--token=abc", "--claim-path", "/claim", "my-project"])

  assert.equal(result.claimPath, "/claim")
  assert.equal(result.projectDir, "my-project")
})

test("parseArgs reads control plane URL from environment", () => {
  const result = parseArgs(["--token", "abc", "my-project"], {
    SPAWNDOCK_CONTROL_PLANE_URL: "https://garage-switch-bloom-pens.trycloudflare.com"
  })

  assert.equal(result.controlPlaneUrl, "https://garage-switch-bloom-pens.trycloudflare.com")
})

test("parseArgs reads template repo and branch overrides", () => {
  const result = parseArgs(
    [
      "--token",
      "abc",
      "--template-repo",
      "https://example.com/tma.git",
      "--template-branch",
      "next",
      "my-project"
    ]
  )

  assert.equal(result.templateRepo, "https://example.com/tma.git")
  assert.equal(result.templateBranch, "next")
})

test("normalizeDisplayName converts slug to title case", () => {
  assert.equal(normalizeDisplayName("my-next-app"), "My Next App")
})

test("renderTemplate replaces all tokens", () => {
  const rendered = renderTemplate("a __A__ b __A__", { __A__: "x" })

  assert.equal(rendered, "a x b x")
})

test("patchPackageJson injects spawn dock scripts", () => {
  const dir = mkdtempSync(join(tmpdir(), "spawndock-package-"))
  const packageJsonPath = join(dir, "package.json")

  writeFileSync(
    packageJsonPath,
    JSON.stringify({ name: "demo", scripts: { build: "next build" } }, null, 2)
  )

  patchPackageJson(dir)

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"))

  assert.equal(packageJson.scripts.dev, "node ./spawndock/dev.mjs")
  assert.equal(packageJson.scripts["dev:next"], "node ./spawndock/next.mjs")
  assert.equal(packageJson.scripts["dev:tunnel"], "node ./spawndock/tunnel.mjs")
  assert.equal(packageJson.devDependencies["@spawn-dock/dev-tunnel"], "latest")
  assert.equal(packageJson.scripts.build, "next build")
})

test("copyOverlayTree renders placeholders into target files", () => {
  const sourceDir = mkdtempSync(join(tmpdir(), "spawndock-overlay-src-"))
  const targetDir = mkdtempSync(join(tmpdir(), "spawndock-overlay-dst-"))

  mkdirSync(join(sourceDir, "nested"), { recursive: true })
  writeFileSync(join(sourceDir, "nested", "file.txt"), "hello __TOKEN__")

  copyOverlayTree(sourceDir, targetDir, { __TOKEN__: "world" })

  assert.equal(readFileSync(join(targetDir, "nested", "file.txt"), "utf8"), "hello world")
})

test("formatUsage renders a custom invocation", () => {
  assert.equal(
    formatUsage("npx create-spawn-dock --token <pairing-token> [project-dir]"),
    "Usage: npx create-spawn-dock --token <pairing-token> [project-dir]"
  )
})

test("writeRuntimeConfig creates dev tunnel and opencode config", () => {
  const dir = mkdtempSync(join(tmpdir(), "spawndock-runtime-"))

  writeRuntimeConfig(
    dir,
    {
      templateId: "nextjs-template",
      projectDir: dir,
      projectSlug: "demo-project",
      projectName: "Demo Project"
    },
    {
      projectId: "project_123",
      projectSlug: "demo-project",
      controlPlaneUrl: "https://api.example.com",
      previewOrigin: "https://api.example.com/preview/demo-project",
      deviceSecret: "secret_123",
      localPort: 3000
    }
  )

  const appConfig = JSON.parse(readFileSync(join(dir, "spawndock.config.json"), "utf8"))
  const tunnelConfig = JSON.parse(readFileSync(join(dir, "spawndock.dev-tunnel.json"), "utf8"))
  const opencodeConfig = JSON.parse(readFileSync(join(dir, "opencode.json"), "utf8"))

  assert.equal(appConfig.deviceSecret, "secret_123")
  assert.equal(tunnelConfig.controlPlane, "https://api.example.com")
  assert.equal(tunnelConfig.projectSlug, "demo-project")
  assert.equal(opencodeConfig.mcp.spawndock.environment.MCP_SERVER_URL, "https://api.example.com/mcp/sse")
})
