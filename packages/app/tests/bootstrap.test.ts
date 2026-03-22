import { describe, expect, it } from "vitest"
import {
  buildCodexMcpCommandArgs,
  buildGeneratedFiles,
  buildMcpServerUrl,
  buildOpenCodeConfig,
  buildProjectMcpConfig,
  GENERATED_PACKAGE_MANAGER,
  normalizeDisplayName,
  patchPackageJsonContent,
  resolveProjectContext,
  resolveClaimPath,
  validateNodeMajorVersion,
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

describe("resolveClaimPath", () => {
  it("prefers a project-specific claim route when a project id is available", () => {
    expect(resolveClaimPath("/v1/bootstrap/claim", "project_123")).toBe("/api/projects/project_123/claim")
  })

  it("substitutes the :projectId placeholder when present", () => {
    expect(resolveClaimPath("/projects/:projectId/claim", "project_123")).toBe("/projects/project_123/claim")
  })
})

describe("validateNodeMajorVersion", () => {
  it("accepts supported Node.js versions", () => {
    expect(validateNodeMajorVersion("v20.10.0")).toBeNull()
  })

  it("returns a helpful message for unsupported Node.js versions", () => {
    expect(validateNodeMajorVersion("v18.20.0")).toContain("Node.js 20+")
  })
})

describe("buildCodexMcpCommandArgs", () => {
  it("builds the global Codex MCP registration command", () => {
    expect(buildCodexMcpCommandArgs("https://api.example.com/mcp/sse", "mcp_key_123")).toEqual([
      "mcp",
      "add",
      "spawndock",
      "--env",
      "MCP_SERVER_URL=https://api.example.com/mcp/sse",
      "--env",
      "MCP_SERVER_API_KEY=mcp_key_123",
      "--",
      "npx",
      "-y",
      "@spawn-dock/mcp",
    ])
  })
})

describe("generated tool configs", () => {
  it("builds project MCP config", () => {
    expect(buildProjectMcpConfig()).toContain("\"./spawndock/mcp.mjs\"")
  })

  it("builds opencode config", () => {
    expect(buildOpenCodeConfig()).toContain("\"https://opencode.ai/config.json\"")
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
        mcpApiKey: "mcp_key_123",
        localPort: 3000,
      },
    )

    const fileMap = new Map(files.map((file) => [file.path, file.content]))

    expect(fileMap.has("opencode.json")).toBe(true)
    expect(fileMap.has(".mcp.json")).toBe(true)
    expect(fileMap.get("spawndock.config.json")).toContain("\"mcpServerUrl\": \"https://api.example.com/mcp/sse\"")
    expect(fileMap.get("spawndock.config.json")).toContain("\"mcpApiKey\": \"mcp_key_123\"")
    expect(fileMap.get("opencode.json")).toContain("./spawndock/mcp.mjs")
    expect(fileMap.get(".mcp.json")).toContain("./spawndock/mcp.mjs")
    expect(fileMap.get("public/tonconnect-manifest.json")).toContain("\"url\": \"https://api.example.com/preview/demo-project\"")
    expect(fileMap.get("spawndock.dev-tunnel.json")).toContain("\"projectSlug\": \"demo-project\"")
  })
})

describe("patchPackageJsonContent", () => {
  it("injects pnpm metadata, overlay scripts and tunnel dependency", () => {
    const output = patchPackageJsonContent(
      JSON.stringify({
        name: "demo",
        scripts: { build: "next build" },
      }),
    )

    expect(output).toContain(`"packageManager": "${GENERATED_PACKAGE_MANAGER}"`)
    expect(output).toContain("\"dev\": \"node ./spawndock/dev.mjs\"")
    expect(output).toContain("\"dev:next\": \"node ./spawndock/next.mjs\"")
    expect(output).toContain("\"dev:tunnel\": \"node ./spawndock/tunnel.mjs\"")
    expect(output).toContain("\"publish:github-pages\": \"node ./spawndock/publish.mjs\"")
    expect(output).toContain("\"agent:session\": \"spawn-dock session\"")
    expect(output).toContain("\"@spawn-dock/cli\": \"latest\"")
    expect(output).toContain("\"@spawn-dock/dev-tunnel\": \"latest\"")
    expect(output).toContain("\"@spawn-dock/mcp\": \"latest\"")
  })
})
