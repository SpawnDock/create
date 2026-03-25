#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import process from "node:process"

const API_URL = "https://spawn-dock.w3voice.net/knowledge/api/v1/search"

const printUsage = () => {
  console.log(`Usage: node scripts/search_tma_knowledge.mjs "<query>" [options]

Options:
  --locale <locale>       Response locale (default: en)
  --api-token <token>     Optional Bearer token override
  --config <path>         Optional path to spawndock.config.json
  --timeout <seconds>     HTTP timeout in seconds (default: 20)
  --retries <count>       Retry count for transient HTTP 5xx failures (default: 2)
  --raw                   Print raw JSON response
  -h, --help              Show this help text`)
}

const readOptionValue = (argv, index, optionName) => {
  const value = argv[index]
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing value for ${optionName}`)
  }

  return value
}

const parseTimeout = (rawValue) => {
  const timeout = Number.parseFloat(rawValue)
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error("Timeout must be a positive number.")
  }

  return timeout
}

const parseRetries = (rawValue) => {
  const retries = Number.parseInt(rawValue, 10)
  if (!Number.isInteger(retries) || retries < 0) {
    throw new Error("Retries must be a non-negative integer.")
  }

  return retries
}

const parseArgs = (argv) => {
  const options = {
    help: false,
    locale: "en",
    apiToken: "",
    config: "",
    timeoutSeconds: 20,
    raw: false,
    retries: 2,
    query: "",
  }
  const positionals = []

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    switch (arg) {
      case "-h":
      case "--help":
        options.help = true
        break
      case "--locale":
        index += 1
        options.locale = readOptionValue(argv, index, arg)
        break
      case "--api-token":
        index += 1
        options.apiToken = readOptionValue(argv, index, arg)
        break
      case "--config":
        index += 1
        options.config = readOptionValue(argv, index, arg)
        break
      case "--timeout":
        index += 1
        options.timeoutSeconds = parseTimeout(readOptionValue(argv, index, arg))
        break
      case "--retries":
        index += 1
        options.retries = parseRetries(readOptionValue(argv, index, arg))
        break
      case "--raw":
        options.raw = true
        break
      default:
        if (arg.startsWith("--")) {
          throw new Error(`Unknown option: ${arg}`)
        }
        positionals.push(arg)
        break
    }
  }

  if (!options.help) {
    if (positionals.length === 0) {
      throw new Error("Missing query.")
    }

    options.query = positionals.join(" ")
  }

  return options
}

const expandHomePath = (inputPath) => {
  if (!inputPath.startsWith("~")) {
    return inputPath
  }

  const home = process.env["HOME"]
  if (!home || home.length === 0) {
    return inputPath
  }

  if (inputPath === "~") {
    return home
  }

  if (inputPath.startsWith("~/")) {
    return join(home, inputPath.slice(2))
  }

  return inputPath
}

const findConfigPath = (explicitPath) => {
  if (explicitPath.length > 0) {
    const resolvedPath = resolve(expandHomePath(explicitPath))
    return existsSync(resolvedPath) ? resolvedPath : null
  }

  let currentDir = process.cwd()

  while (true) {
    const candidate = join(currentDir, "spawndock.config.json")
    if (existsSync(candidate)) {
      return candidate
    }

    const parentDir = dirname(currentDir)
    if (parentDir === currentDir) {
      break
    }
    currentDir = parentDir
  }

  return null
}

const readConfigApiToken = (configPath) => {
  if (!configPath) {
    return null
  }

  try {
    const data = JSON.parse(readFileSync(configPath, "utf8"))
    const token = data?.apiToken
    return typeof token === "string" && token.trim().length > 0 ? token.trim() : null
  } catch {
    return null
  }
}

const resolveApiToken = (cliToken, configPath) => {
  if (cliToken.trim().length > 0) {
    return cliToken.trim()
  }

  for (const key of ["SPAWNDOCK_API_TOKEN", "API_TOKEN"]) {
    const value = process.env[key]
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }

  return readConfigApiToken(configPath)
}

const sleep = (ms) => new Promise((resolveSleep) => {
  setTimeout(resolveSleep, ms)
})

const parseJsonResponse = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Invalid JSON response from knowledge API:\n${text}`)
  }
}

const requestKnowledge = async (query, locale, timeoutSeconds, retries, apiToken) => {
  const payload = JSON.stringify({ query, locale })

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const headers = {
      accept: "application/json",
      "content-type": "application/json",
    }

    if (apiToken) {
      headers.authorization = `Bearer ${apiToken}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000)

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers,
        body: payload,
        signal: controller.signal,
      })
      const responseText = await response.text()

      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          await sleep(Math.min(2 ** attempt, 5) * 1000)
          continue
        }

        throw new Error(`HTTP error: ${response.status}\n${responseText}`)
      }

      return parseJsonResponse(responseText)
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timed out after ${timeoutSeconds} seconds.`)
      }

      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw new Error("Unreachable retry loop")
}

const formatResponse = (data) => {
  const lines = []
  const answer = data?.answer
  const sources = Array.isArray(data?.sources) ? data.sources : []
  const meta = data?.meta && typeof data.meta === "object" ? data.meta : null

  lines.push("Answer:")
  lines.push(typeof answer === "string" && answer.length > 0 ? answer : "(empty)")

  if (sources.length > 0) {
    lines.push("")
    lines.push("Sources:")

    sources.forEach((source, index) => {
      if (source && typeof source === "object") {
        const title = source.title || source.name || `Source ${index + 1}`
        const url = source.url || source.href || ""
        const snippet = source.snippet || source.text || ""
        let line = `${index + 1}. ${title}`

        if (url) {
          line += ` - ${url}`
        }

        lines.push(line)

        if (snippet) {
          lines.push(`   ${snippet}`)
        }

        return
      }

      lines.push(`${index + 1}. ${String(source)}`)
    })
  }

  if (meta) {
    lines.push("")
    lines.push("Meta:")
    lines.push(JSON.stringify(meta, null, 2))
  }

  return lines.join("\n")
}

const main = async () => {
  let options

  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    console.error("")
    printUsage()
    return 1
  }

  if (options.help) {
    printUsage()
    return 0
  }

  const configPath = findConfigPath(options.config)
  const apiToken = resolveApiToken(options.apiToken, configPath)

  try {
    const data = await requestKnowledge(
      options.query,
      options.locale,
      options.timeoutSeconds,
      options.retries,
      apiToken,
    )

    if (options.raw) {
      console.log(JSON.stringify(data, null, 2))
    } else {
      console.log(formatResponse(data))
    }

    return 0
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return 1
  }
}

process.exitCode = await main()
