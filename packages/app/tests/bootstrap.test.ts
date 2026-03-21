import { describe, expect, it } from "vitest"
import {
  buildCodexMcpCommandArgs,
  buildGeneratedFiles,
  buildMcpServerUrl,
  normalizeDisplayName,
  patchPackageJsonContent,
  resolveProjectContext,
} from "../src/core/bootstrap.js"

describe("normalizeDisplayName", () => {
  it("converts slug to title case", () => {
    expect(normalizeDisplayName("my-next-app")).toBe("My Next App")
  })
})

describe("resolveProjectContext", () => {
  it("derives slug and title from project directory", () => {
    const context = resolveProjectContext("/tmp/demo-project")

    expect(context.projectSlug).toBe("demo-project")
    expect(context.projectName).toBe("Demo Project")
  })
})

describe("buildMcpServerUrl", () => {
  it("builds the prefixed mcp url", () => {
    expect(buildMcpServerUrl("https://api.example.com")).toBe("https://api.example.com/mcp/sse")
  })
})

describe("buildCodexMcpCommandArgs", () => {
  it("builds the global Codex MCP registration command", () => {
    expect(buildCodexMcpCommandArgs("https://api.example.com/mcp/sse")).toEqual([
      "mcp",
      "add",
      "spawndock",
      "--env",
      "MCP_SERVER_URL=https://api.example.com/mcp/sse",
      "--",
      "npx",
      "-y",
      "@spawn-dock/mcp",
    ])
  })
})

describe("buildGeneratedFiles", () => {
  it("creates runtime files for the overlaid starter", () => {
    const files = buildGeneratedFiles(
      {
        templateId: "nextjs-template",
        projectDir: "/tmp/demo-project",
        projectSlug: "demo-project",
        projectName: "Demo Project",
      },
      {
        projectId: "project_123",
        projectSlug: "demo-project",
        controlPlaneUrl: "https://api.example.com",
        previewOrigin: "https://api.example.com/preview/demo-project",
        deviceSecret: "secret_123",
        localPort: 3000,
      },
    )

    const fileMap = new Map(files.map((file) => [file.path, file.content]))

    expect(fileMap.has("opencode.json")).toBe(false)
    expect(fileMap.has(".mcp.json")).toBe(false)
    expect(fileMap.get("spawndock.config.json")).toContain("\"mcpServerUrl\": \"https://api.example.com/mcp/sse\"")
    expect(fileMap.get("public/tonconnect-manifest.json")).toContain("\"url\": \"https://api.example.com/preview/demo-project\"")
    expect(fileMap.get("spawndock.dev-tunnel.json")).toContain("\"projectSlug\": \"demo-project\"")
  })
})

describe("patchPackageJsonContent", () => {
  it("injects overlay scripts and tunnel dependency", () => {
    const output = patchPackageJsonContent(
      JSON.stringify({
        name: "demo",
        scripts: { build: "next build" },
      }),
    )

    expect(output).toContain("\"dev\": \"node ./spawndock/dev.mjs\"")
    expect(output).toContain("\"dev:next\": \"node ./spawndock/next.mjs\"")
    expect(output).toContain("\"dev:tunnel\": \"node ./spawndock/tunnel.mjs\"")
    expect(output).toContain("\"@spawn-dock/dev-tunnel\": \"latest\"")
    expect(output).toContain("\"@spawn-dock/mcp\": \"latest\"")
  })
})
