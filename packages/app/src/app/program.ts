import { Console, Effect, pipe } from "effect"
import type { BootstrapSummary } from "../core/bootstrap.js"
import { bootstrapProject } from "../shell/bootstrap.js"
import { formatUsage, readCliOptions } from "../shell/cli.js"

const formatSuccess = (summary: BootstrapSummary): string =>
  [
    "",
    `SpawnDock project created at ${summary.projectDir}`,
    `Project: ${summary.projectName}`,
    `Preview URL: ${summary.previewOrigin}`,
    `MCP ready for: ${summary.mcpAgents.join(", ")}`,
    `Run: cd "${summary.projectDir}" && npm run dev`,
  ].join("\n")

const cliProgram = pipe(
  readCliOptions,
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
