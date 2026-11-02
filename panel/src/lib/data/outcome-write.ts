import { createHash } from "node:crypto";

import { parseStageText } from "./applications";

/**
 * Edits to documents/applications/<folder>/outcome.md in the format /outcome
 * Step 3.3 writes (documents/README.md), so /setup Path A still parses it:
 * - stages are checkboxes, ticked with "(YYYY-MM-DD)" once reached;
 * - an upcoming stage stays unticked and carries "(scheduled YYYY-MM-DD[ HH:MM])",
 *   which /setup reads as "not reached yet";
 * - Status moves from in_progress to a final value only on resolution, and
 *   "Date resolved" is added then;
 * - notes are appended with a date, never rewritten.
 */

export class OutcomeConflictError extends Error {}

/** Archive Status enum (documents/README.md), not the tracker's. */
export type ArchiveStatus = "in_progress" | "hired" | "offer_declined" | "rejected" | "no_response" | "interview_only";

export const STANDARD_STAGES = ["Phone screen", "Technical interview", "Case interview", "Final round"] as const;
export const OFFER_STAGE = "Offer received";

export function outcomeHash(text: string | null): string {
  return createHash("sha256")
    .update(text ?? "")
    .digest("hex")
    .slice(0, 16);
}

export function newOutcome(company: string, role: string): string {
  return [
    `# Outcome: ${company} — ${role}`,
    "",
    "**Status:** in_progress",
    "",
    "## Interview stages reached",
    ...[...STANDARD_STAGES, OFFER_STAGE].map((s) => `- [ ] ${s}`),
    "",
    "## Notes",
    "",
  ].join("\n");
}

const STAGE_LINE = /^(\s*[-*]\s*)\[([ xX])\]\s*(.+?)\s*$/;

