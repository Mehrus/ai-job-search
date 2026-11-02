import { ArrowLeft, CheckSquare, ExternalLink, Square } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { IntervioCard } from "@/components/intervio-card";
import { ApplicationActions } from "@/components/applications/application-actions";
import { DeadlineLabel, TrackerBadge } from "@/components/offers/badges";
import { Markdown } from "@/components/markdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadArchive } from "@/lib/data/archive";
import { localToday } from "@/lib/data/deadline";
import { loadWorkspace } from "@/lib/data/load";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm break-words">{children ?? "-"}</dd>
    </div>
  );
}

export default async function ApplicationPage({ params }: PageProps<"/applications/[slug]">) {
  await connection();
  const slug = decodeURIComponent((await params).slug);
  const { root, applications, offers } = await loadWorkspace();
  const app = applications.find((a) => a.slug === slug);
  if (!app) notFound();

  const archive = await loadArchive(root, app);
  const today = localToday();
  const outcome = archive?.outcome ?? null;
  const offer = app.offerKey ? offers.find((o) => o.key === app.offerKey) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/applications"
        className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" /> Wszystkie aplikacje
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{app.role}</h1>
          <p className="text-muted-foreground">{app.company}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TrackerBadge status={app.status} />
            {outcome?.status && <span className="text-muted-foreground text-xs">outcome.md: {outcome.status}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {app.offerKey && (
            <Link
              href={`/offers/${encodeURIComponent(app.offerKey)}`}
              className="hover:bg-accent inline-flex h-8 items-center rounded-md border px-3 text-sm"
            >
              Ocena z /rank
            </Link>
          )}
          {app.source && (
            <a
              href={app.source}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-accent inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm"
            >
              <ExternalLink className="size-4" /> Ogłoszenie
            </a>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktualizuj</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationActions row={app.rowRef} status={app.status} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Data">{app.date}</Field>
            <Field label="Ostatnia aktywność">{app.lastActivity}</Field>
            <Field label="Termin">
              <DeadlineLabel deadline={app.deadline} today={today} />
            </Field>
            <Field label="Fit">{app.fitRating}</Field>
            <Field label="Kanał">{app.channel}</Field>
            <Field label="Kontakt">{app.contactPerson}</Field>
            <Field label="Sektor">{app.sector}</Field>
            <Field label="Follow-upy">{app.followUps}</Field>
            <Field label="CV">{app.cvFile && <code className="text-xs">{app.cvFile}</code>}</Field>
            <Field label="List">{app.coverLetterFile && <code className="text-xs">{app.coverLetterFile}</code>}</Field>
          </dl>
          {app.notes && (
            <div className="mt-4">
              <div className="text-muted-foreground text-xs">Notatki z trackera</div>
              <p className="text-sm whitespace-pre-wrap">{app.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Etapy rozmów</CardTitle>
            <CardDescription>
              {outcome ? `z outcome.md${outcome.dateResolved ? `, zamknięte ${outcome.dateResolved}` : ""}` : "brak outcome.md"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {outcome && outcome.stages.length > 0 ? (
              <ul className="space-y-1.5 text-sm">
                {outcome.stages.map((s) => (
                  <li key={s.label} className="flex items-center gap-2">
                    {s.done ? (
                      <CheckSquare className="size-4 text-emerald-600" />
                    ) : (
                      <Square className="text-muted-foreground size-4" />
                    )}
                    <span className={s.done ? "" : "text-muted-foreground"}>{s.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                Etapy pojawią się po <code>/outcome</code>.
              </p>
            )}
            {outcome?.notes && (
              <div className="mt-4 border-t pt-3">
                <Markdown>{outcome.notes}</Markdown>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Przygotowanie do rozmów</CardTitle>
            <CardDescription>
              {archive?.prepPacks.length
                ? `${archive.prepPacks.length} × interview_prep z /interview`
                : "Brak prep packów. Wygenerujesz je przez /interview w Claude Code."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {archive?.prepPacks.map((pack, i) => (
              <details key={pack.file} open={i === archive.prepPacks.length - 1} className="rounded-lg border">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium capitalize">{pack.stage}</summary>
                <div className="border-t px-3 py-2">
                  <Markdown>{pack.markdown}</Markdown>
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      </div>

      <IntervioCard
        title={app.role}
        texts={[...(offer?.strengths ?? []), ...(offer?.gaps ?? []), archive?.postingMarkdown]}
      />

      {archive?.postingMarkdown && (
        <details className="bg-card rounded-xl border">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium">Zarchiwizowane ogłoszenie</summary>
          <div className="border-t px-5 py-3">
            <Markdown>{archive.postingMarkdown}</Markdown>
          </div>
        </details>
      )}

      {archive && (
        <p className="text-muted-foreground text-xs">
          Folder: <code>{archive.folder}</code>
          {archive.exists ? ` (${archive.files.length} plików)` : " (jeszcze nie istnieje)"}
        </p>
      )}
    </div>
  );
}
