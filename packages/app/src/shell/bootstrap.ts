import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { spawnSync, type SpawnSyncReturns } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join, resolve } from "node:path"
import { Effect } from "effect"
import {
  buildCodexMcpCommandArgs,
  buildGeneratedFiles,
  buildMcpServerUrl,
  DEFAULT_INSPECT_PATH,
  DEFAULT_MCP_AGENTS,
  resolveClaimPath,
  type BootstrapClaim,
  type BootstrapSummary,
  type CliOptions,
  type PairingTokenInspection,
  patchPackageJsonContent,
  resolveProjectContext,
} from "../core/bootstrap.js"

const TEMPLATE_OVERLAY_DIR = resolve(
  fileURLToPath(new URL("../../../template-nextjs-overlay", import.meta.url)),
)

interface BootstrapPreflightTarget {
  readonly projectDir: string
  readonly claimProjectId: string | undefined
}

export const bootstrapProject = (
  options: CliOptions,
): Effect.Effect<BootstrapSummary, Error> =>
  Effect.gen(function* () {
    if (options.token.length === 0) {
      yield* Effect.fail(new Error("Missing pairing token."))
    }

    const preflight = yield* resolveBootstrapTarget(options)

    const claim = yield* claimProject(
      options.controlPlaneUrl,
      options.claimPath,
      preflight.claimProjectId ?? options.projectId,
      {
        token: options.token,
        ["localPort"]: 3000,
      },
    )

    const projectDir = preflight.projectDir.length > 0
      ? preflight.projectDir
      : resolve(process.cwd(), claim.projectSlug)
    const context = resolveProjectContext(projectDir)

    if (preflight.projectDir.length === 0) {
      yield* ensureEmptyProjectDir(projectDir)
      yield* ensureParentDirectory(projectDir)
    } else {
      yield* ensureParentDirectory(projectDir)
    }

    yield* cloneTemplateRepo(projectDir, options.templateRepo, options.templateBranch)
    yield* applyTemplateOverlay(projectDir)

    yield* writeGeneratedFilesToProject(projectDir, context, claim)
    yield* installDependencies(projectDir)
    const mcpAgents = yield* registerAgentIntegrations(projectDir, claim)

    return {
      projectDir,
      projectName: context.projectName,
      previewOrigin: claim.previewOrigin,
      mcpAgents,
    }
  })

const resolveBootstrapTarget = (
  options: CliOptions,
): Effect.Effect<BootstrapPreflightTarget, Error> =>
  Effect.gen(function* () {
    if (options.projectDir.length > 0) {
      const projectDir = resolve(process.cwd(), options.projectDir)
      yield* ensureEmptyProjectDir(projectDir)

      return {
        projectDir,
        claimProjectId: options.projectId,
      }
    }

    const inspection = yield* inspectProject(options.controlPlaneUrl, options.token)

    if (inspection === null) {
      return {
        projectDir: "",
        claimProjectId: options.projectId,
      }
    }

    const projectDir = resolve(process.cwd(), inspection.projectSlug)
    yield* ensureEmptyProjectDir(projectDir)

    return {
      projectDir,
      claimProjectId: inspection.projectId,
    }
  })

const ensureEmptyProjectDir = (projectDir: string): Effect.Effect<void, Error> =>
  Effect.try({
    try: () => {
      try {
        const entries = readdirSync(projectDir)
        if (entries.length > 0) {
          throw new Error(`Target directory is not empty: ${projectDir}`)
        }
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
          return
        }

        throw toError(error)
      }
    },
    catch: toError,
  })

const ensureParentDirectory = (projectDir: string): Effect.Effect<void, Error> =>
  Effect.try({
    try: () => {
      mkdirSync(dirname(projectDir), { recursive: true })
    },
    catch: toError,
  })

const cloneTemplateRepo = (
  projectDir: string,
  templateRepo: string,
  templateBranch: string,
): Effect.Effect<void, Error> =>
  runCommand("git", [
    "clone",
    "--depth",
    "1",
    "--branch",
    templateBranch,
    templateRepo,
    projectDir,
  ]).pipe(Effect.asVoid)

const applyTemplateOverlay = (projectDir: string): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    yield* copyOverlayTree(TEMPLATE_OVERLAY_DIR, projectDir)
    yield* patchPackageJson(projectDir)
  })

const copyOverlayTree = (
  sourceDir: string,
  targetDir: string,
): Effect.Effect<void, Error> =>
  Effect.try({
    try: () => {
      copyOverlayTreeSync(sourceDir, targetDir)
    },
    catch: toError,
  })

