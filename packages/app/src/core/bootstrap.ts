export const DEFAULT_PROJECT_DIR = ""
export const DEFAULT_CONTROL_PLANE_URL = "https://spawn-dock.w3voice.net"
export const DEFAULT_CLAIM_PATH = "/v1/bootstrap/claim"
export const DEFAULT_INSPECT_PATH = "/api/pairing/inspect"
export const DEFAULT_TEMPLATE_REPO = "https://github.com/SpawnDock/tma-project.git"
export const DEFAULT_TEMPLATE_BRANCH = "master"
export const GENERATED_PACKAGE_MANAGER = "pnpm@10.32.1"
export const TEMPLATE_ID = "nextjs-template"

export interface CliOptions {
  readonly token: string
  readonly projectId?: string
  readonly controlPlaneUrl: string
  readonly claimPath: string
  readonly projectDir: string
  readonly templateRepo: string
  readonly templateBranch: string
}

export interface ProjectContext {
  readonly projectDir: string
  readonly projectSlug: string
  readonly projectName: string
  readonly templateId: string
}

export interface BootstrapClaim {
  readonly projectId: string
  readonly projectSlug: string
  readonly controlPlaneUrl: string
  readonly previewOrigin: string
  readonly deviceSecret: string
  readonly mcpApiKey: string
  readonly localPort: number
}

export interface PairingTokenInspection {
  readonly projectId: string
  readonly projectSlug: string
}

export interface BootstrapSummary {
  readonly projectDir: string
  readonly projectName: string
  readonly previewOrigin: string
  readonly mcpAgents: ReadonlyArray<string>
}

export interface GeneratedFile {
  readonly path: string
  readonly content: string
}

export interface OverlayFile {
  readonly path: string
  readonly content: string
}

export const DEFAULT_MCP_AGENTS = ["OpenCode", "Claude Code"] as const
export const MIN_NODE_MAJOR = 20

