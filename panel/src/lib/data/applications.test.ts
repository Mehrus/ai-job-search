import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { archiveFolderName, columnFor, followUpsSent, lastActivity, parseOutcome } from "./applications";
import { parseTracker } from "./tracker";

describe("archiveFolderName", () => {
  // Same cases as tests/test_apply_records_application.py
  it.each([
    ["Novo Nordisk A/S", "Data Scientist", "novo_nordisk_as_data_scientist"],
    ["Acme", "Data Scientist / ML Engineer", "acme_data_scientist_ml_engineer"],
    ["Fabrikam", "Fullstack .NET + Angular", "fabrikam_fullstack_net_angular"],
    ["Łódź Soft", "Programista", "łódź_soft_programista"],
    ["/", "+", null],
  ])("%s / %s -> %s", (company, role, expected) => {
    expect(archiveFolderName(company, role)).toBe(expected);
  });
});

describe("tracker-derived fields", () => {
  const rows = parseTracker(
    readFileSync(path.join(import.meta.dirname, "../../../fixtures/demo-tracker.csv"), "utf-8"),
  );
  const by = (company: string) => rows.find((r) => r.company === company)!;

  it("puts final and unknown statuses in the closed column", () => {
    expect(columnFor("no_response")).toBe("closed");
    expect(columnFor("something_else")).toBe("closed");
    expect(columnFor("drafted")).toBe("drafted");
  });

  it("takes the newest date from row date and notes", () => {
    expect(lastActivity(by("Fabrikam"))).toBe("2026-11-05");
    expect(lastActivity(by("Contoso"))).toBe("2026-11-01");
  });

  it("counts follow-up markers", () => {
    expect(followUpsSent(by("Blue Yonder Airlines"))).toBe(1);
    expect(followUpsSent(by("Contoso"))).toBe(0);
  });
});

describe("parseOutcome", () => {
  const text = readFileSync(
    path.join(import.meta.dirname, "../../../fixtures/demo-applications/fabrikam_fullstack_net_angular/outcome.md"),
    "utf-8",
  );
  const outcome = parseOutcome(text);

  it("reads status, stages and notes; ignores the template placeholder date", () => {
    expect(outcome.status).toBe("in_progress");
    expect(outcome.dateResolved).toBeNull();
    expect(outcome.stages.filter((s) => s.done).map((s) => s.label)).toEqual(["Phone screen"]);
    expect(outcome.stages).toHaveLength(5);
    expect(outcome.notes).toContain("signals");
  });

  it("treats the unfilled status enum as missing", () => {
    expect(parseOutcome("**Status:** in_progress | hired | rejected").status).toBeNull();
  });
});
