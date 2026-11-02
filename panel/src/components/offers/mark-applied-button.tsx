"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { markApplied } from "@/app/actions";
import { Button } from "@/components/ui/button";

/** Records an application sent outside /apply: a tracker row with status `applied` and today's date. */
export function MarkAppliedButton({ offerKey, drafted = false }: { offerKey: string; drafted?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await markApplied({ offerKey });
            if (!result.ok) return setError(result.error);
            if (result.slug) router.push(`/applications/${encodeURIComponent(result.slug)}`);
            else router.refresh();
          });
        }}
        title={drafted ? "Zmienia status szkicu na applied z dzisiejszą datą" : "Dodaje wiersz do trackera: applied, dzisiejsza data"}
      >
        <Send /> {drafted ? "Wysłałem" : "Aplikowałem"}
      </Button>
      {error && <p className="text-xs text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}
