#!/usr/bin/env node
import { runCli } from "./run.mjs"

process.exit(runCli(process.argv.slice(2)))
