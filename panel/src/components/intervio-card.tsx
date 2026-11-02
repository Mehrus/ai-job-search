import { GraduationCap } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { intervioBase, intervioCatalogUrl, intervioTopics } from "@/lib/intervio";

/** "Practise for this role in Intervio": topics detected in the posting, each linking to the catalog. */
export function IntervioCard({ title, texts }: { title: string; texts: (string | null | undefined)[] }) {
  const base = intervioBase();
  const topics = intervioTopics([title, ...texts]);
  const covered = topics.filter((t) => t.tag || t.search);
  const missing = topics.filter((t) => !t.tag && !t.search);
  const tags = covered.flatMap((t) => (t.tag ? [t.tag] : []));
  const all = intervioCatalogUrl(base, { title, tags });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="size-5" /> Ćwicz w Intervio
        </CardTitle>
        <CardDescription>
          Tematy wykryte w ogłoszeniu i ocenie. Intervio musi działać lokalnie ({base}, zmienisz przez{" "}
          <code>INTERVIO_URL</code>).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <a
            href={all}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 items-center rounded-md px-3 text-sm"
          >
            {tags.length ? "Pytania na te tematy" : "Katalog pytań"}
          </a>
          {covered.map((t) => (
            <a
              key={t.label}
              href={intervioCatalogUrl(base, { title, tags: t.tag ? [t.tag] : [], search: t.search })}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-accent inline-flex h-8 items-center rounded-md border px-3 text-sm"
            >
              {t.label}
            </a>
          ))}
        </div>
        {missing.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Brak jeszcze pytań w Intervio na: {missing.map((t) => t.label).join(", ")}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