const patchPackageJson = (projectDir: string): Effect.Effect<void, Error> =>
  Effect.try({
    try: () => {
      const packageJsonPath = join(projectDir, "package.json")
      const content = readFileSync(packageJsonPath, "utf8")
      writeFileSync(packageJsonPath, patchPackageJsonContent(content), "utf8")
    },
    catch: toError,
  })

const claimProject = (
  controlPlaneUrl: string,
  claimPath: string,
  projectId: string | undefined,
  payload: Record<string, string | number>,
): Effect.Effect<BootstrapClaim, Error> =>
  Effect.tryPromise({
    try: async () => {
      const normalizedControlPlaneUrl = controlPlaneUrl.replace(/\/$/, "")
      const resolvedClaimPath = resolveClaimPath(claimPath, projectId)
      const response = await fetch(`${normalizedControlPlaneUrl}${resolvedClaimPath}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }))
        const errorCode = isRecord(body) ? readString(body, "error") : null
        throw new Error(formatClaimError(response.status, errorCode))
      }

      const json = (await response.json()) as unknown
      const parsed = parseClaimResponse(
        json,
        payload["projectSlug"],
        normalizedControlPlaneUrl,
        payload["localPort"],
      )

      if (parsed === null) {
        throw new Error("SpawnDock control plane response is missing required bootstrap fields")
      }

      return parsed
    },
    catch: toError,
  })

const inspectProject = (
  controlPlaneUrl: string,
  token: string,
): Effect.Effect<PairingTokenInspection | null, Error> =>
  Effect.tryPromise({
    try: async () => {
      const normalizedControlPlaneUrl = controlPlaneUrl.replace(/\/$/, "")
      const response = await fetch(`${normalizedControlPlaneUrl}${DEFAULT_INSPECT_PATH}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        const body = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }))
        const errorCode = isRecord(body) ? readString(body, "error") : null

        if (response.status === 409 && errorCode === "TokenAlreadyClaimed") {
          return null
        }

        throw new Error(formatInspectError(response.status, errorCode))
      }

      const json = (await response.json()) as unknown
      const parsed = parseInspectResponse(json)

      if (parsed === null) {
        throw new Error("SpawnDock control plane inspect response is missing required project fields")
      }

      return parsed
    },
    catch: toError,
  })

const writeGeneratedFilesToProject = (
  projectDir: string,
  context: ReturnType<typeof resolveProjectContext>,
  claim: BootstrapClaim,
): Effect.Effect<void, Error> =>
  Effect.try({
    try: () => {
      for (const file of buildGeneratedFiles(context, claim)) {
        const targetPath = join(projectDir, file.path)
        mkdirSync(dirname(targetPath), { recursive: true })
        writeFileSync(targetPath, file.content, "utf8")
      }
    },
    catch: toError,
  })

const installDependencies = (projectDir: string): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const corepackResult = yield* runCommand("corepack", ["pnpm", "install"], projectDir, false)
    if (corepackResult.status === 0) {
      return
    }

    yield* runCommand("pnpm", ["install"], projectDir)
  })

const registerAgentIntegrations = (
  projectDir: string,
  claim: BootstrapClaim,
): Effect.Effect<ReadonlyArray<string>, Error> =>
  Effect.gen(function* () {
    const integrations: string[] = [...DEFAULT_MCP_AGENTS]
    const mcpServerUrl = buildMcpServerUrl(claim.controlPlaneUrl)
    const codexRegistered = yield* registerCodexIntegration(projectDir, mcpServerUrl, claim.mcpApiKey)

    if (codexRegistered) {
      integrations.push("Codex")
    }

    return integrations
  })

const registerCodexIntegration = (
  projectDir: string,
  mcpServerUrl: string,
  mcpApiKey: string,
): Effect.Effect<boolean, Error> =>
  Effect.gen(function* () {
    const codexAvailable = yield* commandExists("codex")

    if (!codexAvailable) {
      return false
    }

    const result = yield* runCommand(
      "codex",
      buildCodexMcpCommandArgs(mcpServerUrl, mcpApiKey),
      projectDir,
      false,
    )

    return result.status === 0
  })

const runCommand = (
  command: string,
  args: ReadonlyArray<string>,
  cwd = process.cwd(),
  failOnNonZero = true,
): Effect.Effect<SpawnSyncReturns<string>, Error> =>
  Effect.try({
    try: () => {
      const result = spawnSync(command, [...args], {
        cwd,
        encoding: "utf8",
        stdio: "pipe",
      })

      if (failOnNonZero && result.status !== 0) {
        throw new Error(
          result.stderr.trim() ||
            result.stdout.trim() ||
            `Command failed: ${command} ${args.join(" ")}`,
        )
      }

      return result
    },
    catch: toError,
  })

