import { describe, expect, it } from "vitest"
import {
  buildGeneratedFiles,
  buildMcpServerUrl,
  normalizeDisplayName,
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

describe("buildGeneratedFiles", () => {
  it("creates runtime files without storing template overlay", () => {
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

    expect(fileMap.get("opencode.json")).toContain("\"MCP_SERVER_URL\": \"https://api.example.com/mcp/sse\"")
    expect(fileMap.get("public/tonconnect-manifest.json")).toContain("\"url\": \"https://api.example.com/preview/demo-project\"")
    expect(fileMap.get("spawndock.dev-tunnel.json")).toContain("\"projectSlug\": \"demo-project\"")
  })
})
