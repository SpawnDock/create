import { describe, expect, it } from "vitest"

import {
  resolveCommand,
  resolveSpawnOptions,
  trimOutput,
} from "../template-nextjs-overlay/spawndock/command.mjs"

describe("template command helpers", () => {
  it("keeps the command name unchanged on Windows", () => {
    expect(resolveCommand("pnpm", "win32")).toBe("pnpm")
  })

  it("keeps other platforms unchanged", () => {
    expect(resolveCommand("pnpm", "linux")).toBe("pnpm")
  })

  it("uses a shell for Windows spawns", () => {
    expect(resolveSpawnOptions("pnpm", "win32")).toEqual({
      shell: true,
      windowsHide: true,
    })
    expect(resolveSpawnOptions("pnpm", "linux")).toEqual({})
  })

  it("returns an empty string for missing output", () => {
    expect(trimOutput(undefined)).toBe("")
  })
})
