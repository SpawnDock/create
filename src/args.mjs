export const DEFAULT_PROJECT_DIR = "spawndock-tma"
export const DEFAULT_CONTROL_PLANE_URL = "https://api.spawndock.app"
export const DEFAULT_CLAIM_PATH = "/v1/bootstrap/claim"
export const DEFAULT_TEMPLATE_REPO = "https://github.com/SpawnDock/tma-project.git"
export const DEFAULT_TEMPLATE_BRANCH = "master"
export const TEMPLATE_ID = "nextjs-template"

export const normalizeDisplayName = (value) =>
  value
    .split(/[^a-zA-Z0-9]+/g)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ")

export const parseArgs = (argv, env = process.env) => {
  const result = {
    token: "",
    controlPlaneUrl: env.SPAWNDOCK_CONTROL_PLANE_URL ?? DEFAULT_CONTROL_PLANE_URL,
    claimPath: env.SPAWNDOCK_CLAIM_PATH ?? DEFAULT_CLAIM_PATH,
    projectDir: DEFAULT_PROJECT_DIR,
    templateRepo: env.SPAWNDOCK_TEMPLATE_REPO ?? DEFAULT_TEMPLATE_REPO,
    templateBranch: env.SPAWNDOCK_TEMPLATE_BRANCH ?? DEFAULT_TEMPLATE_BRANCH
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

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

  return result
}
