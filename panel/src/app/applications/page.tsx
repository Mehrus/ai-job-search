import { connection } from "next/server";

import { ApplicationCard } from "@/components/applications/application-card";
import { WorkspaceWarnings } from "@/components/workspace-warnings";
import { COLUMNS } from "@/lib/data/applications";
import { localToday } from "@/lib/data/deadline";
import { loadWorkspace } from "@/lib/data/load";

export default async function ApplicationsPage() {
  await connection();
  const { applications, warnings, root } = await loadWorkspace();
  const today = localToday();

  // Newest activity first inside each column.
  const sorted = [...applications].sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Aplikacje</h1>
        <p className="text-muted-foreground text-sm">
          Z <code>job_search_tracker.csv</code>. Status zmieniasz na razie przez <code>/outcome</code> w Claude Code.
        </p>
      </div>
      <WorkspaceWarnings warnings={warnings.filter((w) => !w.includes("seen_jobs"))} root={root} />

      {applications.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border px-4 py-10 text-center text-sm">
          Brak aplikacji w trackerze. Pojawią się po <code>/apply</code> albo <code>/outcome</code>.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((col) => {
            const items = sorted.filter((a) => a.column === col.id);
            return (
              <section key={col.id} className="bg-muted/40 flex flex-col gap-2 rounded-xl p-2">
                <header className="px-1 pt-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">{col.label}</h2>
                    <span className="text-muted-foreground text-xs tabular-nums">{items.length}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">{col.hint}</p>
                </header>
                {items.map((app, i) => (
                  <ApplicationCard key={`${app.slug}-${i}`} app={app} today={today} />
                ))}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
