#!/usr/bin/env bun
// Self-contained CLI for searching jobs on rocketjobs.pl (Poland) through the
// JSON API its own frontend uses. No external CLI framework and zero runtime
// dependencies, so it runs anywhere `bun` is available.
//
// Personal use only. rocketjobs.pl's robots.txt disallows /api/; keep volume low
// and do not use it commercially or for bulk data collection.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { SENIORITY_LEVELS, PAGE_SIZE } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit", s: "seniority" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("-")) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const HELP = `rocketjobs-cli — search jobs on rocketjobs.pl (Poland)

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <slug|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>       Keywords (role, title, skill). e.g. "marketing", "rekruter".
  --location, -l <city>    City, e.g. "Warszawa", "Kraków", "Wrocław", or "Remote".
  --seniority, -s <list>   Comma list of ${SENIORITY_LEVELS.join(", ")}. Default: all.
  --jobage <days>          Published within N days (filtered client-side).
  --page <n>               1-indexed page (${PAGE_SIZE} results/page, newest first). Default 1.
  --limit, -n <n>          Cap results emitted (client-side).
  --format <fmt>           json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q marketing --seniority mid,senior --limit 5 --format table
  bun run src/cli.ts search -q rekruter -l Warszawa --jobage 7 --format table
  bun run src/cli.ts search -q "obsługa klienta" -l Remote --format plain
  bun run src/cli.ts detail <slug> --format plain

Personal use only — keep volume low (rocketjobs.pl robots.txt disallows /api/).
`

const KNOWN_FLAGS: Record<string, Set<string>> = {
  search: new Set(["query", "location", "seniority", "jobage", "page", "limit", "format", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
}

function fail(error: string, code: string): number {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
  return 1
}

function textFlag(flags: Flags, name: string): string | undefined | null {
  const v = flags[name]
  if (v === undefined) return undefined
  if (typeof v !== "string" || !v.trim()) return null
  return v.trim()
}

function intFlag(flags: Flags, name: string): number | undefined | null {
  const raw = flags[name]
  if (raw === undefined) return undefined
  const val = typeof raw === "string" ? Number(raw.trim()) : NaN
  if (!Number.isInteger(val) || val < (name === "limit" ? 0 : 1)) return null
  return val
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2))
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  // Unknown flags are rejected, never silently dropped: a discarded filter
  // changes what the search returns with no error.
  const known = KNOWN_FLAGS[cmd]
  if (known) {
    for (const key of Object.keys(flags)) {
      if (key === "_" || known.has(key)) continue
      return fail(`unknown flag --${key} for '${cmd}'; see --help for the supported flags`, "UNKNOWN_FLAG")
    }
  }

  if (cmd === "search") {
    const query = textFlag(flags, "query")
    if (query === null) return fail("--query requires a non-empty value", "BAD_ARG")
    const location = textFlag(flags, "location")
    if (location === null) return fail("--location requires a non-empty value", "BAD_ARG")

    const seniorityRaw = textFlag(flags, "seniority")
    if (seniorityRaw === null) return fail("--seniority requires a value", "BAD_ARG")
    const seniority = seniorityRaw ? seniorityRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : []
    const bad = seniority.filter((s) => !(SENIORITY_LEVELS as readonly string[]).includes(s))
    if (bad.length) {
      return fail(`--seniority values must be from ${SENIORITY_LEVELS.join("|")}, got "${bad.join(",")}"`, "BAD_ARG")
    }

    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) {
      return fail(`--format must be one of json|table|plain, got "${fmt}"`, "BAD_ARG")
    }

    const jobage = intFlag(flags, "jobage")
    if (jobage === null) return fail("--jobage must be a whole number of at least 1", "BAD_ARG")
    const page = intFlag(flags, "page")
    if (page === null) return fail("--page must be a whole number of at least 1", "BAD_ARG")
    const limit = intFlag(flags, "limit")
    if (limit === null) return fail("--limit must be a whole number of at least 0", "BAD_ARG")

    const opts: SearchOpts = {
      query,
      location,
      seniority: [...new Set(seniority)],
      jobage,
      page: page ?? 1,
      limit,
      format: fmt as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) return fail("detail requires an <slug|url>", "NO_ID")
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "plain"].includes(fmt)) return fail(`--format must be one of json|plain, got "${fmt}"`, "BAD_ARG")
    const opts: DetailOpts = { id, format: fmt as DetailOpts["format"] }
    return runDetail(opts)
  }

  return fail(`Unknown command "${cmd}"`, "BAD_CMD")
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    process.stderr.write(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e), code: "INTERNAL_ERROR" }) + "\n",
    )
    process.exit(1)
  })
