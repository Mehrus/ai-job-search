import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  archiveFolderName,
  columnFor,
  followUpsSent,
  lastActivity,
  parseOutcome,
  type Column,
  type OutcomeStage,
} from "./applications";
import { readOutcomeText } from "./archive";
import { compareOffers, parseSeenJobs, type Offer } from "./offers";
import { outcomeHash } from "./outcome-write";
import { rowRefs, type RowRef } from "./tracker-write";
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

export function trackerPath(root: string = dataRoot()): string {
  return process.env.JOB_SEARCH_TRACKER
    ? path.resolve(process.env.JOB_SEARCH_TRACKER)
    : path.join(root, "job_search_tracker.csv");
}

export interface OfferWithTracker extends Offer {
  tracker: TrackerRow | null;
}

export interface Application extends TrackerRow {
  /** Archive folder name; also the URL slug. Null when company+role has no letters/digits. */
  slug: string | null;
  column: Column;
  lastActivity: string | null;
  followUps: number;
  /** seen_jobs.json key of the matching offer, if /scrape saw it. */
  offerKey: string | null;
  /** Row position + content hash, so an edit can detect a concurrent /outcome write. */
  rowRef: RowRef;
  /** Stages from outcome.md (empty when there is none). */
  stages: OutcomeStage[];
  /** Earliest stage that is scheduled but not ticked yet. */
  nextStage: OutcomeStage | null;
  /** Hash of outcome.md as loaded ("" content when missing), for conflict checks. */
  outcomeHash: string;
}

export interface Workspace {
  root: string;
  offers: OfferWithTracker[];
  tracker: TrackerRow[];
  applications: Application[];
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
  const trackerText = await readOptional(trackerPath(root));
  let refs: RowRef[] = [];
  if (trackerText !== null) {
    tracker = parseTracker(trackerText);
    refs = rowRefs(trackerText);
  }

  const byPair = indexTracker(tracker);
  const withTracker = offers
    .map((offer) => ({ ...offer, tracker: byPair.get(trackerKey(offer.company, offer.title)) ?? null }))
    .sort(compareOffers);

  const offerByPair = new Map(offers.map((o) => [trackerKey(o.company, o.title), o.key]));
  const applications: Application[] = await Promise.all(
    tracker.map(async (row, i) => {
      const slug = archiveFolderName(row.company, row.role);
      const outcomeText = slug ? await readOutcomeText(root, slug) : null;
      const stages = outcomeText ? parseOutcome(outcomeText).stages : [];
      const nextStage =
        stages
          .filter((s) => !s.done && s.scheduled)
          .sort((a, b) => a.scheduled!.localeCompare(b.scheduled!))[0] ?? null;
      return {
        ...row,
        slug,
        column: columnFor(row.status),
        lastActivity: lastActivity(row),
        followUps: followUpsSent(row),
        offerKey: offerByPair.get(trackerKey(row.company, row.role)) ?? null,
        rowRef: refs[i],
        stages,
        nextStage,
        outcomeHash: outcomeHash(outcomeText),
      };
    }),
  );

  return { root, offers: withTracker, tracker, applications, warnings };
}
