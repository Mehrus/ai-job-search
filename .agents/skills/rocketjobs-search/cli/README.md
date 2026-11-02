# rocketjobs-cli

CLI for searching job offers on [rocketjobs.pl](https://rocketjobs.pl) (Poland).

**Data source**: the JSON API rocketjobs.pl's own frontend uses (`/api/candidate-api/offers`).
**Authentication**: None required.
**Dependencies**: None (plain `bun` + `fetch`). `bun install` is optional and only pulls dev type defs.

> **Personal use only.** rocketjobs.pl's `robots.txt` disallows `/api/`. Keep volume low, don't
> use it commercially or for bulk data collection, and run it on your own responsibility.

## Installation

```bash
cd .agents/skills/rocketjobs-search/cli
bun install   # optional — only installs TypeScript dev types
```

## Commands

| Command | Description |
|---------|-------------|
| `search` | Search job offers (newest first) |
| `detail` | Fetch full detail for one offer by slug or URL |

`search` accepts `--format json|table|plain` (default `json`); `detail` accepts `--format json|plain`.
All errors are written to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Search flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--query` | `-q` | Keywords (role / title / skill). |
| `--location` | `-l` | City (`Warszawa`, `Kraków`, …) or `Remote`. |
| `--seniority` | `-s` | Comma list: `junior,mid,senior,manager,c_level`. Default: all. |
| `--jobage` | | Published within N days (client-side filter). |
| `--page` | | 1-indexed page (20 results/page). |
| `--limit` | `-n` | Cap results emitted. |
| `--format` | | `json` \| `table` \| `plain`. |

## Quick examples

```bash
bun run src/cli.ts search -q marketing --seniority mid,senior --limit 5 --format table
bun run src/cli.ts search -q rekruter -l Warszawa --jobage 7 --format table
bun run src/cli.ts detail <slug> --format plain
```

## Tests

```bash
bun run typecheck
bun run test                        # fixture/mock tests (what CI runs)
LIVE=1 bun test tests/live.test.ts  # one live search + detail against the portal
```

See `../SKILL.md` for the full reference and `../url-reference.md` for the API notes.
