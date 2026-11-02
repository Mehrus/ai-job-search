"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateApplication, type UpdateApplicationInput } from "@/app/actions";
import { STATUS_LABELS } from "@/components/offers/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RowRef } from "@/lib/data/tracker-write";
import { TRACKER_STATUSES } from "@/lib/data/tracker";

export function ApplicationActions({ row, status }: { row: RowRef; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nextStatus, setNextStatus] = useState(status);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const canFollowUp = status === "applied" || status === "interview";

  function save(input: Omit<UpdateApplicationInput, "row">, done: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateApplication({ row, ...input });
      if (result.ok) {
        setNote("");
        setMessage({ ok: true, text: done });
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save(
            { status: nextStatus === status ? undefined : nextStatus, note: note.trim() || undefined },
            "Zapisano w trackerze.",
          );
        }}
      >
        <select
          aria-label="Status"
          value={nextStatus}
          onChange={(e) => setNextStatus(e.target.value)}
          className="border-input dark:bg-input/30 h-9 rounded-md border bg-transparent px-2 text-sm shadow-xs"
        >
          {!(TRACKER_STATUSES as readonly string[]).includes(status) && <option value={status}>{status}</option>}
          {TRACKER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]} ({s})
            </option>
          ))}
        </select>
        <Input
          placeholder="Krótka notatka, np. rozmowa techniczna 12.11"
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          className="min-w-56 flex-1"
        />
        <Button type="submit" size="sm" disabled={pending || (nextStatus === status && note.trim() === "")}>
          Zapisz
        </Button>
        {canFollowUp && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => save({ followUp: true }, "Dopisano follow-up.")}
            title="Dopisuje 'followed up <data>' do notatek, tak jak /outcome followup"
          >
            Follow-up wysłany
          </Button>
        )}
      </form>
      <p className="text-muted-foreground text-xs">
        Notatka trafi do kolumny notes z dzisiejszą datą. Przecinki i cudzysłowy zamieniam, żeby nie rozjechać CSV. Treść
        maila i feedback zapisuj dalej przez <code>/outcome</code>, bo on prowadzi też <code>outcome.md</code>.
      </p>
      {message && (
        <p className={message.ok ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-red-700 dark:text-red-300"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
