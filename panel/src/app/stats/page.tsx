import { connection } from "next/server";

import { BarList, StatTile } from "@/components/stats/bar-list";
import { WorkspaceWarnings } from "@/components/workspace-warnings";
import { loadArchive } from "@/lib/data/archive";
import { loadWorkspace } from "@/lib/data/load";
import { applicationStats, offerStats } from "@/lib/data/stats";

const pct = (rate: number | null) => (rate === null ? "-" : `${Math.round(rate * 100)}%`);

export default async function StatsPage() {
  await connection();
  const { root, offers, applications, warnings } = await loadWorkspace();
  const withOutcome = await Promise.all(
    applications.map(async (a) => ({ ...a, outcome: (await loadArchive(root, a))?.outcome ?? null })),
  );
  const apps = applicationStats(withOutcome);
  const off = offerStats(offers);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Statystyki</h1>
        <p className="text-muted-foreground text-sm">
          Liczone jak w <code>/html-report</code>: szkice nie wchodzą do statystyk, a etap liczy się jako osiągnięty
          także wtedy, gdy zaznacza go <code>outcome.md</code>.
        </p>
      </div>
      <WorkspaceWarnings warnings={warnings} root={root} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Aplikacje</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Wysłane" value={apps.submitted} hint={apps.drafted ? `+ ${apps.drafted} w szkicach` : undefined} />
          <StatTile label="Doszło do rozmowy" value={pct(apps.interviewRate)} hint="z wysłanych" />
          <StatTile label="Odrzucenia" value={pct(apps.rejectionRate)} hint="rejected + brak odpowiedzi / zamknięte" />
          <StatTile label="Oferty" value={apps.funnel[2].value} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <BarList
            title="Lejek (etap osiągnięty)"
            bars={apps.funnel}
            total={apps.submitted || undefined}
            empty="Nie ma jeszcze wysłanych aplikacji."
          />
          <BarList title="Status teraz" bars={apps.buckets} total={apps.submitted || undefined} />
          <BarList title="Kanał" bars={apps.byChannel} total={apps.submitted || undefined} />
          <BarList title="Sektor" bars={apps.bySector} total={apps.submitted || undefined} />
          <BarList title="Wysłane w miesiącu" bars={apps.byMonth} />
        </div>
        {apps.unknownStatuses.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Nieznane statusy liczone jako zamknięte: {apps.unknownStatuses.join(", ")}.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Oferty</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Zebrane" value={off.total} />
          <StatTile label="Ocenione" value={off.ranked} />
          <StatTile label="Średni score" value={off.averageScore ?? "-"} hint="ocenionych" />
          <StatTile
            label="Strong + Good"
            value={off.byBand[0].value + off.byBand[1].value}
            hint={off.ranked ? `${Math.round(((off.byBand[0].value + off.byBand[1].value) / off.ranked) * 100)}% ocenionych` : undefined}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <BarList title="Dopasowanie (ocenione)" bars={off.byBand} total={off.ranked || undefined} />
          <BarList title="Portal" bars={off.byPortal} total={off.total || undefined} />
          <BarList title="Status w scraperze" bars={off.byStatus} total={off.total || undefined} />
        </div>
      </section>
    </div>
  );
}
