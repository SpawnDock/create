import { Console, Effect, pipe } from "effect"
import { type BootstrapSummary, validateNodeMajorVersion } from "../core/bootstrap.js"
import { bootstrapProject } from "../shell/bootstrap.js"
import { formatUsage, readCliOptions } from "../shell/cli.js"

export const formatSuccess = (summary: BootstrapSummary): string =>
  [
    "",
    `SpawnDock project created at ${summary.projectDir}`,
    `Project: ${summary.projectName}`,
    `Preview URL: ${summary.previewOrigin}`,
    `MCP ready for: ${summary.mcpAgents.join(", ")}`,
    "Dependencies already installed with pnpm.",
    `Run: cd "${summary.projectDir}" && pnpm run dev`,
  ].join("\n")

const cliProgram = pipe(
  readCliOptions,
  Effect.flatMap((options) => {
    const nodeVersionError = validateNodeMajorVersion(process.version)
    return nodeVersionError === null
      ? Effect.succeed(options)
      : Effect.fail(new Error(nodeVersionError))
  }),
  Effect.flatMap((options) =>
    options.token.length > 0
      ? bootstrapProject(options)
      : Effect.fail(new Error(formatUsage())),
  ),
)

export const program = Effect.matchEffect(cliProgram, {
  onFailure: (error) => Console.error(error.message),
  onSuccess: (summary) => Console.log(formatSuccess(summary)),
})
