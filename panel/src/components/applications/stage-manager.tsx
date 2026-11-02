"use client";

import { CalendarClock, CheckSquare, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { recordStage, type RecordStageInput } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OutcomeStage } from "@/lib/data/applications";
import type { RowRef } from "@/lib/data/tracker-write";
import { formatWhen, stageLabel } from "@/lib/stages";
import { cn } from "@/lib/utils";

const OFFER = "offer received";
const OTHER = "__other__";

const selectClass = "border-input dark:bg-input/30 h-9 rounded-md border bg-transparent px-2 text-sm shadow-xs";

export function StageManager({
  row,
  outcomeHash,
  stages,
  status,
  today,
}: {
  row: RowRef;
  outcomeHash: string;
  stages: OutcomeStage[];
  status: string;
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const open = stages.filter((s) => !s.done && s.label.toLowerCase() !== OFFER);
  const defaults = ["Phone screen", "Technical interview", "Case interview", "Final round"];
  const choices = open.length ? open.map((s) => s.label) : defaults;
  const suggested = open.find((s) => !s.scheduled)?.label ?? choices[0];
  const [choice, setChoice] = useState(suggested);
  // After a save the stage list changes: move the picker to the next unplanned stage.
  const [shownHash, setShownHash] = useState(outcomeHash);
  if (shownHash !== outcomeHash) {
    setShownHash(outcomeHash);
    setChoice(suggested);
  }
  const [custom, setCustom] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);

  const closed = ["hired", "rejected", "no_response", "offer_declined", "withdrawn"].includes(status);
  const offerDone = stages.some((s) => s.label.toLowerCase() === OFFER && s.done);
  const stageName = choice === OTHER ? custom.trim() : choice;

  function run(input: Omit<RecordStageInput, "row" | "outcomeHash">, done: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await recordStage({ row, outcomeHash, ...input });
      if (result.ok) {
        setMessage({ ok: true, text: done });
        setDate("");
        setTime("");
        setNote("");
        setCustom("");
        setConfirmReject(false);
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {stages.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {stages.map((s) => {
            const overdue = s.scheduled !== null && s.scheduled.slice(0, 10) < today;
            return (
              <li key={s.label} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {s.done ? (
                  <CheckSquare className="size-4 shrink-0 text-emerald-600" />
                ) : s.scheduled ? (
                  <CalendarClock className="size-4 shrink-0 text-sky-600" />
                ) : (
                  <Square className="text-muted-foreground size-4 shrink-0" />
                )}
                <span className={cn(!s.done && !s.scheduled && "text-muted-foreground")}>{stageLabel(s.label)}</span>
                {s.date && <span className="text-muted-foreground text-xs tabular-nums">{formatWhen(s.date)}</span>}
                {s.scheduled && (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      overdue ? "text-amber-700 dark:text-amber-300" : "text-sky-700 dark:text-sky-300",
                    )}
                  >
                    {overdue ? "było " : ""}
                    {formatWhen(s.scheduled)}
                  </span>
                )}
                {s.scheduled && !closed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-7"
                    disabled={pending}
                    onClick={() =>
                      run(
                        {
                          action: "complete",
                          stage: s.label,
                          // The day it was planned for, unless that is still ahead.
                          date: s.scheduled && s.scheduled.slice(0, 10) < today ? s.scheduled.slice(0, 10) : today,
                        },
                        `Odhaczono: ${stageLabel(s.label)}.`,
                      )
                    }
                  >
                    Odbyło się
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Brak etapów. Zaplanuj pierwszy poniżej.</p>
      )}

      {!closed && (
        <form
          className="flex flex-col gap-2 border-t pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            run({ action: "schedule", stage: stageName, date, time: time || undefined, note }, `Zaplanowano: ${stageLabel(stageName)}.`);
          }}
        >
          <div className="text-sm font-medium">Następny etap</div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Etap" value={choice} onChange={(e) => setChoice(e.target.value)} className={selectClass}>
              {choices.map((c) => (
                <option key={c} value={c}>
                  {stageLabel(c)}
                </option>
              ))}
              <option value={OTHER}>Inny…</option>
            </select>
            {choice === OTHER && (
              <Input
                aria-label="Nazwa etapu"
                placeholder="np. Rozmowa z CTO"
                value={custom}
                maxLength={60}
                onChange={(e) => setCustom(e.target.value)}
                className="w-48"
              />
            )}
            <Input aria-label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            <Input aria-label="Godzina" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-28" />
          </div>
          <Input
            aria-label="Notatka"
            placeholder="Notatka (opcjonalnie), np. live coding + architektura"
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending || !date || !stageName}>
              Zaplanuj
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || !stageName}
              onClick={() =>
                run({ action: "complete", stage: stageName, date: date || today, note }, `Odhaczono: ${stageLabel(stageName)}.`)
              }
              title="Zapisuje etap jako odbyty (z wybraną datą albo dzisiaj)"
            >
              Już się odbył
            </Button>
            {!offerDone && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run({ action: "offer", note }, "Zapisano ofertę.")}
              >
                Dostałem ofertę
              </Button>
            )}
            {confirmReject ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  className="bg-red-600 text-white hover:bg-red-700"
                  disabled={pending}
                  onClick={() => run({ action: "reject", note }, "Zamknięto jako odrzucone.")}
                >
                  Tak, odrzucili
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmReject(false)}>
                  Anuluj
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" variant="ghost" className="text-red-700 dark:text-red-300" onClick={() => setConfirmReject(true)}>
                Odrzucili mnie
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            Zapisuje do <code>outcome.md</code> (format <code>/outcome</code>) i do trackera. Notatka trafia do obu.
          </p>
        </form>
      )}

      {message && (
        <p className={message.ok ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-red-700 dark:text-red-300"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
