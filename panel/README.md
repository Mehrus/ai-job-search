# Job Search Panel

A local web panel over the files the Claude Code workflow writes:

- `job_scraper/seen_jobs.json`: scraped and ranked offers (`/scrape`, `/rank`)
- `job_search_tracker.csv`: applications (`/apply`, `/outcome`)
- `documents/applications/<company>_<role>/`: `outcome.md`, `interview_prep_*.md` (`/interview`) and `job_posting.md`

Pages:

- **Oferty** (`/`): ranked offers with filters
- Offer detail
- **Aplikacje** (`/applications`): kanban by tracker status
- Application card: interview stages with dates, notes, prep packs and the archived posting
- **Najbliższe etapy** on top of the kanban: scheduled stages, soonest first

The files stay the source of truth. Refresh the page after a `/scrape` or `/rank` run.

## What it writes

The panel writes `job_search_tracker.csv` and each application's `outcome.md`, following `/apply` and `/outcome`.

Tracker:

- **Aplikowałem** on an offer appends a row (`applied`, today's date, fit score, posting URL and deadline) when the offer has no open row, and moves a `drafted` row to `applied`.

- You can drag a card to *Wysłane*, *Rozmowy* or *Oferta*, or save the form on an application card. Either way, only that row's `status` changes and a dated note is appended to it. Commas, quotes and line breaks are stripped from notes so the CSV columns never shift.
- A row leaving `drafted` gets today as its submission `date`.
- The follow-up button appends the `followed up YYYY-MM-DD` marker that `/outcome` counts.
- Every other field keeps its exact text, and the file is replaced atomically.
- The write is refused if the row changed after the page loaded (for example because `/outcome` ran in the meantime).

`outcome.md` (in `documents/applications/<company>_<role>/`, created from `/outcome`'s template when missing):

- **Zaplanuj** writes the stage unticked with `(scheduled YYYY-MM-DD HH:MM)`. `/setup` reads an unticked stage as not reached, so nothing upstream changes.
- **Odbyło się / Już się odbył** ticks the stage with its date. **Dostałem ofertę** ticks *Offer received*.
- **Odrzucili mnie** sets `Status: rejected` and `Date resolved`. Any final status chosen in the form (hired, rejected, no_response, offer_declined) closes an existing `outcome.md` the same way.
- Notes are appended as `- YYYY-MM-DD: ...` and never rewritten.
- A scheduled or completed stage moves an `applied` row to `interview`, and an offer moves it to `offer`. The tracker note never holds the future date, because `/outcome` reads the newest date in notes as the last contact.
- Both files are checked for changes since the page loaded before anything is written.

The archived CV, cover letter and posting stay with `/outcome`, and prep packs with `/interview`.

## Intervio

Offer and application pages have a **Ćwicz w Intervio** card. It detects topics in the posting and in the `/rank` strengths and gaps (RxJS, state management, signals, forms, testing…), then links to the matching Intervio catalog filters. Run Intervio next to the panel with `pnpm dev -p 3001` in the Intervio repo, or set `INTERVIO_URL`. .NET topics link to the IT › Backend › .NET pack. Stacks Intervio has no questions for yet (for example Java) are listed on the card.

## Run

```bash
cd panel
pnpm install
pnpm dev:all      # panel on :3000 + Intervio on :3001 together (Ctrl+C stops both)
pnpm dev          # http://localhost:3000, reads the repo root (..)
pnpm dev:demo     # same UI on fictional data (edits go to throwaway .demo-tracker.csv and .demo-applications/)
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
