"use server";

import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";

import { localToday } from "@/lib/data/deadline";
import { trackerPath } from "@/lib/data/load";
import { TRACKER_STATUSES, type TrackerStatus } from "@/lib/data/tracker";
import { applyRowEdit, TrackerConflictError, type RowRef } from "@/lib/data/tracker-write";

export interface UpdateApplicationInput {
  row: RowRef;
  status?: string;
  note?: string;
  followUp?: boolean;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

function validRow(row: unknown): row is RowRef {
  const r = row as RowRef;
  return !!r && Number.isInteger(r.index) && r.index >= 0 && typeof r.hash === "string" && /^[0-9a-f]{16}$/.test(r.hash);
}

/** Writes one tracker row (status / note / follow-up marker), atomically. */
export async function updateApplication(input: UpdateApplicationInput): Promise<ActionResult> {
  if (!validRow(input?.row)) return { ok: false, error: "Nieprawidłowy wiersz." };
  if (input.status !== undefined && !(TRACKER_STATUSES as readonly string[]).includes(input.status)) {
    return { ok: false, error: `Nieznany status: ${input.status}` };
  }
  if (input.note !== undefined && typeof input.note !== "string") return { ok: false, error: "Nieprawidłowa notatka." };

  const file = trackerPath();
  try {
    const text = await readFile(file, "utf-8");
    const next = applyRowEdit(text, {
      row: input.row,
      today: localToday(),
      status: input.status as TrackerStatus | undefined,
      note: input.note,
      followUp: input.followUp === true,
    });
    if (next !== text) {
      // Same-directory temp file + rename: a crash never leaves a half-written tracker.
      const tmp = path.join(path.dirname(file), `.job_search_tracker.${process.pid}.${Date.now()}.tmp`);
      await writeFile(tmp, next, "utf-8");
      await rename(tmp, file);
    }
  } catch (error) {
    if (error instanceof TrackerConflictError) return { ok: false, error: error.message };
    return { ok: false, error: `Nie udało się zapisać trackera: ${(error as Error).message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
