"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateApplication } from "@/app/actions";
import { COLUMNS, type Column } from "@/lib/data/applications";
import type { Application } from "@/lib/data/load";
import { cn } from "@/lib/utils";

import { ApplicationCard } from "./application-card";

/** Columns a card can be dropped on map 1:1 to a status; "closed" needs a reason, so it is set on the card page. */
const DROP_STATUS: Partial<Record<Column, Application["status"]>> = {
  applied: "applied",
  interview: "interview",
  offer: "offer",
};

export function KanbanBoard({ applications, today }: { applications: Application[]; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [moved, setMoved] = useState<Record<string, Column>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Column | null>(null);
  const [error, setError] = useState<string | null>(null);

  const id = (a: Application) => `${a.rowRef.index}:${a.rowRef.hash}`;
  const columnOf = (a: Application) => moved[id(a)] ?? a.column;

  function drop(column: Column) {
    setOver(null);
    const app = applications.find((a) => id(a) === dragging);
    setDragging(null);
    const status = DROP_STATUS[column];
    if (!app || !status || columnOf(app) === column) return;
    if (app.column === "closed") {
      setError("Zamkniętą aplikację otwórz ponownie na jej karcie.");
      return;
    }

    setError(null);
    setMoved((m) => ({ ...m, [id(app)]: column }));
    startTransition(async () => {
      const result = await updateApplication({ row: app.rowRef, status });
      if (!result.ok) {
        setError(result.error);
        setMoved((m) => {
          const rest = { ...m };
          delete rest[id(app)];
          return rest;
        });
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-md border border-red-500/50 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>
      )}
      <div className={cn("grid gap-4 md:grid-cols-3 xl:grid-cols-5", pending && "opacity-80")}>
        {COLUMNS.map((col) => {
          const items = applications.filter((a) => columnOf(a) === col.id);
          const droppable = !!DROP_STATUS[col.id] && dragging !== null;
          return (
            <section
              key={col.id}
              onDragOver={(e) => {
                if (!DROP_STATUS[col.id]) return;
                e.preventDefault();
                setOver(col.id);
              }}
              onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                drop(col.id);
              }}
              className={cn(
                "bg-muted/40 flex min-h-32 flex-col gap-2 rounded-xl p-2 transition-colors",
                droppable && "ring-ring/30 ring-1",
                over === col.id && "bg-muted ring-ring/70 ring-2",
              )}
            >
              <header className="px-1 pt-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{col.label}</h2>
                  <span className="text-muted-foreground text-xs tabular-nums">{items.length}</span>
                </div>
                <p className="text-muted-foreground text-xs">{col.hint}</p>
              </header>
              {items.map((app) => (
                <div
                  key={id(app)}
                  draggable={app.column !== "closed"}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDragging(id(app));
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  className={cn(app.column !== "closed" && "cursor-grab active:cursor-grabbing")}
                >
                  <ApplicationCard app={app} today={today} />
                </div>
              ))}
            </section>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        Przeciągnij kartę do kolumny Wysłane, Rozmowy lub Oferta, a status zapisze się w trackerze. Zamknięcie
        (odrzucenie, wycofanie, zatrudnienie) ustawiasz na karcie aplikacji.
      </p>
    </div>
  );
}
