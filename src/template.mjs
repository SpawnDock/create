import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import {
  DEFAULT_TEMPLATE_BRANCH,
  DEFAULT_TEMPLATE_REPO,
  TEMPLATE_ID,
  normalizeDisplayName
} from "./args.mjs"

export const TEMPLATE_OVERLAY_DIR = resolve(
  fileURLToPath(new URL("../template-nextjs-overlay", import.meta.url))
)

export const renderTemplate = (input, replacements) => {
  let output = input

  for (const [token, value] of Object.entries(replacements)) {
    output = output.split(token).join(String(value))
  }

  return output
}

export const resolveProjectContext = (projectDir) => {
  const projectSlug = projectDir.split(/[\\/]/g).filter(Boolean).at(-1) ?? projectDir

  return {
    projectDir,
    projectSlug,
    projectName: normalizeDisplayName(projectSlug),
    templateId: TEMPLATE_ID
  }
}

export const ensureEmptyProjectDir = (projectDir) => {
  try {
    const entries = readdirSync(projectDir)

    if (entries.length > 0) {
      throw new Error(`Target directory is not empty: ${projectDir}`)
    }
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return
    }

    if (error instanceof Error) {
      throw error
    }
  }
}

export const cloneTemplateRepo = (
  projectDir,
  templateRepo = DEFAULT_TEMPLATE_REPO,
  templateBranch = DEFAULT_TEMPLATE_BRANCH
) => {
  const cloneResult = spawnSync(
    "git",
    ["clone", "--depth", "1", "--branch", templateBranch, templateRepo, projectDir],
    {
      stdio: "inherit"
    }
  )

  if (cloneResult.status !== 0) {
    throw new Error(`Failed to clone template repository: ${templateRepo}`)
  }
}

export const copyOverlayTree = (sourceDir, targetDir, replacements) => {
  const entries = readdirSync(sourceDir, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name)
    const targetPath = join(targetDir, entry.name)

    if (entry.isDirectory()) {
      rmSync(targetPath, { force: true, recursive: true })
      mkdirSync(targetPath, { recursive: true })
      copyOverlayTree(sourcePath, targetPath, replacements)
      continue
    }

    const content = readFileSync(sourcePath, "utf8")
    const rendered = renderTemplate(content, replacements)

    writeFileSync(targetPath, rendered, "utf8")
  }
}

export const patchPackageJson = (projectDir) => {
  const packageJsonPath = join(projectDir, "package.json")
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"))

  packageJson.scripts = {
    ...(packageJson.scripts ?? {}),
    dev: "node ./spawndock/dev.mjs",
    "dev:next": "node ./spawndock/next.mjs",
    "dev:tunnel": "node ./spawndock/tunnel.mjs"
  }

  packageJson.devDependencies = {
    ...(packageJson.devDependencies ?? {}),
    "@spawn-dock/dev-tunnel": "latest"
  }

  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
}

export const writeRuntimeConfig = (projectDir, context, claim) => {
  const previewPath = resolvePreviewPath(claim.previewOrigin)
  const previewHost = resolvePreviewHost(claim.previewOrigin)
  const mcpServerUrl = buildMcpServerUrl(claim.controlPlaneUrl)
  const config = {
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
    mcpServerUrl
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
    SPAWNDOCK_ALLOWED_DEV_ORIGINS: claim.previewOrigin
  }

  writeFileSync(join(projectDir, "spawndock.config.json"), `${JSON.stringify(config, null, 2)}\n`)

  writeFileSync(
    join(projectDir, ".env.local"),
    `${Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`
  )

  writeFileSync(
    join(projectDir, "spawndock.dev-tunnel.json"),
    `${JSON.stringify(
      {
        controlPlane: claim.controlPlaneUrl,
        projectSlug: claim.projectSlug,
        deviceSecret: claim.deviceSecret,
        port: claim.localPort
      },
      null,
      2
    )}\n`
  )

  writeFileSync(
    join(projectDir, "opencode.json"),
    `${JSON.stringify(
      {
        $schema: "https://opencode.ai/config.json",
        mcp: {
          spawndock: {
            type: "local",
            command: ["npx", "-y", "@spawn-dock/mcp"],
            enabled: true,
            environment: {
              MCP_SERVER_URL: mcpServerUrl
            }
          }
        }
      },
      null,
      2
    )}\n`
  )
}

