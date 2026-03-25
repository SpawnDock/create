import { describe, expect, it } from "vitest"
import { formatSuccess } from "../src/app/program.js"

describe("formatSuccess", () => {
  it("guides users to the project directory and pnpm dev after bootstrap succeeds", () => {
    const output = formatSuccess({
      projectDir: "/tmp/demo-project",
      projectName: "Demo Project",
      previewOrigin: "https://api.example.com/preview/demo-project",
      mcpAgents: ["OpenCode", "Codex"],
    })

    expect(output).toContain("Dependencies already installed with pnpm.")
    expect(output).toContain("cd demo-project")
    expect(output).toContain("pnpm run dev")
    expect(output).not.toContain('cd "/tmp/demo-project"')
    expect(output).not.toContain("pnpm run agent")
    expect(output).not.toContain("&&")
  })

  it("uses the last path segment for Windows-style project paths too", () => {
    const output = formatSuccess({
      projectDir: "D:\\Projects\\test-box\\spawndock-app-11",
      projectName: "Spawndock App 11",
      previewOrigin: "https://api.example.com/preview/spawndock-app-11",
      mcpAgents: ["OpenCode"],
    })

    expect(output).toContain("Next:\n  cd spawndock-app-11\n  pnpm run dev")
  })
})