const commandExists = (command: string): Effect.Effect<boolean, Error> =>
  Effect.try({
    try: () => {
      const result = spawnSync(command, ["--help"], {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "ignore",
      })

      if (result.error) {
        if (isNodeError(result.error) && result.error.code === "ENOENT") {
          return false
        }

        throw toError(result.error)
      }

      return true
    },
    catch: toError,
  })

const parseClaimResponse = (
  input: unknown,
  fallbackProjectSlug: string | number | undefined,
  fallbackControlPlaneUrl: string,
  fallbackLocalPort: string | number | undefined,
): BootstrapClaim | null => {
  if (!isRecord(input)) {
    return null
  }

  const projectValue = input["project"]
  const project = isRecord(projectValue) ? projectValue : {}
  const projectId = readString(input, "projectId") ?? readString(project, "id")
  const projectSlug =
    readString(input, "projectSlug") ??
    readString(input, "slug") ??
    readString(project, "slug") ??
    (typeof fallbackProjectSlug === "string" ? fallbackProjectSlug : null)
  const controlPlaneUrl = readString(input, "controlPlaneUrl") ?? fallbackControlPlaneUrl
  const previewOrigin =
    readString(input, "previewOrigin") ??
    readString(input, "launchUrl") ??
    readString(input, "staticAssetsBaseUrl") ??
    readString(input, "url")
  const deviceSecret =
    readString(input, "deviceSecret") ??
    readString(input, "deviceToken") ??
    readString(input, "deployToken") ??
    readString(input, "token")
  const mcpApiKey =
    readString(input, "mcpApiKey") ??
    readString(input, "mcpToken")
  const localPort =
    readNumber(input, "localPort") ??
    (typeof fallbackLocalPort === "number" ? fallbackLocalPort : 3000)

  if (
    projectId === null ||
    projectSlug === null ||
    previewOrigin === null ||
    deviceSecret === null ||
    mcpApiKey === null
  ) {
    return null
  }

  return {
    projectId,
    projectSlug,
    controlPlaneUrl,
    previewOrigin,
    deviceSecret,
    mcpApiKey,
    localPort,
  }
}

const parseInspectResponse = (
  input: unknown,
): PairingTokenInspection | null => {
  if (!isRecord(input)) {
    return null
  }

  const projectValue = input["project"]
  const project = isRecord(projectValue) ? projectValue : {}
  const projectId = readString(input, "projectId") ?? readString(project, "id")
  const projectSlug = readString(input, "projectSlug") ?? readString(project, "slug")

  if (projectId === null || projectSlug === null) {
    return null
  }

  return {
    projectId,
    projectSlug,
  }
}

const readNumber = (input: Record<string, unknown>, key: string): number | null => {
  const value = input[key]
  return typeof value === "number" ? value : null
}

const readString = (input: Record<string, unknown>, key: string): string | null => {
  const value = input[key]
  return typeof value === "string" ? value : null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error

const toError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause))

const formatClaimError = (status: number, errorCode: string | null): string => {
  if (status === 410 || errorCode === "TokenExpired") {
    return "Pairing token expired. Create a new project in the SpawnDock bot and rerun bootstrap."
  }

  if (status === 409 || errorCode === "TokenAlreadyClaimed") {
    return "Pairing token was already used. Create a new project in the SpawnDock bot and rerun bootstrap."
  }

  if (status === 404 || errorCode === "TokenNotFound" || errorCode === "project_not_found") {
    return "Pairing token is invalid for this project. Create a new project in the SpawnDock bot and rerun bootstrap."
  }

  return `SpawnDock control plane claim failed: ${status}`
}

const formatInspectError = (status: number, errorCode: string | null): string => {
  if ((status === 404 || status === 405) && !isKnownClaimErrorCode(errorCode)) {
    return "SpawnDock control plane cannot inspect pairing tokens yet. Rerun bootstrap with an explicit target directory or upgrade the control plane."
  }

  return formatClaimError(status, errorCode)
}

const isKnownClaimErrorCode = (errorCode: string | null): boolean =>
  errorCode === "TokenExpired" ||
  errorCode === "TokenAlreadyClaimed" ||
  errorCode === "TokenNotFound" ||
  errorCode === "project_not_found"

const copyOverlayTreeSync = (sourceDir: string, targetDir: string): void => {
  const entries = readdirSync(sourceDir, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name)
    const targetPath = join(targetDir, entry.name)

    if (entry.isDirectory()) {
      mkdirSync(targetPath, { recursive: true })
      copyOverlayTreeSync(sourcePath, targetPath)
      continue
    }

    const content = readFileSync(sourcePath, "utf8")
    mkdirSync(dirname(targetPath), { recursive: true })
    writeFileSync(targetPath, content, "utf8")
  }
}
