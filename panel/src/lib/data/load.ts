import { readFile } from "node:fs/promises";
import path from "node:path";

import { compareOffers, parseSeenJobs, type Offer } from "./offers";
import { indexTracker, parseTracker, trackerKey, type TrackerRow } from "./tracker";

/**
 * Root of the ai-job-search workspace. The panel lives in `panel/`, so the
 * default is its parent; JOB_SEARCH_ROOT overrides it. JOB_SEARCH_SEEN_JOBS and
 * JOB_SEARCH_TRACKER point at single files (the demo fixtures use them, because
 * the real file names are gitignored everywhere in the repo).
 */
export function dataRoot(): string {
  const configured = process.env.JOB_SEARCH_ROOT;
  return configured ? path.resolve(configured) : path.resolve(process.cwd(), "..");
}

export interface OfferWithTracker extends Offer {
  tracker: TrackerRow | null;
}

export interface Workspace {
  root: string;
  offers: OfferWithTracker[];
  tracker: TrackerRow[];
  /** Problems worth showing in the UI instead of crashing the page. */
  warnings: string[];
}

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function loadWorkspace(): Promise<Workspace> {
  const root = dataRoot();
  const warnings: string[] = [];

  let offers: Offer[] = [];
  const seenPath = process.env.JOB_SEARCH_SEEN_JOBS
    ? path.resolve(process.env.JOB_SEARCH_SEEN_JOBS)
    : path.join(root, "job_scraper", "seen_jobs.json");
  const seenText = await readOptional(seenPath);
  if (seenText === null) {
    warnings.push(`Brak pliku ${seenPath} - uruchom /scrape w Claude Code.`);
  } else {
    try {
      offers = parseSeenJobs(JSON.parse(seenText));
    } catch (error) {
      warnings.push(`Nie udało się odczytać ${seenPath}: ${(error as Error).message}`);
    }
  }

  let tracker: TrackerRow[] = [];
  const trackerPath = process.env.JOB_SEARCH_TRACKER
    ? path.resolve(process.env.JOB_SEARCH_TRACKER)
    : path.join(root, "job_search_tracker.csv");
  const trackerText = await readOptional(trackerPath);
  if (trackerText !== null) tracker = parseTracker(trackerText);

  const byPair = indexTracker(tracker);
  const withTracker = offers
    .map((offer) => ({ ...offer, tracker: byPair.get(trackerKey(offer.company, offer.title)) ?? null }))
    .sort(compareOffers);

  return { root, offers: withTracker, tracker, warnings };
}
