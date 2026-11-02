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

export interface CsvField {
  /** Exactly as written in the file, quotes included. */
  raw: string;
  value: string;
}

export interface CsvRecord {
  /** Offsets into the original text; `end` excludes the line terminator. */
  start: number;
  end: number;
  fields: CsvField[];
}

/**
 * Minimal RFC 4180 reader that keeps each record's position and each field's
 * raw text, so a writer can replace one field and leave every other byte of
 * the file alone. Tracker writers never quote, but a hand edit might.
 */
export function scanRecords(text: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let i = text.startsWith("\uFEFF") ? 1 : 0;

  while (i < text.length) {
    const start = i;
    const fields: CsvField[] = [];
    let fieldStart = i;
    let value = "";
    let inQuotes = false;

    for (; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            value += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          value += ch;
        }
      } else if (ch === '"' && i === fieldStart) {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push({ raw: text.slice(fieldStart, i), value });
        fieldStart = i + 1;
        value = "";
      } else if (ch === "\n" || ch === "\r") {
        break;
      } else {
        value += ch;
      }
    }
    const end = i;
    fields.push({ raw: text.slice(fieldStart, end), value });
    if (text[i] === "\r" && text[i + 1] === "\n") i += 2;
    else if (i < text.length) i += 1;

    if (fields.some((f) => f.value.trim() !== "")) records.push({ start, end, fields });
  }
  return records;
}

export function parseCsv(text: string): string[][] {
  return scanRecords(text).map((r) => r.fields.map((f) => f.value));
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
