const WINDOWS_COMMAND_OVERRIDES = {
  gh: "gh.exe",
  git: "git.exe",
  pnpm: "pnpm.cmd",
}

export function resolveCommand(command, platform = process.platform) {
  if (platform !== "win32") {
    return command
  }

  return WINDOWS_COMMAND_OVERRIDES[command] ?? command
}

export function trimOutput(value) {
  return typeof value === "string" ? value.trim() : ""
}
