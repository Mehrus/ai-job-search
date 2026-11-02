import type { OutcomeFile } from "./applications";
import type { Offer } from "./offers";
import { FIT_BANDS } from "./offers";
import type { TrackerRow } from "./tracker";

/** One labelled count; the bar charts and the tables both read these. */
export interface Bar {
  label: string;
  value: number;
}

export interface ApplicationStats {
  submitted: number;
  drafted: number;
  buckets: Bar[];
  unknownStatuses: string[];
  funnel: Bar[];
  /** Share of submitted applications that reached an interview, 0-1, or null with nothing submitted. */
  interviewRate: number | null;
  /** True rejections / applications with a final outcome (as /html-report defines it). */
  rejectionRate: number | null;
  byChannel: Bar[];
  bySector: Bar[];
  byMonth: Bar[];
}

const BUCKET_OF: Record<string, string> = {
  applied: "Aktywne",
  interview: "Rozmowy",
  offer: "Oferta",
  hired: "Zatrudniony",
  rejected: "Odrzucone / zamknięte",
  no_response: "Odrzucone / zamknięte",
  offer_declined: "Odrzucone / zamknięte",
  withdrawn: "Odrzucone / zamknięte",
};
const BUCKET_ORDER = ["Aktywne", "Rozmowy", "Oferta", "Zatrudniony", "Odrzucone / zamknięte"];
const FINAL = new Set(["hired", "rejected", "no_response", "offer_declined", "withdrawn"]);

const INTERVIEW_STAGE = /phone|screen|technical|case|final|interview|onsite|rozmow/i;
const OFFER_STAGE = /offer|oferta/i;

function count(values: string[], top = 8): Bar[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const head = sorted.slice(0, top).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(top).reduce((sum, [, n]) => sum + n, 0);
  return rest > 0 ? [...head, { label: "Inne", value: rest }] : head;
}

/**
 * Same rules as /html-report Step 2: drafted rows are left out of every
 * statistic; a stage counts as reached when the current status implies it OR
 * outcome.md ticks it, so a rejected-after-interview row still counts as an
 * interview.
 */
export function applicationStats(
  rows: (TrackerRow & { outcome?: OutcomeFile | null })[],
): ApplicationStats {
  const drafted = rows.filter((r) => r.status === "drafted").length;
  const sent = rows.filter((r) => r.status !== "drafted");

  const unknown = new Set<string>();
  const buckets = new Map(BUCKET_ORDER.map((b) => [b, 0]));
  for (const r of sent) {
    const bucket = BUCKET_OF[r.status];
    if (!bucket) unknown.add(r.status || "(pusty)");
    const key = bucket ?? "Odrzucone / zamknięte";
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const reached = (r: (typeof sent)[number], level: "interview" | "offer" | "hired") => {
    const stages = r.outcome?.stages.filter((s) => s.done).map((s) => s.label) ?? [];
    if (level === "hired") return r.status === "hired";
    if (level === "offer")
      return ["offer", "hired", "offer_declined"].includes(r.status) || stages.some((s) => OFFER_STAGE.test(s));
    return (
      ["interview", "offer", "hired", "offer_declined"].includes(r.status) ||
      stages.some((s) => INTERVIEW_STAGE.test(s) || OFFER_STAGE.test(s))
    );
  };
  const interviews = sent.filter((r) => reached(r, "interview")).length;

  const finals = sent.filter((r) => FINAL.has(r.status));
  const trueRejections = finals.filter((r) => r.status === "rejected" || r.status === "no_response").length;

  return {
    submitted: sent.length,
    drafted,
    buckets: BUCKET_ORDER.map((label) => ({ label, value: buckets.get(label) ?? 0 })),
    unknownStatuses: [...unknown],
    funnel: [
      { label: "Wysłane", value: sent.length },
      { label: "Rozmowa", value: interviews },
      { label: "Oferta", value: sent.filter((r) => reached(r, "offer")).length },
      { label: "Zatrudnienie", value: sent.filter((r) => reached(r, "hired")).length },
    ],
    interviewRate: sent.length ? interviews / sent.length : null,
    rejectionRate: finals.length ? trueRejections / finals.length : null,
    byChannel: count(sent.map((r) => r.channel ?? "(brak)")),
    bySector: count(sent.map((r) => r.sector ?? "(brak)")),
    byMonth: count(
      sent.map((r) => (r.date && /^\d{4}(-\d{2})?/.test(r.date) ? r.date.slice(0, 7) : "(brak daty)")),
      24,
    ).sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export interface OfferStats {
  total: number;
  ranked: number;
  averageScore: number | null;
  byBand: Bar[];
  byPortal: Bar[];
  byStatus: Bar[];
}

export function offerStats(offers: Offer[]): OfferStats {
  const ranked = offers.filter((o) => o.status === "ranked" && o.score !== null);
  return {
    total: offers.length,
    ranked: ranked.length,
    averageScore: ranked.length ? Math.round(ranked.reduce((s, o) => s + (o.score ?? 0), 0) / ranked.length) : null,
    byBand: FIT_BANDS.map((b) => ({ label: b.label, value: ranked.filter((o) => o.band === b.band).length })),
    byPortal: count(offers.map((o) => o.portal?.replace(/-search$/, "") ?? "(brak)")),
    byStatus: count(offers.map((o) => o.status)),
  };
}
