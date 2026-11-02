import { CalendarClock } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysUntil } from "@/lib/data/deadline";
import type { Application } from "@/lib/data/load";
import { formatWhen, stageLabel } from "@/lib/stages";
import { cn } from "@/lib/utils";

function relative(days: number): string {
  if (days === 0) return "dziś";
  if (days === 1) return "jutro";
  if (days > 1) return `za ${days} d`;
  return `${-days} d temu, odhacz`;
}

/** Scheduled, not yet ticked stages from every open application's outcome.md, soonest first. */
export function UpcomingStages({ applications, today }: { applications: Application[]; today: string }) {
  const upcoming = applications
    .filter((a) => a.nextStage?.scheduled && a.column !== "closed")
    .sort((a, b) => a.nextStage!.scheduled!.localeCompare(b.nextStage!.scheduled!));
  if (upcoming.length === 0) return null;

  return (
    <Card className="mb-4 gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4" /> Najbliższe etapy
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <ul className="divide-y text-sm">
          {upcoming.map((app) => {
            const when = app.nextStage!.scheduled!;
            const days = daysUntil(when.slice(0, 10), today);
            return (
              <li key={`${app.rowRef.index}`} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5">
                <span className="w-36 shrink-0 tabular-nums">{formatWhen(when)}</span>
                <span
                  className={cn(
                    "w-28 shrink-0 text-xs",
                    days < 0 ? "text-amber-700 dark:text-amber-300" : days <= 1 ? "font-medium text-sky-700 dark:text-sky-300" : "text-muted-foreground",
                  )}
                >
                  {relative(days)}
                </span>
                <span className="font-medium">{stageLabel(app.nextStage!.label)}</span>
                {app.slug ? (
                  <Link href={`/applications/${encodeURIComponent(app.slug)}`} className="text-muted-foreground hover:underline">
                    {app.company} · {app.role}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">
                    {app.company} · {app.role}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
