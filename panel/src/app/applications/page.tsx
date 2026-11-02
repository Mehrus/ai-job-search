import { connection } from "next/server";

import { KanbanBoard } from "@/components/applications/kanban-board";
import { UpcomingStages } from "@/components/applications/upcoming-stages";
import { WorkspaceWarnings } from "@/components/workspace-warnings";
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
          Z <code>job_search_tracker.csv</code>. Zmiany zapisują się w trackerze, więc <code>/outcome</code> i <code>/html-report</code> je widzą.
        </p>
      </div>
      <WorkspaceWarnings warnings={warnings.filter((w) => !w.includes("seen_jobs"))} root={root} />

      {applications.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border px-4 py-10 text-center text-sm">
          Brak aplikacji w trackerze. Pojawią się po <code>/apply</code> albo <code>/outcome</code>.
        </p>
      ) : (
        <>
          <UpcomingStages applications={applications} today={today} />
          <KanbanBoard applications={sorted} today={today} />
        </>
      )}
    </>
  );
}
