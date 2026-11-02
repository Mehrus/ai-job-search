import { Badge } from "@/components/ui/badge";
import { deadlineState, daysUntil } from "@/lib/data/deadline";
import { bandLabel, type FitBand, type GateVerdict } from "@/lib/data/offers";
import { cn } from "@/lib/utils";

const BAND_STYLES: Record<FitBand, string> = {
  strong: "bg-emerald-600 text-white",
  good: "bg-green-500/90 text-white",
  moderate: "bg-amber-400 text-amber-950",
  weak: "bg-orange-200 text-orange-900 dark:bg-orange-900/50 dark:text-orange-100",
  poor: "bg-muted text-muted-foreground",
};

export function ScoreBadge({ score, band }: { score: number | null; band: FitBand | null }) {
  if (score === null && band === null) return <span className="text-muted-foreground">-</span>;
  return (
    <Badge className={cn("tabular-nums min-w-10 border-transparent", band ? BAND_STYLES[band] : "")}>
      {score ?? "?"}
    </Badge>
  );
}

export function BandBadge({ band }: { band: FitBand | null }) {
  if (!band) return null;
  return (
    <Badge variant="outline" className="font-normal">
      {bandLabel(band)}
    </Badge>
  );
}

export function DeadlineLabel({ deadline, today }: { deadline: string | null; today: string }) {
  if (!deadline) return <span className="text-muted-foreground">-</span>;
  const state = deadlineState(deadline, today);
  const days = daysUntil(deadline, today);
  const hint =
    state === "passed" ? "termin minął" : days === 0 ? "dziś" : days === 1 ? "jutro" : `za ${days} dni`;
  return (
    <span
      title={hint}
      className={cn(
        "tabular-nums whitespace-nowrap",
        state === "passed" && "text-muted-foreground line-through",
        state === "soon" && "font-semibold text-red-600 dark:text-red-400",
      )}
    >
      {state === "soon" && "🔥 "}
      {state === "passed" && "⚠ "}
      {deadline}
    </span>
  );
}

const GATE_STYLES: Record<GateVerdict, string> = {
  PASS: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  FLAG: "border-amber-500/50 text-amber-700 dark:text-amber-300",
  FAIL: "border-red-500/50 text-red-700 dark:text-red-300",
};

export function GateBadge({ label, verdict }: { label: string; verdict: GateVerdict | null }) {
  if (!verdict) return null;
  return (
    <Badge variant="outline" className={GATE_STYLES[verdict]}>
      {label}: {verdict}
    </Badge>
  );
}

const STATUS_LABELS: Record<string, string> = {
  drafted: "szkic",
  applied: "wysłano",
  interview: "rozmowy",
  offer: "oferta",
  hired: "zatrudniony",
  rejected: "odrzucono",
  no_response: "brak odpowiedzi",
  offer_declined: "oferta odrzucona",
  withdrawn: "wycofano",
};

export function TrackerBadge({ status }: { status: string }) {
  return <Badge variant="secondary">{STATUS_LABELS[status] ?? status}</Badge>;
}
