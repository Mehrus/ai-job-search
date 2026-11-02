import { GraduationCap } from "lucide-react";

import { intervioBase } from "@/lib/intervio";

async function isUp(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(800), cache: "no-store", redirect: "manual" });
    return res.status < 500;
  } catch {
    return false;
  }
}

/** Header link to Intervio with a live/offline dot; offline explains how to start it. */
export async function IntervioStatus() {
  const base = intervioBase();
  const up = await isUp(base);
  return (
    <a
      href={up ? base : undefined}
      target="_blank"
      rel="noopener noreferrer"
      title={up ? `Otwórz Intervio (${base})` : "Intervio nie działa. Uruchom oba projekty: cd panel && pnpm dev:all"}
      aria-disabled={!up}
      className={
        up
          ? "hover:bg-accent ml-auto inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm"
          : "text-muted-foreground ml-auto inline-flex h-8 cursor-help items-center gap-2 rounded-md border border-dashed px-3 text-sm"
      }
    >
      <span className={up ? "size-2 rounded-full bg-emerald-500" : "bg-muted-foreground/50 size-2 rounded-full"} />
      <GraduationCap className="size-4" />
      {up ? "Intervio" : "Intervio offline"}
    </a>
  );
}
