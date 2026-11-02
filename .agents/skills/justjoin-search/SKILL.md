---
name: justjoin-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search IT / tech jobs in Poland on
  justjoin.it (Just Join IT) — developer, frontend, backend, fullstack, DevOps,
  data, QA, PM roles in Warszawa, Kraków, Wrocław, Gdańsk, Poznań, Łódź or
  remote — or look up a specific justjoin.it job offer. Returns salary ranges
  (B2B / UoP), seniority and required skills. Trigger phrases: justjoin,
  just join it, IT jobs in Poland, developer jobs Warsaw, oferty pracy IT,
  praca IT, praca programista, szukam pracy frontend, praca zdalna IT,
  ogłoszenia IT, widełki, B2B, UoP.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/justjoin-search/cli/src/cli.ts *)
---

# justjoin.it Search Skill

Search live IT job offers on [justjoin.it](https://justjoin.it), the largest Polish IT job
board, through the JSON API its own frontend uses. No authentication, no API key, and
**zero runtime dependencies** — it runs with just `bun`. Every result carries the
published salary range (per contract type: `b2b`, `permanent` = UoP, `mandate_contract` = zlecenie),
seniority and required skills.

## ⚠️ Personal use only

justjoin.it's `robots.txt` disallows `/api/`, which this skill calls. Use it **only for your
own job search, keep volume low** (a few searches at a time, no crawling or paging through
everything), and **don't use it commercially or for bulk data collection.** Run it on your
own responsibility.

## When to use this skill

- Search IT job offers in Poland by technology/keyword, city (or remote) and seniority
- Compare salary ranges (B2B vs UoP) and required skills across offers
- Get the full description of a specific justjoin.it offer

## Commands

### Search job offers

```bash
bun run .agents/skills/justjoin-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords (technology, title, skill), e.g. `react`, `frontend`, `java developer`.
- `--location <city>` / `-l <city>` — city, e.g. `Warszawa`, `Kraków`, `Wrocław`, `Gdańsk`. `Remote` (or `zdalnie`) switches to the fully-remote filter instead.
- `--seniority <list>` / `-s <list>` — comma list of `junior`, `mid`, `senior`, `manager`, `c_level`. Default: all levels.
- `--jobage <days>` — published within N days (filtered client-side on `publishedAt`).
- `--page <n>` — page number (1-indexed, 20 results per page; sorted by relevance when `--query` is given, otherwise newest first).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full offer detail

```bash
bun run .agents/skills/justjoin-search/cli/src/cli.ts detail <slug|url> [--format json|plain]
```

`slug` is the `id` from `search` results (e.g. `acme-senior-react-developer-warszawa-javascript`);
a full `https://justjoin.it/job-offer/<slug>` URL also works. Returns the full description,
all salary ranges, required and nice-to-have skills, languages, apply link, expiry and status.

## Usage examples

```bash
# Mid/senior React offers
bun run .agents/skills/justjoin-search/cli/src/cli.ts search -q react --seniority mid,senior --limit 10 --format table

# Frontend roles in Warszawa from the last 7 days
bun run .agents/skills/justjoin-search/cli/src/cli.ts search -q frontend -l Warszawa --jobage 7 --format table

# Fully remote TypeScript roles
bun run .agents/skills/justjoin-search/cli/src/cli.ts search -q typescript -l Remote --format plain

# Senior Java roles in Kraków, second page
bun run .agents/skills/justjoin-search/cli/src/cli.ts search -q java -l Kraków -s senior --page 2 --format table

# Full detail for one offer
bun run .agents/skills/justjoin-search/cli/src/cli.ts detail <slug> --format plain
```

## Output

Each search result has `id`, `title`, `company`, `location`, `date`, `url` plus
`locations`, `seniority`, `workplaceType`, `workingTime`, `salaryMin`, `salaryMax`,
`salaryCurrency`, `salaryPeriod` (`month`/`hour`/…), `contractType`, `salaries[]`
(every contract type the employer published), `skills[]` and `expiresAt`. Missing values
are `null`, never omitted; an undisclosed salary gives `null` amounts.

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading results or a single offer's full detail |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- Salaries are the employer's original figures (`currencySource: "original"`) per the published unit — an hourly B2B rate stays hourly. The API's currency conversions are dropped.
- `contractType` values seen live: `b2b`, `permanent` (umowa o pracę / UoP), `mandate_contract` (umowa zlecenie), `any`. `salaryPeriod` is `month`, `hour` or `day`.
- Keyword matching is the site's own "any" mode, so a broad term can match offers where it only appears in the description.
- An unknown `--seniority` value is rejected by the CLI because the API silently returns 0 results for it.
- The CLI retries 429/5xx with exponential backoff. Keep volume low (see the personal-use note).
- Live smoke test (not run in CI): `cd .agents/skills/justjoin-search/cli && LIVE=1 bun test tests/live.test.ts`.
