import { Effect } from "effect"
import {
  DEFAULT_CLAIM_PATH,
  DEFAULT_CONTROL_PLANE_URL,
  DEFAULT_PROJECT_DIR,
  DEFAULT_TEMPLATE_BRANCH,
  DEFAULT_TEMPLATE_REPO,
  type CliOptions,
} from "../core/bootstrap.js"

export const formatUsage = (
  invocation = "npx @spawn-dock/create-spawn-dock --token <pairing-token> [project-dir]",
): string => `Usage: ${invocation}`

export const parseArgs = (
  argv: ReadonlyArray<string>,
  env: NodeJS.ProcessEnv = process.env,
): CliOptions => {
  const result: {
    token: string
    controlPlaneUrl: string
    claimPath: string
    projectDir: string
    templateRepo: string
    templateBranch: string
  } = {
    token: "",
    controlPlaneUrl: env["SPAWNDOCK_CONTROL_PLANE_URL"] ?? DEFAULT_CONTROL_PLANE_URL,
    claimPath: env["SPAWNDOCK_CLAIM_PATH"] ?? DEFAULT_CLAIM_PATH,
    projectDir: DEFAULT_PROJECT_DIR,
    templateRepo: env["SPAWNDOCK_TEMPLATE_REPO"] ?? DEFAULT_TEMPLATE_REPO,
    templateBranch: env["SPAWNDOCK_TEMPLATE_BRANCH"] ?? DEFAULT_TEMPLATE_BRANCH,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === undefined) {
      continue
    }

    if (value === "--token") {
      result.token = argv[index + 1] ?? ""
      index += 1
      continue
    }

    if (value.startsWith("--token=")) {
      result.token = value.slice("--token=".length)
      continue
    }

    if (value === "--control-plane-url") {
      result.controlPlaneUrl = argv[index + 1] ?? DEFAULT_CONTROL_PLANE_URL
      index += 1
      continue
    }

    if (value.startsWith("--control-plane-url=")) {
      result.controlPlaneUrl = value.slice("--control-plane-url=".length)
      continue
    }

    if (value === "--claim-path") {
      result.claimPath = argv[index + 1] ?? DEFAULT_CLAIM_PATH
      index += 1
      continue
    }

    if (value.startsWith("--claim-path=")) {
      result.claimPath = value.slice("--claim-path=".length)
      continue
    }

    if (value === "--template-repo") {
      result.templateRepo = argv[index + 1] ?? DEFAULT_TEMPLATE_REPO
      index += 1
      continue
    }

    if (value.startsWith("--template-repo=")) {
      result.templateRepo = value.slice("--template-repo=".length)
      continue
    }

    if (value === "--template-branch") {
      result.templateBranch = argv[index + 1] ?? DEFAULT_TEMPLATE_BRANCH
      index += 1
      continue
    }

    if (value.startsWith("--template-branch=")) {
      result.templateBranch = value.slice("--template-branch=".length)
      continue
    }

    if (value.startsWith("--")) {
      continue
    }

    if (result.projectDir === DEFAULT_PROJECT_DIR) {
      result.projectDir = value
    }
  }

  return result satisfies CliOptions
}

export const readCliOptions = Effect.sync(() => parseArgs(process.argv.slice(2), process.env))
