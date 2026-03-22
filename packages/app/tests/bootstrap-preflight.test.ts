import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Effect } from "effect"
import { bootstrapProject } from "../src/shell/bootstrap.js"

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(() => ({
    status: 0,
    stdout: "",
    stderr: "",
  })),
}))

describe("bootstrapProject preflight", () => {
  const originalCwd = process.cwd()
  const fetchMock = vi.fn()
  let tempRoot = ""

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    tempRoot = mkdtempSync(join(tmpdir(), "spawndock-create-preflight-"))
    process.chdir(tempRoot)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    vi.unstubAllGlobals()
    if (tempRoot.length > 0) {
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  it("fails before any network call when an explicit target directory is not empty", async () => {
    const projectDir = join(tempRoot, "demo-app")
    mkdirSync(projectDir, { recursive: true })
    writeFileSync(join(projectDir, "keep.txt"), "occupied", "utf8")

    const exit = await Effect.runPromiseExit(
      bootstrapProject({
        token: "pair_demo",
        projectDir: "demo-app",
        controlPlaneUrl: "https://api.example.com",
        claimPath: "/v1/bootstrap/claim",
        templateRepo: "https://github.com/SpawnDock/tma-project.git",
        templateBranch: "master",
      }),
    )

    expect(exit._tag).toBe("Failure")
    if (exit._tag !== "Failure") {
      throw new Error("Expected bootstrap to fail for a non-empty explicit directory")
    }
    expect(fetchMock).not.toHaveBeenCalled()
    expect(String(exit.cause).includes("Target directory is not empty")).toBe(true)
  })

  it("inspects the token before claim when deriving the target directory", async () => {
    const projectDir = join(tempRoot, "spawndock-app-4")
    mkdirSync(projectDir, { recursive: true })
    writeFileSync(join(projectDir, "keep.txt"), "occupied", "utf8")

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        projectId: "project_123",
        projectSlug: "spawndock-app-4",
      }),
    })

    const exit = await Effect.runPromiseExit(
      bootstrapProject({
        token: "pair_demo",
        projectDir: "",
        controlPlaneUrl: "https://api.example.com",
        claimPath: "/v1/bootstrap/claim",
        templateRepo: "https://github.com/SpawnDock/tma-project.git",
        templateBranch: "master",
      }),
    )

    expect(exit._tag).toBe("Failure")
    if (exit._tag !== "Failure") {
      throw new Error("Expected bootstrap to fail before claiming a derived project directory")
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://api.example.com/api/pairing/inspect")
    expect(String(exit.cause).includes("Target directory is not empty")).toBe(true)
  })

  it("returns a helpful error when the control plane does not support token inspection", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => {
        throw new Error("not-json")
      },
      text: async () => "<html>not found</html>",
    })

    const exit = await Effect.runPromiseExit(
      bootstrapProject({
        token: "pair_demo",
        projectDir: "",
        controlPlaneUrl: "https://api.example.com",
        claimPath: "/v1/bootstrap/claim",
        templateRepo: "https://github.com/SpawnDock/tma-project.git",
        templateBranch: "master",
      }),
    )

    expect(exit._tag).toBe("Failure")
    if (exit._tag !== "Failure") {
      throw new Error("Expected bootstrap to fail when token inspection is unsupported")
    }
    expect(String(exit.cause).includes("cannot inspect pairing tokens yet")).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
