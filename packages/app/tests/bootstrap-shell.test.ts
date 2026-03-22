import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Effect } from "effect"
import { bootstrapProject } from "../src/shell/bootstrap.js"

describe("bootstrapProject", () => {
  const originalCwd = process.cwd()
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    vi.unstubAllGlobals()
  })

  it("fails on a non-empty explicit project directory before claiming the pairing token", async () => {
    const workspaceDir = mkdtempSync(join(tmpdir(), "spawndock-create-"))
    const occupiedDir = join(workspaceDir, "occupied-project")
    mkdirSync(occupiedDir, { recursive: true })
    writeFileSync(join(occupiedDir, "README.md"), "occupied\n", "utf8")
    process.chdir(workspaceDir)

    await expect(
      Effect.runPromise(
        bootstrapProject({
          token: "pair_demo",
          projectDir: "occupied-project",
          controlPlaneUrl: "http://127.0.0.1:3000",
          claimPath: "/v1/bootstrap/claim",
          templateRepo: "https://github.com/SpawnDock/tma-project.git",
          templateBranch: "master",
        }),
      ),
    ).rejects.toThrow(`Target directory is not empty: ${occupiedDir}`)

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