export const normalizeDisplayName = (value: string): string =>
  value
    .split(/[^a-zA-Z0-9]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ")

export const resolveProjectContext = (projectDir: string): ProjectContext => {
  const projectSlug = projectDir.split(/[\\/]/g).filter(Boolean).at(-1) ?? projectDir

  return {
    projectDir,
    projectSlug,
    projectName: normalizeDisplayName(projectSlug),
    templateId: TEMPLATE_ID,
  }
}

export const resolvePreviewPath = (previewOrigin: string): string => {
  const url = new URL(previewOrigin)
  const normalizedPath = url.pathname.replace(/\/$/, "")

  return normalizedPath.length > 0 ? normalizedPath : ""
}

export const resolvePreviewHost = (previewOrigin: string): string =>
  new URL(previewOrigin).host

export const buildMcpServerUrl = (controlPlaneUrl: string): string => {
  const url = new URL(controlPlaneUrl)
  const normalizedPath = url.pathname.replace(/\/$/, "")
  url.pathname = normalizedPath.length > 0 ? `${normalizedPath}/mcp/sse` : "/mcp/sse"
  return url.toString()
}

export const resolveClaimPath = (claimPath: string, projectId?: string): string => {
  const normalizedClaimPath = claimPath.startsWith("/") ? claimPath : `/${claimPath}`

  if (projectId && normalizedClaimPath.includes(":projectId")) {
    return normalizedClaimPath.replace(":projectId", projectId)
  }

  if (projectId && normalizedClaimPath === DEFAULT_CLAIM_PATH) {
    return `/api/projects/${projectId}/claim`
  }

  return normalizedClaimPath
}

export const validateNodeMajorVersion = (version: string): string | null => {
  const match = /^v?(\d+)/.exec(version)
  const major = match ? Number.parseInt(match[1] ?? "", 10) : Number.NaN

  if (!Number.isFinite(major) || major >= MIN_NODE_MAJOR) {
    return null
  }

  return `SpawnDock requires Node.js ${MIN_NODE_MAJOR}+ (detected ${version}). Install a newer Node release from https://nodejs.org/.`
}

export const buildCodexMcpCommandArgs = (mcpServerUrl: string, mcpApiKey: string): ReadonlyArray<string> => [
  "mcp",
  "add",
  "spawndock",
  "--env",
  `MCP_SERVER_URL=${mcpServerUrl}`,
  "--env",
  `MCP_SERVER_API_KEY=${mcpApiKey}`,
  "--",
  "npx",
  "-y",
  "@spawn-dock/mcp",
]

export const buildTonConnectManifest = (
  context: ProjectContext,
  claim: BootstrapClaim,
): string =>
  `${JSON.stringify(
    {
      url: claim.previewOrigin,
      name: context.projectName,
      iconUrl: `${claim.previewOrigin}/favicon.ico`,
    },
    null,
    2,
  )}\n`

export const buildProjectMcpConfig = (): string =>
  `${JSON.stringify(
    {
      mcpServers: {
        spawndock: {
          type: "stdio",
          command: "node",
          args: ["./spawndock/mcp.mjs"],
        },
      },
    },
    null,
    2,
  )}\n`

export const buildOpenCodeConfig = (): string =>
  `${JSON.stringify(
    {
      $schema: "https://opencode.ai/config.json",
      mcp: {
        spawndock: {
          type: "local",
          command: ["node", "./spawndock/mcp.mjs"],
          enabled: true,
        },
      },
    },
    null,
    2,
  )}\n`

export const buildGeneratedFiles = (
  context: ProjectContext,
  claim: BootstrapClaim,
): ReadonlyArray<GeneratedFile> => {
  const previewPath = resolvePreviewPath(claim.previewOrigin)
  const previewHost = resolvePreviewHost(claim.previewOrigin)
  const mcpServerUrl = buildMcpServerUrl(claim.controlPlaneUrl)

  const appConfig = {
    templateId: context.templateId,
    projectId: claim.projectId,
    projectSlug: claim.projectSlug,
    projectName: context.projectName,
    controlPlaneUrl: claim.controlPlaneUrl,
    previewOrigin: claim.previewOrigin,
    previewPath,
    previewHost,
    localPort: claim.localPort,
    deviceSecret: claim.deviceSecret,
    mcpServerUrl,
    mcpApiKey: claim.mcpApiKey,
  }

  const env = {
    SPAWNDOCK_CONTROL_PLANE_URL: claim.controlPlaneUrl,
    SPAWNDOCK_PREVIEW_ORIGIN: claim.previewOrigin,
    SPAWNDOCK_PREVIEW_PATH: previewPath,
    SPAWNDOCK_ASSET_PREFIX: previewPath,
    SPAWNDOCK_PREVIEW_HOST: previewHost,
    SPAWNDOCK_SERVER_ACTIONS_ALLOWED_ORIGINS: previewHost,
    SPAWNDOCK_DEVICE_SECRET: claim.deviceSecret,
    SPAWNDOCK_PROJECT_ID: claim.projectId,
    SPAWNDOCK_PROJECT_SLUG: claim.projectSlug,
    SPAWNDOCK_ALLOWED_DEV_ORIGINS: claim.previewOrigin,
  }

  return [
    {
      path: "spawndock.config.json",
      content: `${JSON.stringify(appConfig, null, 2)}\n`,
    },
    {
      path: ".env.local",
      content: `${Object.entries(env)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n")}\n`,
    },
    {
      path: "spawndock.dev-tunnel.json",
      content: `${JSON.stringify(
        {
          controlPlane: claim.controlPlaneUrl,
          projectSlug: claim.projectSlug,
          deviceSecret: claim.deviceSecret,
          port: claim.localPort,
        },
        null,
        2,
      )}\n`,
    },
    {
      path: "public/tonconnect-manifest.json",
      content: buildTonConnectManifest(context, claim),
    },
    {
      path: ".mcp.json",
      content: buildProjectMcpConfig(),
    },
    {
      path: "opencode.json",
      content: buildOpenCodeConfig(),
    },
  ]
}

export const patchPackageJsonContent = (input: string): string => {
  const packageJson = JSON.parse(input) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    packageManager?: string
    scripts?: Record<string, string>
  }

  packageJson.packageManager = GENERATED_PACKAGE_MANAGER

  packageJson.scripts = {
    ...(packageJson.scripts ?? {}),
    dev: "node ./spawndock/dev.mjs",
    "dev:next": "node ./spawndock/next.mjs",
    "dev:tunnel": "node ./spawndock/tunnel.mjs",
    "publish:github-pages": "node ./spawndock/publish.mjs",
    "agent:session": "spawn-dock session",
  }

  packageJson.devDependencies = {
    ...(packageJson.devDependencies ?? {}),
    "@spawn-dock/cli": "latest",
    "@spawn-dock/dev-tunnel": "latest",
    "@spawn-dock/mcp": "latest",
  }

  return `${JSON.stringify(packageJson, null, 2)}\n`
}
