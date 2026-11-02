"use server";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";

import { archiveFolderName } from "@/lib/data/applications";
import { outcomePath } from "@/lib/data/archive";
import { localToday } from "@/lib/data/deadline";
import { dataRoot, loadWorkspace, trackerPath } from "@/lib/data/load";
import {
  applyOutcomeEdit,
  archiveStatusFor,
  cleanStageLabel,
  OutcomeConflictError,
  outcomeHash,
  type OutcomeEdit,
} from "@/lib/data/outcome-write";
import { FINAL_STATUSES, parseTracker, TRACKER_STATUSES, trackerKey, type TrackerStatus } from "@/lib/data/tracker";
import { appendTrackerRow, applyRowEdit, TrackerConflictError, type RowRef } from "@/lib/data/tracker-write";

export type ActionResult = { ok: true; slug?: string | null } | { ok: false; error: string };

function validRow(row: unknown): row is RowRef {
  const r = row as RowRef;
  return !!r && Number.isInteger(r.index) && r.index >= 0 && typeof r.hash === "string" && /^[0-9a-f]{16}$/.test(r.hash);
}

async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Same-directory temp file + rename: a crash never leaves a half-written file. */
async function writeAtomic(file: string, text: string) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  await writeFile(tmp, text, "utf-8");
  await rename(tmp, file);
}

function failure(error: unknown, what: string): ActionResult {
  if (error instanceof TrackerConflictError || error instanceof OutcomeConflictError) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: `Nie udało się zapisać ${what}: ${(error as Error).message}` };
}

export interface UpdateApplicationInput {
  row: RowRef;
  status?: string;
  note?: string;
  followUp?: boolean;
}

/**
 * Writes one tracker row (status / note / follow-up marker), atomically. A
 * final status also closes an existing outcome.md, the way /outcome does.
 */
