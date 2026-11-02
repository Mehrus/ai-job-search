import { createHash } from "node:crypto";

import { scanRecords, TRACKER_STATUSES, type CsvField, type TrackerStatus } from "./tracker";

/**
 * Edits to job_search_tracker.csv, following /outcome Step 4:
 * - only the matched row changes, nothing is reordered or restructured;
 * - only `status`, `notes` and (when a row leaves `drafted`) `date` are touched,
 *   every other field keeps its exact raw text;
 * - statuses use the canonical spellings;
 * - appended notes contain no commas, double quotes or line breaks.
 */

export class TrackerConflictError extends Error {}

/** Identifies a data row and the exact text it had when the page was rendered. */
export interface RowRef {
  index: number;
  hash: string;
}

export function rowHash(text: string, start: number, end: number): string {
  return createHash("sha256").update(text.slice(start, end)).digest("hex").slice(0, 16);
}

export function rowRefs(text: string): RowRef[] {
  return scanRecords(text)
    .slice(1)
    .map((r, index) => ({ index, hash: rowHash(text, r.start, r.end) }));
}

/** "rejected, no feedback" -> "rejected - no feedback"; one line, no quotes. */
export function sanitizeNote(note: string): string {
  return note
    .replace(/[\r\n]+/g, " ")
    .replace(/"/g, "")
    .replace(/\s*,\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function encode(field: CsvField, value: string): string {
  // Keep a hand-quoted field quoted; never introduce quoting otherwise.
  return field.raw.startsWith('"') ? `"${value.replace(/"/g, '""')}"` : value;
}

export interface RowEdit {
  row: RowRef;
  today: string;
  status?: TrackerStatus;
  /** Free text; sanitized and appended as "<today> <note>". */
  note?: string;
  /** Appends `followed up <today>`, the marker /outcome counts. */
  followUp?: boolean;
}

export function applyRowEdit(text: string, edit: RowEdit): string {
  const records = scanRecords(text);
  const header = records[0];
  if (!header) throw new TrackerConflictError("Tracker jest pusty.");
  const col = (name: string) => header.fields.findIndex((f) => f.value.trim().toLowerCase() === name);
  const statusIdx = col("status");
  const notesIdx = col("notes");
  const dateIdx = col("date");
  if (statusIdx < 0 || notesIdx < 0) throw new TrackerConflictError("Tracker nie ma kolumn status/notes.");

  const record = records[edit.row.index + 1];
  if (!record || rowHash(text, record.start, record.end) !== edit.row.hash) {
    throw new TrackerConflictError("Tracker zmienił się w międzyczasie (np. przez /outcome). Odśwież stronę.");
  }
  if (edit.status && !(TRACKER_STATUSES as readonly string[]).includes(edit.status)) {
    throw new Error(`Nieznany status: ${edit.status}`);
  }

  const fields = record.fields.map((f) => f.raw);
  while (fields.length <= Math.max(statusIdx, notesIdx, dateIdx)) fields.push("");
  const field = (i: number): CsvField => record.fields[i] ?? { raw: "", value: "" };

  const oldStatus = field(statusIdx).value.trim().toLowerCase();
  const additions: string[] = [];

  if (edit.status && edit.status !== oldStatus.replace(/\s+/g, "_")) {
    fields[statusIdx] = encode(field(statusIdx), edit.status);
    // /outcome: a row leaving `drafted` gets the real submission date.
    if (oldStatus === "drafted" && dateIdx >= 0) fields[dateIdx] = encode(field(dateIdx), edit.today);
    additions.push(`${edit.today} ${edit.status}`);
  }
  const note = edit.note ? sanitizeNote(edit.note) : "";
  if (note) {
    if (additions.length) additions[additions.length - 1] += ` - ${note}`;
    else additions.push(`${edit.today} ${note}`);
  }
  if (edit.followUp) additions.push(`followed up ${edit.today}`);
  if (additions.length === 0) return text;

  const existing = field(notesIdx).value.trim();
  fields[notesIdx] = encode(field(notesIdx), [existing, ...additions].filter(Boolean).join("; "));

  return text.slice(0, record.start) + fields.join(",") + text.slice(record.end);
}
