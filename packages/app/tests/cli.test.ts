import { describe, expect, it } from "vitest"
import { formatUsage, parseArgs } from "../src/shell/cli.js"

describe("parseArgs", () => {
  it("reads token and project directory", () => {
    const result = parseArgs(["--token", "abc", "my-project"])

    expect(result.token).toBe("abc")
    expect(result.projectDir).toBe("my-project")
  })

  it("leaves project directory empty when omitted so bootstrap can derive it from the token claim", () => {
    const result = parseArgs(["--token", "abc"])

    expect(result.projectDir).toBe("")
  })

  it("reads custom claim path", () => {
    const result = parseArgs(["--token=abc", "--claim-path", "/claim", "my-project"])

    expect(result.claimPath).toBe("/claim")
    expect(result.projectDir).toBe("my-project")
  })

  it("reads project id overrides", () => {
    const result = parseArgs(["--token=abc", "--project-id", "project_123", "my-project"])

    expect(result.projectId).toBe("project_123")
  })

  it("reads control plane URL from environment", () => {
    const result = parseArgs(
      ["--token", "abc", "my-project"],
      { SPAWNDOCK_CONTROL_PLANE_URL: "https://example.trycloudflare.com" },
    )

    expect(result.controlPlaneUrl).toBe("https://example.trycloudflare.com")
  })

  it("reads template repo and branch overrides", () => {
    const result = parseArgs([
      "--token",
      "abc",
      "--template-repo",
      "https://example.com/tma.git",
      "--template-branch",
      "next",
      "my-project",
    ])

    expect(result.templateRepo).toBe("https://example.com/tma.git")
    expect(result.templateBranch).toBe("next")
  })
})

describe("formatUsage", () => {
  it("renders a custom invocation", () => {
    expect(formatUsage("npx @spawn-dock/create --token <pairing-token> [project-dir]")).toBe(
      "Usage: npx @spawn-dock/create --token <pairing-token> [project-dir]",
    )
  })
})
