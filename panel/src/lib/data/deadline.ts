import { isoDate } from "./normalize";

export type DeadlineState = "passed" | "soon" | "open";

/** Same 7-day window /rank Step 3 and /outcome use for 🔥 and ⚠. */
export const DEADLINE_SOON_DAYS = 7;

export function daysUntil(deadline: string, today: string): number {
  const ms = Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function deadlineState(deadline: string | null, today: string): DeadlineState | null {
  const date = isoDate(deadline);
  if (!date) return null;
  const days = daysUntil(date, today);
  if (days < 0) return "passed";
  if (days <= DEADLINE_SOON_DAYS) return "soon";
  return "open";
}

/** Local calendar date as YYYY-MM-DD (the user's day, not UTC's). */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
