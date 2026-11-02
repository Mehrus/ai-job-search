import { connection } from "next/server";

import { OffersView } from "@/components/offers/offers-view";
import { WorkspaceWarnings } from "@/components/workspace-warnings";
import { localToday } from "@/lib/data/deadline";
import { loadWorkspace } from "@/lib/data/load";

export default async function OffersPage() {
  await connection(); // files change between /scrape and /rank runs - always read fresh
  const workspace = await loadWorkspace();

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Oferty</h1>
        <p className="text-muted-foreground text-sm">
          Z <code>job_scraper/seen_jobs.json</code> i <code>job_search_tracker.csv</code>. Odśwież stronę po{" "}
          <code>/scrape</code> lub <code>/rank</code>.
        </p>
      </div>
      <WorkspaceWarnings warnings={workspace.warnings} root={workspace.root} />
      <OffersView offers={workspace.offers} today={localToday()} />
    </>
  );
}
