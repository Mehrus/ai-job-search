import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { IntervioCard } from "@/components/intervio-card";
import { BandBadge, DeadlineLabel, GateBadge, ScoreBadge, TrackerBadge } from "@/components/offers/badges";
import { CopyApplyButton } from "@/components/offers/copy-apply-button";
import { MarkAppliedButton } from "@/components/offers/mark-applied-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { archiveFolderName } from "@/lib/data/applications";
import { localToday } from "@/lib/data/deadline";
import { loadWorkspace } from "@/lib/data/load";
import { FINAL_STATUSES, type TrackerStatus } from "@/lib/data/tracker";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{children ?? "-"}</dd>
    </div>
  );
}

function Bullets({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-muted-foreground text-sm">{empty}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default async function OfferPage({ params }: PageProps<"/offers/[key]">) {
  await connection();
  const { key } = await params;
  const decoded = decodeURIComponent(key);
  const { offers } = await loadWorkspace();
  const offer = offers.find((o) => o.key === decoded);
  if (!offer) notFound();

  const today = localToday();
  const trackerStatus = offer.tracker?.status ?? null;
  const canApply = !trackerStatus || trackerStatus === "drafted" || FINAL_STATUSES.has(trackerStatus as TrackerStatus);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline">
        <ArrowLeft className="size-4" /> Wszystkie oferty
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{offer.title}</h1>
          <p className="text-muted-foreground">
            {offer.company}
            {offer.location ? ` · ${offer.location}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ScoreBadge score={offer.score} band={offer.band} />
            <BandBadge band={offer.band} />
            <GateBadge label="Lokalizacja" verdict={offer.locationVerdict} />
            <GateBadge label="Język" verdict={offer.languageGate} />
            {offer.tracker && <TrackerBadge status={offer.tracker.status} />}
          </div>
        </div>
        <div className="flex items-start gap-2">
          {canApply && <MarkAppliedButton offerKey={offer.key} drafted={trackerStatus === "drafted"} />}
          {offer.url && <CopyApplyButton url={offer.url} />}
          {offer.url && (
            <a
              href={offer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-accent inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm"
            >
              <ExternalLink className="size-4" /> Ogłoszenie
            </a>
          )}
        </div>
      </div>

      {offer.languageNote && (
        <p className="rounded-md border border-amber-500/50 px-3 py-2 text-sm">
          <span className="font-medium">Uwaga językowa:</span> {offer.languageNote}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mocne strony</CardTitle>
          </CardHeader>
          <CardContent>
            <Bullets items={offer.strengths} empty="Brak zapisanych (oferta oceniona przed tą funkcją lub nieoceniona)." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Luki</CardTitle>
          </CardHeader>
          <CardContent>
            <Bullets items={offer.gaps} empty="Brak zapisanych luk." />
          </CardContent>
        </Card>
      </div>

      <IntervioCard title={offer.title} texts={[...offer.strengths, ...offer.gaps]} />

      <Card>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Termin">
              <DeadlineLabel deadline={offer.deadline} today={today} />
            </Field>
            <Field label="Opublikowano">{offer.postedDate}</Field>
            <Field label="Pierwszy raz widziana">{offer.firstSeen}</Field>
            <Field label="Oceniona">{offer.rankDate}</Field>
            <Field label="Portal">{offer.portal}</Field>
            <Field label="Status">{offer.status}</Field>
            <Field label="Triage /scrape">{offer.scrapeFit}</Field>
            <Field label="Klucz">
              <code className="text-xs break-all">{offer.key}</code>
            </Field>
          </dl>
        </CardContent>
      </Card>

      {offer.tracker && (
        <Card>
          <CardHeader>
            <CardTitle>Aplikacja (tracker)</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Status">
                <TrackerBadge status={offer.tracker.status} />
              </Field>
              <Field label="Data">{offer.tracker.date}</Field>
              <Field label="Kanał">{offer.tracker.channel}</Field>
              <Field label="Fit">{offer.tracker.fitRating}</Field>
            </dl>
            {offer.tracker.notes && <p className="mt-3 text-sm whitespace-pre-wrap">{offer.tracker.notes}</p>}
            {archiveFolderName(offer.tracker.company, offer.tracker.role) && (
              <Link
                href={`/applications/${encodeURIComponent(archiveFolderName(offer.tracker.company, offer.tracker.role)!)}`}
                className="mt-3 inline-block text-sm underline"
              >
                Karta aplikacji i przygotowanie do rozmów →
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
