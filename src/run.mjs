import { dirname, resolve } from "node:path"
import { mkdirSync } from "node:fs"

import { DEFAULT_PROJECT_DIR, parseArgs } from "./args.mjs"
import {
  bootstrapTemplate,
  claimProject,
  cloneTemplateRepo,
  ensureEmptyProjectDir,
  installDependencies,
  resolveProjectContext
} from "./template.mjs"

const defaultUsage = "npx create-spawn-dock --token <pairing-token> [project-dir]"

export const formatUsage = (invocation = defaultUsage) => `Usage: ${invocation}`

export const runCli = (argv = process.argv.slice(2), options = {}) => {
  const invocation = options.invocation ?? defaultUsage

  try {
    const args = parseArgs(argv)

    if (!args.token) {
      console.error(formatUsage(invocation))
      return 1
    }

    const projectDir = resolve(process.cwd(), args.projectDir ?? DEFAULT_PROJECT_DIR)
    const context = resolveProjectContext(projectDir)

    ensureEmptyProjectDir(projectDir)
    mkdirSync(dirname(projectDir), { recursive: true })
    cloneTemplateRepo(projectDir, args.templateRepo, args.templateBranch)

    const claim = claimProject(args.controlPlaneUrl, args.claimPath, {
      token: args.token,
      projectSlug: context.projectSlug,
      projectName: context.projectName,
      templateId: context.templateId,
      localPort: 3000
    })

    bootstrapTemplate(projectDir, claim, context)
    installDependencies(projectDir)

    console.log("")
    console.log(`SpawnDock project created at ${projectDir}`)
    console.log(`Project: ${context.projectName}`)
    console.log(`Preview URL: ${claim.previewOrigin}`)
    console.log(`Run: cd "${projectDir}" && npm run dev`)

    return 0
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return 1
  }
}