const buildMcpServerUrl = (controlPlaneUrl) => {
  const url = new URL(controlPlaneUrl)
  const normalizedPath = url.pathname.replace(/\/$/, "")
  url.pathname = normalizedPath.length > 0 ? `${normalizedPath}/mcp/sse` : "/mcp/sse"
  return url.toString()
}

export const installDependencies = (projectDir) => {
  const corepackResult = spawnSync("corepack", ["pnpm", "install"], {
    cwd: projectDir,
    stdio: "inherit"
  })

  if (corepackResult.status === 0) {
    return
  }

  const pnpmResult = spawnSync("pnpm", ["install"], {
    cwd: projectDir,
    stdio: "inherit"
  })

  if (pnpmResult.status !== 0) {
    throw new Error("Dependency installation failed")
  }
}

export const claimProject = (controlPlaneUrl, claimPath, payload) => {
  const resolvedClaimPath = claimPath ?? "/v1/bootstrap/claim"
  const request = spawnSync(
    "curl",
    [
      "-fsS",
      "-X",
      "POST",
      `${controlPlaneUrl.replace(/\/$/, "")}${resolvedClaimPath.startsWith("/") ? resolvedClaimPath : `/${resolvedClaimPath}`}`,
      "-H",
      "content-type: application/json",
      "--data-binary",
      JSON.stringify(payload)
    ],
    {
      encoding: "utf8"
    }
  )

  if (request.status !== 0) {
    throw new Error(request.stderr?.trim() || "Failed to claim the project in the SpawnDock control plane")
  }

  const response = JSON.parse(request.stdout)
  const project = response.project ?? {}
  const projectId = response.projectId ?? response.id ?? project.id
  const projectSlug = response.projectSlug ?? response.slug ?? project.slug ?? payload.projectSlug
  const resolvedControlPlaneUrl = response.controlPlaneUrl ?? controlPlaneUrl.replace(/\/$/, "")
  const previewOrigin =
    response.previewOrigin ?? response.launchUrl ?? response.staticAssetsBaseUrl ?? response.url
  const deviceSecret = response.deviceSecret ?? response.deviceToken ?? response.deployToken ?? response.token

  if (!projectId || !projectSlug || !previewOrigin || !deviceSecret) {
    throw new Error("SpawnDock control plane response is missing required bootstrap fields")
  }

  return {
    projectId,
    projectSlug,
    controlPlaneUrl: resolvedControlPlaneUrl,
    previewOrigin,
    deviceSecret,
    localPort: response.localPort ?? payload.localPort ?? 3000
  }
}

export const bootstrapTemplate = (projectDir, claim, context) => {
  const previewHost = resolvePreviewHost(claim.previewOrigin)
  const replacements = {
    __SPAWNDOCK_PROJECT_ID__: claim.projectId,
    __SPAWNDOCK_PROJECT_SLUG__: claim.projectSlug,
    __SPAWNDOCK_PROJECT_NAME__: context.projectName,
    __SPAWNDOCK_CONTROL_PLANE_URL__: claim.controlPlaneUrl,
    __SPAWNDOCK_PREVIEW_ORIGIN__: claim.previewOrigin,
    __SPAWNDOCK_PREVIEW_HOST__: previewHost,
    __SPAWNDOCK_DEVICE_SECRET__: claim.deviceSecret
  }

  copyOverlayTree(TEMPLATE_OVERLAY_DIR, projectDir, replacements)
  patchPackageJson(projectDir)
  writeRuntimeConfig(projectDir, context, claim)
}

const resolvePreviewPath = (previewOrigin) => {
  const url = new URL(previewOrigin)
  const normalizedPath = url.pathname.replace(/\/$/, "")

  return normalizedPath.length > 0 ? normalizedPath : ""
}

const resolvePreviewHost = (previewOrigin) => new URL(previewOrigin).host
