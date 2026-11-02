import { isoDate, norm, safeUrl, str } from "./normalize";

export const TRACKER_STATUSES = [
  "drafted",
  "applied",
  "interview",
  "offer",
  "hired",
  "rejected",
  "no_response",
  "offer_declined",
  "withdrawn",
] as const;

export type TrackerStatus = (typeof TRACKER_STATUSES)[number];

export const FINAL_STATUSES: ReadonlySet<TrackerStatus> = new Set([
  "hired",
  "rejected",
  "no_response",
  "offer_declined",
  "withdrawn",
]);

export interface TrackerRow {
  date: string | null;
  company: string;
  sector: string | null;
  role: string;
  roleType: string | null;
  channel: string | null;
  /** Canonical status, or the raw value when it is not in the vocabulary. */
  status: TrackerStatus | string;
  contactPerson: string | null;
  fitRating: number | null;
  notes: string | null;
  cvFile: string | null;
  coverLetterFile: string | null;
  source: string | null;
  deadline: string | null;
}

/** Minimal RFC 4180 reader. Tracker writers never quote, but a hand edit might. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Canonical spelling; legacy "no response" / "offer declined" are read as the same status. */
export function normalizeStatus(value: string | null): TrackerStatus | string {
  const s = (value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  return (TRACKER_STATUSES as readonly string[]).includes(s) ? (s as TrackerStatus) : (value ?? "").trim();
}

export function parseTracker(text: string): TrackerRow[] {
  const [header, ...body] = parseCsv(text);
  if (!header) return [];
  const index = new Map(header.map((name, i) => [name.trim().toLowerCase(), i]));
  const get = (row: string[], name: string) => {
    const i = index.get(name);
    return i === undefined ? null : str(row[i]);
  };

  return body.map((row) => {
    const fit = Number(get(row, "fit_rating"));
    return {
      date: get(row, "date"),
      company: get(row, "company") ?? "",
      sector: get(row, "sector"),
      role: get(row, "role") ?? "",
      roleType: get(row, "role_type"),
      channel: get(row, "channel"),
      status: normalizeStatus(get(row, "status")),
      contactPerson: get(row, "contact_person"),
      fitRating: get(row, "fit_rating") !== null && Number.isFinite(fit) ? fit : null,
      notes: get(row, "notes"),
      cvFile: get(row, "cv_file"),
      coverLetterFile: get(row, "cover_letter_file"),
      source: safeUrl(get(row, "source")),
      deadline: isoDate(get(row, "deadline")),
    };
  });
}

export function trackerKey(company: string, role: string): string {
  return `${norm(company)}\u0000${norm(role)}`;
}

/** company+role -> row, the same pairing /rank uses to exclude tracked jobs. */
export function indexTracker(rows: TrackerRow[]): Map<string, TrackerRow> {
  const map = new Map<string, TrackerRow>();
  for (const row of rows) map.set(trackerKey(row.company, row.role), row);
  return map;
}
