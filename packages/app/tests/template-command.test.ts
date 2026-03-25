import { describe, expect, it } from "vitest"

import { resolveCommand, trimOutput } from "../template-nextjs-overlay/spawndock/command.mjs"

describe("template command helpers", () => {
  it("maps pnpm to pnpm.cmd on Windows", () => {
    expect(resolveCommand("pnpm", "win32")).toBe("pnpm.cmd")
  })

  it("keeps other platforms unchanged", () => {
    expect(resolveCommand("pnpm", "linux")).toBe("pnpm")
  })

  it("returns an empty string for missing output", () => {
    expect(trimOutput(undefined)).toBe("")
  })
})
