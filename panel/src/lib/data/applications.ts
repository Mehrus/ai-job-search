import { FINAL_STATUSES, type TrackerRow, type TrackerStatus } from "./tracker";

/**
 * documents/README.md "Subfolder naming": `<company>_<role>`, lowercase,
 * spaces to underscores, drop anything that is not a letter/digit/underscore,
 * collapse runs of underscores, trim them from the ends. Empty -> null.
 */
export function archiveFolderName(company: string, role: string): string | null {
  const name = `${company}_${role}`
    .toLowerCase()
    .replace(/ /g, "_")
    .replace(/[^\p{L}\p{N}\p{M}_]/gu, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return name === "" ? null : name;
}

export type Column = "drafted" | "applied" | "interview" | "offer" | "closed";

export const COLUMNS: { id: Column; label: string; hint: string }[] = [
  { id: "drafted", label: "Szkic", hint: "Dokumenty gotowe, nie wysłane" },
  { id: "applied", label: "Wysłane", hint: "Czekasz na odpowiedź" },
  { id: "interview", label: "Rozmowy", hint: "W procesie" },
  { id: "offer", label: "Oferta", hint: "Do decyzji" },
  { id: "closed", label: "Zamknięte", hint: "hired / rejected / brak odpowiedzi / wycofane" },
];

export function columnFor(status: TrackerStatus | string): Column {
  if (FINAL_STATUSES.has(status as TrackerStatus)) return "closed";
  if (status === "drafted" || status === "applied" || status === "interview" || status === "offer") return status;
  // /html-report treats unknown values as closed; do the same so nothing looks active by accident.
  return "closed";
}

const DATED = /\b(\d{4}-\d{2}-\d{2})\b/g;

/** /outcome's "days quiet": from the row date or the latest dated note, whichever is newer. */
export function lastActivity(row: TrackerRow): string | null {
  const dates = [...(row.notes ?? "").matchAll(DATED)].map((m) => m[1]);
  if (row.date && /^\d{4}-\d{2}-\d{2}$/.test(row.date)) dates.push(row.date);
  return dates.sort().at(-1) ?? null;
}

/** /outcome counts `followed up YYYY-MM-DD` markers in notes. */
export function followUpsSent(row: TrackerRow): number {
  return [...(row.notes ?? "").matchAll(/followed up \d{4}-\d{2}-\d{2}/gi)].length;
}

export interface OutcomeFile {
  status: string | null;
  dateResolved: string | null;
  stages: { label: string; done: boolean }[];
  /** Everything after "## Notes", as markdown. */
  notes: string | null;
}

/** Reads the outcome.md format from documents/README.md; tolerant of hand edits. */
export function parseOutcome(text: string): OutcomeFile {
  const field = (name: string) => {
    const m = text.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`, "i"));
    const value = m?.[1].trim();
    return value && !value.includes("|") && !/^YYYY/.test(value) ? value : null;
  };

  const stages: OutcomeFile["stages"] = [];
  const stagesSection = text.match(/##\s*Interview stages reached\s*\n([\s\S]*?)(?=\n##\s|$)/i)?.[1] ?? "";
  for (const m of stagesSection.matchAll(/^\s*[-*]\s*\[([ xX])\]\s*(.+)$/gm)) {
    stages.push({ label: m[2].trim(), done: m[1].toLowerCase() === "x" });
  }

  const notes = text.match(/##\s*Notes\s*\n([\s\S]*)$/i)?.[1].trim() || null;
  return { status: field("Status"), dateResolved: field("Date resolved"), stages, notes };
}