export async function updateApplication(input: UpdateApplicationInput): Promise<ActionResult> {
  if (!validRow(input?.row)) return { ok: false, error: "Nieprawidłowy wiersz." };
  if (input.status !== undefined && !(TRACKER_STATUSES as readonly string[]).includes(input.status)) {
    return { ok: false, error: `Nieznany status: ${input.status}` };
  }
  if (input.note !== undefined && typeof input.note !== "string") return { ok: false, error: "Nieprawidłowa notatka." };

  const file = trackerPath();
  const today = localToday();
  try {
    const text = await readFile(file, "utf-8");
    const next = applyRowEdit(text, {
      row: input.row,
      today,
      status: input.status as TrackerStatus | undefined,
      note: input.note,
      followUp: input.followUp === true,
    });
    if (next !== text) await writeAtomic(file, next);

    const archiveStatus = input.status ? archiveStatusFor(input.status) : null;
    const row = parseTracker(text)[input.row.index];
    const folder = row ? archiveFolderName(row.company, row.role) : null;
    if (archiveStatus && folder) {
      const outcomeFile = outcomePath(dataRoot(), folder);
      const outcome = await readOptional(outcomeFile);
      if (outcome !== null) {
        const edit: OutcomeEdit = { kind: "resolve", status: archiveStatus, date: today, note: input.note };
        await writeAtomic(outcomeFile, applyOutcomeEdit(outcome, edit, { company: row.company, role: row.role, today }));
      }
    }
  } catch (error) {
    return failure(error, "trackera");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * "Aplikowałem" on an offer: appends an `applied` row the way /apply Step 7
 * would (minus the documents), or moves an open `drafted` row to `applied`.
 */
export async function markApplied(input: { offerKey: string }): Promise<ActionResult> {
  if (typeof input?.offerKey !== "string") return { ok: false, error: "Nieprawidłowa oferta." };
  const { offers, applications } = await loadWorkspace();
  const offer = offers.find((o) => o.key === input.offerKey);
  if (!offer) return { ok: false, error: "Nie ma takiej oferty w seen_jobs.json." };

  const key = trackerKey(offer.company, offer.title);
  const open = applications.filter((a) => trackerKey(a.company, a.role) === key && !FINAL_STATUSES.has(a.status as TrackerStatus));
  const current = open.at(-1);
  const slug = archiveFolderName(offer.company, offer.title);

  if (current && current.status !== "drafted") {
    return { ok: false, error: "Ta oferta jest już w trackerze jako otwarta aplikacja." };
  }
  if (current) {
    const result = await updateApplication({ row: current.rowRef, status: "applied" });
    return result.ok ? { ok: true, slug } : result;
  }

  const file = trackerPath();
  const today = localToday();
  try {
    const text = await readOptional(file);
    const next = appendTrackerRow(text, {
      date: today,
      company: offer.company,
      role: offer.title,
      channel: offer.portal ? "portal" : null,
      status: "applied",
      fit_rating: offer.score,
      notes: `${today} applied (panel)`,
      source: offer.url,
      deadline: offer.deadline,
    });
    await writeAtomic(file, next);
  } catch (error) {
    return failure(error, "trackera");
  }

  revalidatePath("/", "layout");
  return { ok: true, slug };
}

export type StageAction = "schedule" | "complete" | "offer" | "reject";

export interface RecordStageInput {
  row: RowRef;
  /** outcomeHash() of outcome.md as the page saw it. */
  outcomeHash: string;
  action: StageAction;
  stage?: string;
  /** YYYY-MM-DD */
  date?: string;
  /** HH:MM, schedule only */
  time?: string;
  note?: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Records an interview stage, an offer or a rejection in both places /outcome
 * keeps them: outcome.md (stages with dates, Status) and the tracker row
 * (status + a dated note). Both files are checked for concurrent edits first.
 */
export async function recordStage(input: RecordStageInput): Promise<ActionResult> {
  if (!validRow(input?.row)) return { ok: false, error: "Nieprawidłowy wiersz." };
  if (typeof input.outcomeHash !== "string") return { ok: false, error: "Odśwież stronę." };
  const today = localToday();
  const date = input.date && DATE.test(input.date) ? input.date : null;
  const time = input.time && TIME.test(input.time) ? input.time : null;
  const stage = cleanStageLabel(input.stage ?? "");
  const note = typeof input.note === "string" ? input.note.trim() : "";

  const file = trackerPath();
  try {
    const trackerText = await readFile(file, "utf-8");
    const row = parseTracker(trackerText)[input.row.index];
    const folder = row ? archiveFolderName(row.company, row.role) : null;
    if (!row || !folder) throw new TrackerConflictError("Tracker zmienił się w międzyczasie. Odśwież stronę.");

    const status = row.status as TrackerStatus;
    const isFinal = FINAL_STATUSES.has(status);
    const early = status === "drafted" || status === "applied";
    let outcomeEdit: OutcomeEdit;
    let trackerStatus: TrackerStatus | undefined;
    let trackerNote: string;

    switch (input.action) {
      case "schedule":
        if (!stage) return { ok: false, error: "Podaj nazwę etapu." };
        if (!date) return { ok: false, error: "Podaj datę etapu." };
        outcomeEdit = { kind: "schedule", stage, when: time ? `${date} ${time}` : date, note };
        trackerStatus = early ? "interview" : undefined;
        // No date in the tracker note: /outcome reads the newest date there as the last contact.
        trackerNote = `${stage} scheduled`;
        break;
      case "complete":
        if (!stage) return { ok: false, error: "Podaj nazwę etapu." };
        outcomeEdit = { kind: "complete", stage, date: date ?? today, note };
        trackerStatus = early ? "interview" : undefined;
        trackerNote = `${stage} done`;
        break;
      case "offer":
        outcomeEdit = { kind: "offer", date: date ?? today, note };
        trackerStatus = isFinal ? undefined : "offer";
        trackerNote = "offer received";
        break;
      case "reject":
        outcomeEdit = { kind: "resolve", status: "rejected", date: date ?? today, note };
        trackerStatus = "rejected";
        trackerNote = "";
        break;
      default:
        return { ok: false, error: "Nieznana akcja." };
    }
    if (note) trackerNote = trackerNote ? `${trackerNote} - ${note}` : note;

    const outcomeFile = outcomePath(dataRoot(), folder);
    const outcomeText = await readOptional(outcomeFile);
    if (outcomeHash(outcomeText) !== input.outcomeHash) {
      throw new OutcomeConflictError("outcome.md zmienił się w międzyczasie (np. przez /outcome). Odśwież stronę.");
    }
    const nextOutcome = applyOutcomeEdit(outcomeText, outcomeEdit, { company: row.company, role: row.role, today });
    const nextTracker = applyRowEdit(trackerText, {
      row: input.row,
      today,
      status: trackerStatus,
      note: trackerNote || undefined,
    });

    if (nextTracker !== trackerText) await writeAtomic(file, nextTracker);
    await writeAtomic(outcomeFile, nextOutcome);
  } catch (error) {
    return failure(error, "zmian");
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
