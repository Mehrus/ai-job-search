/**
 * Same matching rule as `norm()` in tools/rank_state.py: case-insensitive,
 * separators dropped, letters/digits/combining marks kept. Keeping the two in
 * step means the panel links a ranked offer to a tracker row exactly when
 * /rank and /scrape consider them the same job.
 */
export function norm(text: unknown): string {
  const value = String(text ?? "")
    .normalize("NFC")
    .toLowerCase();
  return Array.from(value)
    .filter((ch) => /[\p{L}\p{N}\p{M}]/u.test(ch))
    .join("");
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A YYYY-MM-DD string, or null for anything else. Never guesses a date. */
export function isoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!ISO_DATE.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) return null;
  return trimmed;
}

/** Only http(s) links are rendered as links; posting data is untrusted. */
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
