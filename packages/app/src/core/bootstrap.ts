export const DEFAULT_PROJECT_DIR = "spawndock-tma"
export const DEFAULT_CONTROL_PLANE_URL = "https://api.spawndock.app"
export const DEFAULT_CLAIM_PATH = "/v1/bootstrap/claim"
export const DEFAULT_TEMPLATE_REPO = "https://github.com/SpawnDock/tma-project.git"
export const DEFAULT_TEMPLATE_BRANCH = "master"
export const TEMPLATE_ID = "nextjs-template"

export interface CliOptions {
  readonly token: string
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
  readonly localPort: number
}

export interface BootstrapSummary {
  readonly projectDir: string
  readonly projectName: string
  readonly previewOrigin: string
}

export interface GeneratedFile {
  readonly path: string
  readonly content: string
}

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

  const opencode = {
    $schema: "https://opencode.ai/config.json",
    mcp: {
      spawndock: {
        type: "local",
        command: ["npx", "-y", "@spawn-dock/mcp"],
        enabled: true,
        environment: {
          MCP_SERVER_URL: mcpServerUrl,
        },
      },
    },
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
      path: "opencode.json",
      content: `${JSON.stringify(opencode, null, 2)}\n`,
    },
    {
      path: "public/tonconnect-manifest.json",
      content: buildTonConnectManifest(context, claim),
    },
  ]
}
