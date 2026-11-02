---
name: nofluffjobs-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search IT / tech jobs in Poland on
  nofluffjobs.com (No Fluff Jobs) — developer, frontend, backend, fullstack,
  DevOps, data, QA, PM roles in Warszawa, Kraków, Wrocław, Gdańsk, Poznań, Łódź
  or remote — or look up a specific No Fluff Jobs offer. Every offer has a
  published salary range (B2B / UoP), seniority and required skills. Trigger
  phrases: nofluffjobs, no fluff jobs, NFJ, IT jobs in Poland, developer jobs
  Warsaw, oferty pracy IT, praca IT, praca programista, szukam pracy backend,
  praca zdalna IT, ogłoszenia IT, widełki, B2B, UoP.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/nofluffjobs-search/cli/src/cli.ts *)
---

# No Fluff Jobs Search Skill

Search live IT job offers on [nofluffjobs.com](https://nofluffjobs.com), a major Polish IT job
board that requires salary ranges on every offer, through the JSON API its own frontend uses.
No authentication, no API key, and **zero runtime dependencies** — it runs with just `bun`.

## ⚠️ Personal use only

nofluffjobs.com's `robots.txt` disallows `/api/`, which this skill calls. Use it **only for your
own job search, keep volume low** (a few searches at a time, no crawling or paging through
everything), and **don't use it commercially or for bulk data collection.** Run it on your
own responsibility.

## When to use this skill

- Search IT job offers in Poland by technology/keyword, city (or remote) and seniority
- Compare salary ranges and required skills across offers
- Get the full description of a specific No Fluff Jobs offer

## Commands

### Search job offers

```bash
bun run .agents/skills/nofluffjobs-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords (technology, title, skill), e.g. `react`, `java`, `devops`. The site maps known technologies to its own "requirement" filter.
- `--location <city>` / `-l <city>` — city, e.g. `Warszawa`, `Kraków`, `Wrocław`, `Zielona Góra`. `Remote` (or `zdalnie`) gives fully-remote offers.
- `--seniority <list>` / `-s <list>` — comma list of `trainee`, `junior`, `mid`, `senior`, `expert`. Default: all levels.
- `--jobage <days>` — published or renewed within N days (filtered client-side on `date`).
- `--page <n>` — page number (1-indexed, 20 offers per page, the site's default ordering).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full offer detail

```bash
bun run .agents/skills/nofluffjobs-search/cli/src/cli.ts detail <slug|reference|url> [--format json|plain]
```

`slug` is the `id` from `search` results (e.g. `react-developer-typescript-acme-remote`); the
8-character `reference` (e.g. `YZ55UV4H`) or a full `https://nofluffjobs.com/pl/job/<slug>` URL
also work. Returns the full description, requirements, daily tasks, benefits, all salary ranges
in their published unit, required and nice-to-have skills, languages, expiry and status.

## Usage examples

```bash
# Mid/senior React offers
bun run .agents/skills/nofluffjobs-search/cli/src/cli.ts search -q react --seniority mid,senior --limit 10 --format table

# Java roles in Kraków from the last 7 days
bun run .agents/skills/nofluffjobs-search/cli/src/cli.ts search -q java -l Kraków --jobage 7 --format table

# Fully remote TypeScript roles
bun run .agents/skills/nofluffjobs-search/cli/src/cli.ts search -q typescript -l Remote --format plain

# Junior roles in Wrocław, second page
bun run .agents/skills/nofluffjobs-search/cli/src/cli.ts search -l Wrocław -s junior --page 2 --format table

# Full detail for one offer
bun run .agents/skills/nofluffjobs-search/cli/src/cli.ts detail <slug> --format plain
```

## Output

Each search result has `id`, `title`, `company`, `location`, `date`, `url` plus `reference`,
`postedAt`, `locations`, `seniority`, `category`, `workplaceType`, `salaryMin`, `salaryMax`,
`salaryCurrency`, `salaryPeriod`, `contractType` and `skills[]`. `detail` adds `salaries[]`
(every contract type), `description`, `requirements`, `dailyTasks[]`, `niceToHaveSkills[]`,
`benefits[]`, `languages[]`, `companySize`, `companyUrl`, `applyUrl`, `expiresAt` and `isActive`.
Missing values are `null`, never omitted.

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading results or a single offer's full detail |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- **Search salaries are normalised by the site to PLN per month** (an hourly B2B rate of 155 PLN/h shows as ~26,040 PLN/month), which makes offers comparable. `detail` returns the employer's original figures and unit per contract type.
- `contractType` is the site's own value, e.g. `b2b` or `permanent` (umowa o pracę / UoP).
- The API returns one row per location of an offer; the CLI de-duplicates by `reference`. When `--location` is given, the `id`/`url` point at that city's variant.
- `date` is the last publication or renewal (what the site shows); `postedAt` is the first publication.
- The site parses the query itself: "senior java developer" becomes `seniority=senior requirement=Java keyword=developer`.
- An unknown `--seniority` value is rejected by the CLI.
- The CLI retries 429/5xx with exponential backoff. Keep volume low (see the personal-use note).
- Personal data in postings (GDPR consent clauses, recruiter e-mails) is not emitted.
- Live smoke test (not run in CI): `cd .agents/skills/nofluffjobs-search/cli && LIVE=1 bun test tests/live.test.ts`.
