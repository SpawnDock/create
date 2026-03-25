import { describe, expect, it } from "vitest"
import type { SpawnSyncReturns } from "node:child_process"
import { formatCommandFailure, resolveCommandExecutable } from "../src/shell/bootstrap.js"

const buildResult = (
  overrides: Partial<SpawnSyncReturns<string>> = {},
): SpawnSyncReturns<string> =>
  ({
    pid: 0,
    output: [],
    stdout: "",
    stderr: "",
    status: 0,
    signal: null,
    ...overrides,
  }) as SpawnSyncReturns<string>

describe("bootstrap shell command helpers", () => {
  it("uses .cmd shims for Windows package manager commands", () => {
    expect(resolveCommandExecutable("pnpm", "win32")).toBe("pnpm.cmd")
    expect(resolveCommandExecutable("corepack", "win32")).toBe("corepack.cmd")
    expect(resolveCommandExecutable("git", "win32")).toBe("git")
    expect(resolveCommandExecutable("pnpm", "linux")).toBe("pnpm")
  })

  it("formats spawn errors even when stdout and stderr are missing", () => {
    const result = buildResult({
      status: null,
      stdout: undefined as unknown as string,
      stderr: undefined as unknown as string,
      error: new Error("spawn pnpm ENOENT"),
    })

    expect(formatCommandFailure(result, "pnpm", ["install"])).toBe("spawn pnpm ENOENT")
  })

  it("prefers stderr and stdout output before generic command failures", () => {
    expect(
      formatCommandFailure(
        buildResult({ status: 1, stderr: " install failed \n", stdout: "ignored" }),
        "pnpm",
        ["install"],
      ),
    ).toBe("install failed")

    expect(
      formatCommandFailure(
        buildResult({ status: 1, stderr: "", stdout: " fallback output \n" }),
        "pnpm",
        ["install"],
      ),
    ).toBe("fallback output")
  })
})
