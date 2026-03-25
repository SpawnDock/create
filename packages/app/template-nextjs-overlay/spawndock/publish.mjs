import { execFileSync, spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { resolveCommand, resolveSpawnOptions, trimOutput } from "./command.mjs"
import { readSpawndockConfig } from "./config.mjs"

const cwd = process.cwd()
const config = readSpawndockConfig(cwd)

runBuild()

const owner = trimOutput(readGh("api", "user", "--jq", ".login"))
const repoName = trimOutput(config.projectSlug)
const repoFullName = `${owner}/${repoName}`
const remoteUrl = ensureRepository(repoFullName)
deployToGhPagesBranch(remoteUrl)
enablePages(repoFullName)

console.log(`GitHub Pages URL: https://${owner}.github.io/${repoName}/`)

function runBuild() {
  run("pnpm", ["exec", "next", "build"], {
    ...process.env,
    SPAWNDOCK_GITHUB_PAGES_EXPORT: "1",
  })

  if (!existsSync(resolve(cwd, "out"))) {
    throw new Error("Static export output was not generated. Check your Next.js routes for export compatibility.")
  }
}

function ensureRepository(repoFullName) {
  const currentOrigin = getOriginUrl()
  if (currentOrigin && !currentOrigin.includes("SpawnDock/tma-project")) {
    return currentOrigin
  }

  try {
    readGh("repo", "view", repoFullName, "--json", "name")
  } catch {
    readGh("repo", "create", repoFullName, "--public", "--source", ".", "--remote", "origin", "--push")
  }

  run("git", ["remote", "set-url", "origin", `https://github.com/${repoFullName}.git`])
  return `https://github.com/${repoFullName}.git`
}

function deployToGhPagesBranch(remoteUrl) {
  const tempDir = mkdtempSync(join(tmpdir(), "spawndock-gh-pages-"))
  try {
    const branchExists = remoteBranchExists("gh-pages")
    if (branchExists) {
      run("git", ["worktree", "add", "-B", "gh-pages", tempDir, "origin/gh-pages"])
    } else {
      run("git", ["worktree", "add", "--detach", tempDir])
      run("git", ["-C", tempDir, "checkout", "--orphan", "gh-pages"])
    }

    clearDirectory(tempDir)
    cpSync(resolve(cwd, "out"), tempDir, { recursive: true })
    writeFileSync(join(tempDir, ".nojekyll"), "")

    run("git", ["-C", tempDir, "add", "--all"])
    run("git", ["-C", tempDir, "commit", "-m", "Deploy SpawnDock app to GitHub Pages"], undefined, true)
    run("git", ["-C", tempDir, "push", remoteUrl, "gh-pages", "--force"])
  } finally {
    const gitCommand = resolveCommand("git")
    spawnSync(gitCommand, ["worktree", "remove", tempDir, "--force"], {
      cwd,
      stdio: "ignore",
      ...resolveSpawnOptions(gitCommand),
    })
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function enablePages(repoFullName) {
  const args = [
    "api",
    `repos/${repoFullName}/pages`,
    "--method",
    "POST",
    "-f",
    "source[branch]=gh-pages",
    "-f",
    "source[path]=/",
  ]

  try {
    readGh(...args)
  } catch {
    readGh(
      "api",
      `repos/${repoFullName}/pages`,
      "--method",
      "PUT",
      "-f",
      "source[branch]=gh-pages",
      "-f",
      "source[path]=/",
    )
  }
}

function remoteBranchExists(branch) {
  const gitCommand = resolveCommand("git")
  const result = spawnSync(gitCommand, ["ls-remote", "--heads", "origin", branch], {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    ...resolveSpawnOptions(gitCommand),
  })

  return result.status === 0 && trimOutput(result.stdout).length > 0
}

function getOriginUrl() {
  const gitCommand = resolveCommand("git")
  const result = spawnSync(gitCommand, ["remote", "get-url", "origin"], {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    ...resolveSpawnOptions(gitCommand),
  })

  return result.status === 0 ? trimOutput(result.stdout) : null
}

function clearDirectory(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".git") continue
    rmSync(join(dir, entry), { recursive: true, force: true })
  }
}

function readGh(...args) {
  const ghCommand = resolveCommand("gh")
  const result = spawnSync(ghCommand, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    ...resolveSpawnOptions(ghCommand),
  })

  if (result.status !== 0) {
    throw new Error(
      trimOutput(result.stderr) || trimOutput(result.stdout) || `gh ${args.join(" ")} failed`,
    )
  }

  return result.stdout
}

function run(command, args, env = process.env, allowEmptyCommit = false) {
  const finalArgs = allowEmptyCommit
    ? [...args, "--allow-empty"]
    : args

  const resolvedCommand = resolveCommand(command)
  const result = spawnSync(resolvedCommand, finalArgs, {
    cwd,
    env,
    encoding: "utf8",
    stdio: "inherit",
    ...resolveSpawnOptions(resolvedCommand),
  })

  if (result.status !== 0) {
    throw new Error(`${command} ${finalArgs.join(" ")} failed`)
  }
}