/** Stage names are free text from a form: one line, no brackets that would confuse the parser. */
export function cleanStageLabel(label: string): string {
  return label
    .replace(/[\r\n]+/g, " ")
    .replace(/[[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function sameStage(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

interface Section {
  lines: string[];
  /** Index of the "## Interview stages reached" heading, or -1. */
  heading: number;
  /** One past the last line of the section. */
  end: number;
}

function stagesSection(lines: string[]): Section {
  const heading = lines.findIndex((l) => /^##\s*Interview stages reached\s*$/i.test(l));
  if (heading < 0) return { lines, heading, end: -1 };
  let end = heading + 1;
  while (end < lines.length && !/^##\s/.test(lines[end])) end++;
  return { lines, heading, end };
}

/** Makes sure the stages section exists, adding it before "## Notes" (or at the end). */
function ensureStages(lines: string[]): Section {
  const section = stagesSection(lines);
  if (section.heading >= 0) return section;
  const notes = lines.findIndex((l) => /^##\s*Notes\s*$/i.test(l));
  const at = notes >= 0 ? notes : lines.length;
  lines.splice(at, 0, "## Interview stages reached", "");
  return stagesSection(lines);
}

/** Writes one stage line: ticked with its date, or unticked with an optional schedule. */
function setStage(lines: string[], label: string, line: { done: boolean; date?: string; scheduled?: string }) {
  const section = ensureStages(lines);
  const render = (name: string) =>
    line.done
      ? `${name}${line.date ? ` (${line.date})` : ""}`
      : `${name}${line.scheduled ? ` (scheduled ${line.scheduled})` : ""}`;

  let lastStage = -1;
  let offerLine = -1;
  for (let i = section.heading + 1; i < section.end; i++) {
    const m = lines[i].match(STAGE_LINE);
    if (!m) continue;
    lastStage = i;
    const parsed = parseStageText(m[3]);
    if (sameStage(parsed.label, OFFER_STAGE)) offerLine = i;
    if (sameStage(parsed.label, label)) {
      const wasDone = m[2].toLowerCase() === "x";
      // A stage that already happened keeps its recorded date unless a new one is given.
      if (wasDone && line.done && !line.date) return;
      // Keep the file's own spelling of the stage name.
      lines[i] = `${m[1]}[${line.done ? "x" : " "}] ${render(parsed.label)}`;
      return;
    }
  }
  // New stage: before "Offer received" so the list stays chronological.
  const at = offerLine >= 0 && !sameStage(label, OFFER_STAGE) ? offerLine : lastStage >= 0 ? lastStage + 1 : section.heading + 1;
  lines.splice(at, 0, `- [${line.done ? "x" : " "}] ${render(label)}`);
}

function setField(lines: string[], name: string, value: string) {
  const re = new RegExp(`^\\*\\*${name}:\\*\\*`, "i");
  const i = lines.findIndex((l) => re.test(l));
  if (i >= 0) {
    lines[i] = `**${name}:** ${value}`;
    return;
  }
  if (name === "Date resolved") {
    const status = lines.findIndex((l) => /^\*\*Status:\*\*/i.test(l));
    if (status >= 0) {
      lines.splice(status + 1, 0, "", `**Date resolved:** ${value}`);
      return;
    }
  }
  const title = lines.findIndex((l) => /^#\s/.test(l));
  lines.splice(title + 1, 0, "", `**${name}:** ${value}`);
}

function appendNote(lines: string[], today: string, note: string) {
  const clean = note.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!clean) return;
  let notes = lines.findIndex((l) => /^##\s*Notes\s*$/i.test(l));
  if (notes < 0) {
    while (lines.length && lines.at(-1)!.trim() === "") lines.pop();
    lines.push("", "## Notes", "");
    notes = lines.length - 2;
  }
  let end = notes + 1;
  while (end < lines.length && !/^##\s/.test(lines[end])) end++;
  // Insert after the last non-empty line of the section.
  let at = end;
  while (at > notes + 1 && lines[at - 1].trim() === "") at--;
  lines.splice(at, 0, `- ${today}: ${clean}`);
}

export type OutcomeEdit =
  | { kind: "schedule"; stage: string; when: string; note?: string }
  | { kind: "complete"; stage: string; date: string; note?: string }
  | { kind: "offer"; date: string; note?: string }
  | { kind: "resolve"; status: Exclude<ArchiveStatus, "in_progress">; date: string; note?: string }
  | { kind: "note"; note: string };

/**
 * Applies one edit. `text` is the current file or null when there is none yet
 * (then the /outcome template is created first). `today` dates the note.
 */
export function applyOutcomeEdit(
  text: string | null,
  edit: OutcomeEdit,
  ctx: { company: string; role: string; today: string },
): string {
  const source = text ?? newOutcome(ctx.company, ctx.role);
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = source.split(/\r?\n/);

  switch (edit.kind) {
    case "schedule": {
      const stage = cleanStageLabel(edit.stage);
      if (!stage) throw new OutcomeConflictError("Podaj nazwę etapu.");
      setStage(lines, stage, { done: false, scheduled: edit.when });
      break;
    }
    case "complete": {
      const stage = cleanStageLabel(edit.stage);
      if (!stage) throw new OutcomeConflictError("Podaj nazwę etapu.");
      setStage(lines, stage, { done: true, date: edit.date });
      break;
    }
    case "offer":
      setStage(lines, OFFER_STAGE, { done: true, date: edit.date });
      break;
    case "resolve":
      setField(lines, "Status", edit.status);
      setField(lines, "Date resolved", edit.date);
      break;
    case "note":
      break;
  }
  if (edit.note) appendNote(lines, ctx.today, edit.note);

  let out = lines.join(eol);
  if (!out.endsWith(eol)) out += eol;
  return out;
}

/** Tracker status -> archive Status for the final values both enums share. */
export function archiveStatusFor(trackerStatus: string): Exclude<ArchiveStatus, "in_progress"> | null {
  switch (trackerStatus) {
    case "hired":
    case "rejected":
    case "no_response":
    case "offer_declined":
      return trackerStatus;
    default:
      return null;
  }
}
