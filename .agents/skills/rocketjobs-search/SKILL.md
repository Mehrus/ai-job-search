---
name: rocketjobs-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search jobs in Poland on
  rocketjobs.pl (RocketJobs, the non-IT sister portal of justjoin.it) —
  marketing, sales, HR, finance, accounting, customer service, logistics,
  design/UX, engineering, administration and office roles in Warszawa, Kraków,
  Wrocław, Gdańsk, Poznań, Łódź or remote — or look up a specific
  rocketjobs.pl offer. Returns salary ranges, seniority and skills. Trigger
  phrases: rocketjobs, rocket jobs, jobs in Poland, oferty pracy, praca
  Warszawa, praca zdalna, szukam pracy, ogłoszenia o pracę, praca marketing,
  praca HR, praca w sprzedaży, praca w finansach, widełki.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/rocketjobs-search/cli/src/cli.ts *)
---

# rocketjobs.pl Search Skill

Search live job offers on [rocketjobs.pl](https://rocketjobs.pl), the non-IT sister portal of
justjoin.it (marketing, sales, HR, finance, logistics, design, engineering, office roles…),
through the JSON API its own frontend uses — the same API as `justjoin-search`. No authentication, no API key, and
**zero runtime dependencies** — it runs with just `bun`. Every result carries the
published salary range (per contract type: `b2b`, `permanent` = UoP, `mandate_contract` = zlecenie),
seniority and required skills.

## ⚠️ Personal use only

rocketjobs.pl's `robots.txt` disallows `/api/`, which this skill calls. Use it **only for your
own job search, keep volume low** (a few searches at a time, no crawling or paging through
everything), and **don't use it commercially or for bulk data collection.** Run it on your
own responsibility.

## When to use this skill

- Search job offers in Poland by keyword/role, city (or remote) and seniority
- Compare salary ranges (B2B vs UoP) and required skills across offers
- Get the full description of a specific rocketjobs.pl offer

## Commands

### Search job offers

```bash
bun run .agents/skills/rocketjobs-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords (role, title, skill), e.g. `marketing`, `rekruter`, `księgowa`, `frontend`.
- `--location <city>` / `-l <city>` — city, e.g. `Warszawa`, `Kraków`, `Wrocław`, `Gdańsk`. `Remote` (or `zdalnie`) switches to the fully-remote filter instead.
- `--seniority <list>` / `-s <list>` — comma list of `junior`, `mid`, `senior`, `manager`, `c_level`. Default: all levels.
- `--jobage <days>` — published within N days (filtered client-side on `publishedAt`; results are already newest-first).
- `--page <n>` — page number (1-indexed, 20 results per page, newest first).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full offer detail

```bash
bun run .agents/skills/rocketjobs-search/cli/src/cli.ts detail <slug|url> [--format json|plain]
```

`slug` is the `id` from `search` results (e.g. `acme-senior-react-developer-warszawa-javascript`);
a full `https://rocketjobs.pl/oferta-pracy/<slug>` URL also works. Returns the full description,
all salary ranges, required and nice-to-have skills, languages, apply link, expiry and status.

## Usage examples

```bash
# Mid/senior marketing roles in Warszawa, newest first
bun run .agents/skills/rocketjobs-search/cli/src/cli.ts search -q marketing -l Warszawa --seniority mid,senior --limit 10 --format table

# HR / recruitment roles posted in the last 7 days
bun run .agents/skills/rocketjobs-search/cli/src/cli.ts search -q rekruter --jobage 7 --format table

# Fully remote customer-service roles
bun run .agents/skills/rocketjobs-search/cli/src/cli.ts search -q "obsługa klienta" -l Remote --format plain

# Senior finance roles in Kraków, second page
bun run .agents/skills/rocketjobs-search/cli/src/cli.ts search -q finanse -l Kraków -s senior --page 2 --format table

# Full detail for one offer
bun run .agents/skills/rocketjobs-search/cli/src/cli.ts detail <slug> --format plain
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
- `contractType` values seen live: `b2b`, `permanent` (umowa o pracę / UoP), `mandate_contract` (umowa zlecenie), `any`. `salaryPeriod` is `month`, `hour`, `day` or `year`.
- IT roles live mostly on justjoin.it — use `justjoin-search` for those; RocketJobs carries few of them.
- Keyword matching is the site's own "any" mode and is loose: a term can match offers where it only appears in the description (a `react` search also returns e.g. a warehouse role). Check titles before treating results as relevant.
- An unknown `--seniority` value is rejected by the CLI because the API silently returns 0 results for it.
- The CLI retries 429/5xx with exponential backoff. Keep volume low (see the personal-use note).
- Live smoke test (not run in CI): `cd .agents/skills/rocketjobs-search/cli && LIVE=1 bun test tests/live.test.ts`.
