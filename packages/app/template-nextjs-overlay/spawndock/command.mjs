export function resolveCommand(command, platform = process.platform) {
  return platform === "win32" ? command : command
}

export function resolveSpawnOptions(command, platform = process.platform) {
  if (platform !== "win32") {
    return {}
  }

  return {
    shell: true,
    windowsHide: true,
  }
}

export function trimOutput(value) {
  return typeof value === "string" ? value.trim() : ""
}
