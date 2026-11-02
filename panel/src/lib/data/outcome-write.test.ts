import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseOutcome } from "./applications";
import { applyOutcomeEdit, archiveStatusFor, cleanStageLabel, newOutcome } from "./outcome-write";

const ctx = { company: "Fabrikam", role: "Fullstack .NET + Angular", today: "2026-11-02" };
const fixture = readFileSync(
  path.join(import.meta.dirname, "../../../fixtures/demo-applications/fabrikam_fullstack_net_angular/outcome.md"),
  "utf-8",
);

describe("parseOutcome stage dates", () => {
  it("splits done dates and schedules off the label", () => {
    const stages = parseOutcome(fixture).stages;
    expect(stages[0]).toEqual({ label: "Phone screen", done: true, date: "2026-10-24", scheduled: null });
    expect(stages[1]).toEqual({ label: "Technical interview", done: false, date: null, scheduled: "2026-11-05 10:00" });
  });
});

describe("applyOutcomeEdit", () => {
  it("creates the /outcome template when there is no file", () => {
    const text = applyOutcomeEdit(null, { kind: "schedule", stage: "Phone screen", when: "2026-11-04" }, ctx);
    expect(text.startsWith("# Outcome: Fabrikam — Fullstack .NET + Angular\n")).toBe(true);
    expect(text).toContain("**Status:** in_progress");
    expect(text).not.toContain("Date resolved");
    expect(text).toContain("- [ ] Phone screen (scheduled 2026-11-04)\n- [ ] Technical interview");
    const parsed = parseOutcome(text);
    expect(parsed.stages).toHaveLength(5);
    expect(parsed.status).toBe("in_progress");
  });

  it("ticks a scheduled stage with its date, replacing the schedule", () => {
    const text = applyOutcomeEdit(fixture, { kind: "complete", stage: "technical interview", date: "2026-11-05" }, ctx);
    expect(text).toContain("- [x] Technical interview (2026-11-05)");
    expect(text).not.toContain("scheduled");
  });

  it("keeps the recorded date when a done stage is ticked again without one", () => {
    const once = applyOutcomeEdit(fixture, { kind: "complete", stage: "Phone screen", date: "2026-10-24" }, ctx);
    expect(once).toContain("- [x] Phone screen (2026-10-24)");
  });

  it("inserts a custom stage before Offer received", () => {
    const text = applyOutcomeEdit(fixture, { kind: "schedule", stage: "Rozmowa z CTO", when: "2026-11-20 09:30" }, ctx);
    expect(text).toContain("- [ ] Final round\n- [ ] Rozmowa z CTO (scheduled 2026-11-20 09:30)\n- [ ] Offer received");
  });

  it("resolves: Status, Date resolved replaces the placeholder, dated note appended", () => {
    const text = applyOutcomeEdit(
      fixture,
      { kind: "resolve", status: "rejected", date: "2026-11-02", note: "no feedback\nyet" },
      ctx,
    );
    const parsed = parseOutcome(text);
    expect(parsed.status).toBe("rejected");
    expect(parsed.dateResolved).toBe("2026-11-02");
    expect(text.trimEnd().endsWith("- 2026-11-02: no feedback yet")).toBe(true);
    // History is kept.
    expect(text).toContain("Phone screen with the recruiter went well.");
  });

  it("adds Date resolved under Status when the line is missing", () => {
    const text = applyOutcomeEdit(newOutcome("A", "B"), { kind: "resolve", status: "hired", date: "2026-12-01" }, ctx);
    expect(text).toContain("**Status:** hired\n\n**Date resolved:** 2026-12-01\n");
  });

  it("ticks Offer received", () => {
    const text = applyOutcomeEdit(fixture, { kind: "offer", date: "2026-11-30" }, ctx);
    expect(text).toContain("- [x] Offer received (2026-11-30)");
  });

  it("keeps CRLF files CRLF", () => {
    const crlf = fixture.replace(/\n/g, "\r\n");
    const text = applyOutcomeEdit(crlf, { kind: "note", note: "hello" }, ctx);
    expect(text.replace(/\r\n/g, "")).not.toContain("\n");
  });
});

describe("helpers", () => {
  it("cleans stage labels so the checkbox parser cannot be confused", () => {
    expect(cleanStageLabel(" Final (2) [x]\nround ")).toBe("Final 2 x round");
  });

  it("maps only the final statuses both enums share", () => {
    expect(archiveStatusFor("rejected")).toBe("rejected");
    expect(archiveStatusFor("withdrawn")).toBeNull();
    expect(archiveStatusFor("interview")).toBeNull();
  });
});
