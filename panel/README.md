# Job Search Panel

A local web panel over the files the Claude Code workflow writes:

- `job_scraper/seen_jobs.json`: scraped and ranked offers (`/scrape`, `/rank`)
- `job_search_tracker.csv`: applications (`/apply`, `/outcome`)
- `documents/applications/<company>_<role>/`: `outcome.md`, `interview_prep_*.md` (`/interview`) and `job_posting.md`

Pages:

- **Oferty** (`/`): ranked offers with filters
- Offer detail
- **Aplikacje** (`/applications`): kanban by tracker status
- Application card: stages, notes, prep packs and the archived posting

The files stay the source of truth. Refresh the page after a `/scrape` or `/rank` run.

## What it writes

The panel writes only `job_search_tracker.csv`, and it follows `/outcome`'s rules:

- You can drag a card to *Wysłane*, *Rozmowy* or *Oferta*, or save the form on an application card. Either way, only that row's `status` changes and a dated note is appended to it. Commas, quotes and line breaks are stripped from notes so the CSV columns never shift.
- A row leaving `drafted` gets today as its submission `date`.
- The follow-up button appends the `followed up YYYY-MM-DD` marker that `/outcome` counts.
- Every other field keeps its exact text, and the file is replaced atomically.
- The write is refused if the row changed after the page loaded (for example because `/outcome` ran in the meantime).

`outcome.md` and the rest of the archive stay with `/outcome` and `/interview`.

## Intervio

Offer and application pages have a **Ćwicz w Intervio** card. It detects topics in the posting and in the `/rank` strengths and gaps (RxJS, state management, signals, forms, testing…), then links to the matching Intervio catalog filters. Run Intervio next to the panel with `pnpm dev -p 3001` in the Intervio repo, or set `INTERVIO_URL`. .NET topics link to the IT › Backend › .NET pack. Stacks Intervio has no questions for yet (for example Java) are listed on the card.

## Run

```bash
cd panel
pnpm install
pnpm dev:all      # panel on :3000 + Intervio on :3001 together (Ctrl+C stops both)
pnpm dev          # http://localhost:3000, reads the repo root (..)
pnpm dev:demo     # same UI on fictional data (edits go to a throwaway .demo-tracker.csv)
```

`dev:all` looks for Intervio next to this repo (`../intervio` from the repo root), then in `~/web/intervio`. Use `INTERVIO_DIR=/path/to/intervio pnpm dev:all` if it lives elsewhere, and `PANEL_PORT` / `INTERVIO_PORT` to change the ports. The header shows whether Intervio is running and links to it.

To read another workspace, run `JOB_SEARCH_ROOT=/path/to/ai-job-search pnpm dev`. You can also point at individual files or the archive folder with `JOB_SEARCH_SEEN_JOBS`, `JOB_SEARCH_TRACKER` and `JOB_SEARCH_APPLICATIONS`.

Both `dev` and `start` bind to 127.0.0.1 only. The panel shows personal data, so do not deploy it anywhere public.

## Checks

```bash
pnpm test         # parsers and tracker writer (Vitest)
pnpm typecheck
pnpm lint
```

Stack: Next.js 16 (App Router, Server Actions), React 19, Tailwind 4 and shadcn/ui components. `components.json` is already set up, so `pnpm dlx shadcn add <component>` works.
