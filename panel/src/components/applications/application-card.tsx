import Link from "next/link";

import { DeadlineLabel, TrackerBadge } from "@/components/offers/badges";
import { daysUntil } from "@/lib/data/deadline";
import type { Application } from "@/lib/data/load";
import { formatWhen, stageLabel } from "@/lib/stages";
import { cn } from "@/lib/utils";

/** /outcome flags 10+ quiet days for a follow-up and 60+ for the stale sweep. */
function QuietLabel({ app, today }: { app: Application; today: string }) {
  if (app.column === "drafted" || app.column === "closed" || !app.lastActivity) return null;
  const days = -daysUntil(app.lastActivity, today);
  if (days < 0) return null;
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        days >= 60 ? "font-medium text-red-600 dark:text-red-400" : days >= 10 ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground",
      )}
      title="Dni od ostatniej aktywności (data aplikacji lub ostatnia datowana notatka)"
    >
      cisza {days} d{app.followUps > 0 ? ` · follow-up ×${app.followUps}` : ""}
    </span>
  );
}

export function ApplicationCard({ app, today }: { app: Application; today: string }) {
  const body = (
    <div className="bg-card hover:border-ring/60 flex flex-col gap-1.5 rounded-lg border p-3 shadow-xs transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{app.company}</div>
          <div className="text-muted-foreground line-clamp-2 text-xs">{app.role}</div>
        </div>
        {app.fitRating !== null && (
          <span className="bg-muted shrink-0 rounded px-1.5 py-0.5 text-xs tabular-nums" title="fit_rating">
            {app.fitRating}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {app.column === "closed" && <TrackerBadge status={app.status} />}
        {app.date && <span className="text-muted-foreground tabular-nums">{app.date}</span>}
        {app.column === "drafted" && app.deadline && <DeadlineLabel deadline={app.deadline} today={today} />}
        <QuietLabel app={app} today={today} />
      </div>
      {app.nextStage?.scheduled && app.column !== "closed" && (
        <div className="text-xs text-sky-700 dark:text-sky-300">
          {stageLabel(app.nextStage.label)}: {formatWhen(app.nextStage.scheduled)}
        </div>
      )}
    </div>
  );

  return app.slug ? (
    <Link href={`/applications/${encodeURIComponent(app.slug)}`} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
