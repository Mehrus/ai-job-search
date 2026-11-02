import { isoDate, safeUrl, str } from "./normalize";

export type FitBand = "strong" | "good" | "moderate" | "weak" | "poor";
export type GateVerdict = "PASS" | "FAIL" | "FLAG";

export interface Offer {
  key: string;
  title: string;
  company: string;
  url: string | null;
  location: string | null;
  portal: string | null;
  source: string | null;
  /** Scraper/ranker status: new, skipped, ranked, expired, unreachable. */
  status: string;
  firstSeen: string | null;
  postedDate: string | null;
  deadline: string | null;
  /** /scrape's rough triage (high/medium/low). */
  scrapeFit: string | null;
  score: number | null;
  band: FitBand | null;
  rankDate: string | null;
  locationVerdict: GateVerdict | null;
  languageGate: GateVerdict | null;
  languageNote: string | null;
  strengths: string[];
  gaps: string[];
}

export const FIT_BANDS: { band: FitBand; label: string; min: number }[] = [
  { band: "strong", label: "Strong Fit", min: 75 },
  { band: "good", label: "Good Fit", min: 60 },
  { band: "moderate", label: "Moderate Fit", min: 45 },
  { band: "weak", label: "Weak Fit", min: 30 },
  { band: "poor", label: "Poor Fit", min: 0 },
];

export function bandLabel(band: FitBand): string {
  return FIT_BANDS.find((b) => b.band === band)?.label ?? band;
}

/** Band from /rank's stored verdict text, falling back to the score thresholds in 04-job-evaluation.md. */
export function toBand(verdict: unknown, score: number | null): FitBand | null {
  const text = typeof verdict === "string" ? verdict.toLowerCase() : "";
  for (const { band } of FIT_BANDS) {
    if (text.includes(band)) return band;
  }
  if (score === null) return null;
  return FIT_BANDS.find((b) => score >= b.min)?.band ?? null;
}

function gate(value: unknown): GateVerdict | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  return upper === "PASS" || upper === "FAIL" || upper === "FLAG" ? upper : null;
}

function bullets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function score(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
}

/**
 * Reads the `seen` map of job_scraper/seen_jobs.json (schema in
 * .claude/skills/job-scraper/SKILL.md, /rank fields added on top).
 * Missing fields stay null - nothing is inferred or backfilled.
 */
export function parseSeenJobs(doc: unknown): Offer[] {
  if (!doc || typeof doc !== "object") throw new Error("seen_jobs.json is not a JSON object");
  const seen = (doc as { seen?: unknown }).seen;
  if (!seen || typeof seen !== "object" || Array.isArray(seen)) {
    throw new Error('seen_jobs.json has no "seen" map');
  }

  const offers: Offer[] = [];
  for (const [key, raw] of Object.entries(seen as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    const s = score(e.rank_score);
    // Legacy entries kept the location verdict in `location` itself.
    const legacyVerdict = gate(e.location);
    offers.push({
      key,
      title: str(e.title) ?? "(bez tytułu)",
      company: str(e.company) ?? "(nieznana firma)",
      url: safeUrl(e.url),
      location: legacyVerdict ? null : str(e.location),
      portal: str(e.portal),
      source: str(e.source),
      status: str(e.status)?.toLowerCase() ?? "new",
      firstSeen: isoDate(e.first_seen),
      postedDate: isoDate(e.posted_date),
      deadline: isoDate(e.deadline),
      scrapeFit: str(e.fit),
      score: s,
      band: s === null && !e.rank_verdict ? null : toBand(e.rank_verdict, s),
      rankDate: isoDate(e.rank_date),
      locationVerdict: gate(e.location_verdict) ?? legacyVerdict,
      languageGate: gate(e.language_gate),
      languageNote: str(e.language_note),
      strengths: bullets(e.strengths),
      gaps: bullets(e.gaps),
    });
  }
  return offers;
}

/** Default order: ranked first by score, then newest first-seen. */
export function compareOffers(a: Offer, b: Offer): number {
  if (a.score !== null || b.score !== null) {
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    if (a.score !== b.score) return b.score - a.score;
  }
  return (b.firstSeen ?? "").localeCompare(a.firstSeen ?? "");
}
