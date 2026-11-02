"use client";

import { Check, Terminal } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Copies `/apply <url>` so the full workflow runs in Claude Code, where it belongs. */
export function CopyApplyButton({ url, compact = false }: { url: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`/apply ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Skopiuj komendę:", `/apply ${url}`);
    }
  }

  return (
    <Button
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      onClick={copy}
      title="Kopiuj /apply dla Claude Code"
      aria-label="Kopiuj komendę /apply"
    >
      {copied ? <Check /> : <Terminal />}
      {!compact && (copied ? "Skopiowano" : "Kopiuj /apply")}
    </Button>
  );
}
