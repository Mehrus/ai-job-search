"use client";

import { ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deadlineState } from "@/lib/data/deadline";
import type { OfferWithTracker } from "@/lib/data/load";
import { FIT_BANDS, type FitBand } from "@/lib/data/offers";
import { cn } from "@/lib/utils";

import { BandBadge, DeadlineLabel, ScoreBadge, TrackerBadge } from "./badges";
import { CopyApplyButton } from "./copy-apply-button";

type SortKey = "score" | "deadline" | "first_seen";

interface Filters {
  q: string;
  minScore: number;
  band: FitBand | "all";
  portal: string;
  status: string;
  hideTracked: boolean;
  hideVetoed: boolean;
  sort: SortKey;
}

const selectClass =
  "border-input dark:bg-input/30 h-9 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

function isVetoed(offer: OfferWithTracker) {
  return offer.locationVerdict === "FAIL" || offer.languageGate === "FAIL";
}

function sortOffers(list: OfferWithTracker[], sort: SortKey): OfferWithTracker[] {
  if (sort === "score") return list; // already in score order from the loader
  const copy = [...list];
  if (sort === "deadline") {
    copy.sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
  } else {
    copy.sort((a, b) => (b.firstSeen ?? "").localeCompare(a.firstSeen ?? ""));
  }
  return copy;
}

export function OffersView({ offers, today }: { offers: OfferWithTracker[]; today: string }) {
  const portals = useMemo(
    () => Array.from(new Set(offers.map((o) => o.portal).filter((p): p is string => !!p))).sort(),
    [offers],
  );
  const statuses = useMemo(() => Array.from(new Set(offers.map((o) => o.status))).sort(), [offers]);
  const hasRanked = statuses.includes("ranked");

  const [filters, setFilters] = useState<Filters>({
    q: "",
    minScore: 0,
    band: "all",
    portal: "all",
    status: hasRanked ? "ranked" : "all",
    hideTracked: false,
    hideVetoed: true,
    sort: "score",
  });
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const filtered = offers.filter((o) => {
      if (filters.status !== "all" && o.status !== filters.status) return false;
      if (filters.portal !== "all" && o.portal !== filters.portal) return false;
      if (filters.band !== "all" && o.band !== filters.band) return false;
      if (filters.minScore > 0 && (o.score ?? -1) < filters.minScore) return false;
      if (filters.hideTracked && o.tracker) return false;
      if (filters.hideVetoed && isVetoed(o)) return false;
      if (q && !`${o.title} ${o.company} ${o.location ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortOffers(filtered, filters.sort);
  }, [offers, filters]);

  const ranked = offers.filter((o) => o.status === "ranked");
  const stats = [
    { label: "Wszystkie", value: offers.length },
    { label: "Ocenione", value: ranked.length },
    { label: "Strong / Good", value: ranked.filter((o) => o.band === "strong" || o.band === "good").length },
    {
      label: "Termin ≤ 7 dni",
      value: ranked.filter((o) => deadlineState(o.deadline, today) === "soon").length,
    },
    { label: "W trackerze", value: offers.filter((o) => o.tracker).length },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-lg border px-4 py-3">
            <div className="text-muted-foreground text-xs">{s.label}</div>
            <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            placeholder="Szukaj: stanowisko, firma, miasto"
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
            className="pl-8"
          />
        </div>
        <select className={selectClass} value={filters.status} onChange={(e) => set("status", e.target.value)}>
          <option value="all">Każdy status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={filters.band}
          onChange={(e) => set("band", e.target.value as Filters["band"])}
        >
          <option value="all">Każde dopasowanie</option>
          {FIT_BANDS.map((b) => (
            <option key={b.band} value={b.band}>
              {b.label}
            </option>
          ))}
        </select>
        <select className={selectClass} value={filters.portal} onChange={(e) => set("portal", e.target.value)}>
          <option value="all">Każdy portal</option>
          {portals.map((p) => (
            <option key={p} value={p}>
              {p.replace(/-search$/, "")}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          Min. score
          <Input
            type="number"
            min={0}
            max={100}
            step={5}
            value={filters.minScore}
            onChange={(e) => set("minScore", Number(e.target.value) || 0)}
            className="w-20"
          />
        </label>
        <select
          className={selectClass}
          value={filters.sort}
          onChange={(e) => set("sort", e.target.value as SortKey)}
        >
          <option value="score">Sortuj: score</option>
          <option value="deadline">Sortuj: termin</option>
          <option value="first_seen">Sortuj: najnowsze</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={filters.hideTracked}
            onChange={(e) => set("hideTracked", e.target.checked)}
          />
          Ukryj już w trackerze
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={filters.hideVetoed}
            onChange={(e) => set("hideVetoed", e.target.checked)}
          />
          Ukryj odrzucone (lokalizacja/język)
        </label>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Score</TableHead>
              <TableHead>Stanowisko</TableHead>
              <TableHead>Firma</TableHead>
              <TableHead className="hidden md:table-cell">Lokalizacja</TableHead>
              <TableHead className="hidden lg:table-cell">Portal</TableHead>
              <TableHead>Termin</TableHead>
              <TableHead className="hidden sm:table-cell">Tracker</TableHead>
              <TableHead className="w-20 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                  Brak ofert dla tych filtrów.
                </TableCell>
              </TableRow>
            )}
            {visible.map((o) => (
              <TableRow key={o.key} className={cn(isVetoed(o) && "opacity-60")}>
                <TableCell>
                  <ScoreBadge score={o.score} band={o.band} />
                </TableCell>
                <TableCell className="max-w-80">
                  <Link
                    href={`/offers/${encodeURIComponent(o.key)}`}
                    className="font-medium hover:underline"
                  >
                    {o.title}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    <BandBadge band={o.band} />
                    {o.languageGate === "FLAG" && (
                      <span className="text-xs text-amber-700 dark:text-amber-300">⚑ język</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{o.company}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">{o.location ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell">
                  {o.portal?.replace(/-search$/, "") ?? "-"}
                </TableCell>
                <TableCell>
                  <DeadlineLabel deadline={o.deadline} today={today} />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {o.tracker ? <TrackerBadge status={o.tracker.status} /> : null}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {o.url && (
                      <>
                        <CopyApplyButton url={o.url} compact />
                        <a
                          href={o.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:bg-accent inline-flex size-8 items-center justify-center rounded-md"
                          title="Otwórz ogłoszenie"
                          aria-label="Otwórz ogłoszenie"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-muted-foreground text-xs">
        Pokazano {visible.length} z {offers.length}. Score to triage /rank z treści ogłoszenia; /apply robi pełną
        ocenę z researchem firmy.
      </p>
    </div>
  );
}
