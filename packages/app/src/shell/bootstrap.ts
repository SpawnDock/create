import { mkdirSync, readdirSync, writeFileSync } from "node:fs"
import { spawnSync, type SpawnSyncReturns } from "node:child_process"
import { dirname, join, resolve } from "node:path"
import { Effect } from "effect"
import {
  buildGeneratedFiles,
  type BootstrapClaim,
  type BootstrapSummary,
  type CliOptions,
  resolveProjectContext,
} from "../core/bootstrap.js"

export const bootstrapProject = (
  options: CliOptions,
): Effect.Effect<BootstrapSummary, Error> =>
  Effect.gen(function* () {
    if (options.token.length === 0) {
      yield* Effect.fail(new Error("Missing pairing token."))
    }

    const projectDir = resolve(process.cwd(), options.projectDir)
    const context = resolveProjectContext(projectDir)

    yield* ensureEmptyProjectDir(projectDir)
    yield* ensureParentDirectory(projectDir)
    yield* cloneTemplateRepo(projectDir, options.templateRepo, options.templateBranch)

    const claim = yield* claimProject(
      options.controlPlaneUrl,
      options.claimPath,
      {
        token: options.token,
        ["projectSlug"]: context.projectSlug,
        projectName: context.projectName,
        templateId: context.templateId,
        ["localPort"]: 3000,
      },
    )

    yield* writeGeneratedFilesToProject(projectDir, context, claim)
    yield* installDependencies(projectDir)

    return {
      projectDir,
      projectName: context.projectName,
      previewOrigin: claim.previewOrigin,
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

const claimProject = (
  controlPlaneUrl: string,
  claimPath: string,
  payload: Record<string, string | number>,
): Effect.Effect<BootstrapClaim, Error> =>
  Effect.tryPromise({
    try: async () => {
      const normalizedControlPlaneUrl = controlPlaneUrl.replace(/\/$/, "")
      const resolvedClaimPath = claimPath.startsWith("/") ? claimPath : `/${claimPath}`
      const response = await fetch(`${normalizedControlPlaneUrl}${resolvedClaimPath}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`SpawnDock control plane claim failed: ${response.status}`)
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
  const localPort =
    readNumber(input, "localPort") ??
    (typeof fallbackLocalPort === "number" ? fallbackLocalPort : 3000)

  if (
    projectId === null ||
    projectSlug === null ||
    previewOrigin === null ||
    deviceSecret === null
  ) {
    return null
  }

  return {
    projectId,
    projectSlug,
    controlPlaneUrl,
    previewOrigin,
    deviceSecret,
    localPort,
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
