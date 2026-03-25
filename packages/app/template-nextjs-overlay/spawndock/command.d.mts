export function resolveCommand(command: string, platform?: NodeJS.Platform): string
export function resolveSpawnOptions(
  command: string,
  platform?: NodeJS.Platform,
): {
  shell?: boolean
  windowsHide?: boolean
}
export function trimOutput(value: string | null | undefined): string
