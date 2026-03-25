import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Effect } from "effect"
import { GENERATED_PACKAGE_MANAGER } from "../src/core/bootstrap.js"
import { bootstrapProject } from "../src/shell/bootstrap.js"

const writeExecutable = (path: string, content: string): void => {
  writeFileSync(path, content, "utf8")
  chmodSync(path, 0o755)
}

describe("bootstrapProject dependency install", () => {
  const originalCwd = process.cwd()
  const originalPath = process.env["PATH"]
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    process.env["PATH"] = originalPath
    vi.unstubAllGlobals()
  })

  it("falls back to npx pnpm when pnpm is unavailable", async () => {
    const workspaceDir = mkdtempSync(join(tmpdir(), "spawndock-create-install-"))
    const templateDir = join(workspaceDir, "template")
    const binDir = join(workspaceDir, "bin")
    const npxLogPath = join(workspaceDir, "npx.log")
    const gitPath = execFileSync("which", ["git"], { encoding: "utf8" }).trim()

    mkdirSync(templateDir, { recursive: true })
    mkdirSync(binDir, { recursive: true })

    writeFileSync(
      join(templateDir, "package.json"),
      `${JSON.stringify({ name: "template-demo", version: "1.0.0", scripts: {} }, null, 2)}\n`,
      "utf8",
    )

    execFileSync(gitPath, ["init", "-b", "master"], { cwd: templateDir, stdio: "ignore" })
    execFileSync(gitPath, ["add", "package.json"], { cwd: templateDir, stdio: "ignore" })
    execFileSync(
      gitPath,
      ["-c", "user.name=SpawnDock Test", "-c", "user.email=test@example.com", "commit", "-m", "init"],
      { cwd: templateDir, stdio: "ignore" },
    )

    writeExecutable(join(binDir, "git"), `#!/bin/sh\nexec "${gitPath}" "$@"\n`)
    writeExecutable(
      join(binDir, "npx"),
      `#!/bin/sh\nprintf '%s\n' "$*" > "${npxLogPath}"\nexit 0\n`,
    )

    process.env["PATH"] = binDir
    process.chdir(workspaceDir)

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          projectId: "project_demo",
          projectSlug: "demo-app",
          controlPlaneUrl: "https://spawn-dock.w3voice.net",
          previewOrigin: "https://spawn-dock.w3voice.net/preview/demo-app",
          deviceSecret: "device_demo",
          mcpApiKey: "mcp_demo",
          localPort: 3000,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    )

    const summary = await Effect.runPromise(
      bootstrapProject({
        token: "pair_demo",
        projectDir: "demo-app",
        controlPlaneUrl: "https://spawn-dock.w3voice.net",
        claimPath: "/v1/bootstrap/claim",
        templateRepo: templateDir,
        templateBranch: "master",
      }),
    )

    expect(summary.projectDir).toBe(join(workspaceDir, "demo-app"))
    expect(readFileSync(npxLogPath, "utf8")).toContain(`-y ${GENERATED_PACKAGE_MANAGER} install`)
  })
})
