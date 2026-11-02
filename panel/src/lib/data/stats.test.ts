import { describe, expect, it } from "vitest";

import { applicationStats } from "./stats";
import { parseTracker } from "./tracker";

const HEADER =
  "date,company,sector,role,role_type,channel,status,contact_person,fit_rating,notes,cv_file,cover_letter_file,source,deadline";
const rows = parseTracker(
  [
    HEADER,
    "2026-11-01,A,fintech,R,,portal,drafted,,,,,,,",
    "2026-10-01,B,fintech,R,,portal,applied,,,,,,,",
    "2026-10-02,C,sw,R,,referral,interview,,,,,,,",
    "2026-09-03,D,sw,R,,portal,rejected,,,,,,,",
    "2026-09-04,E,sw,R,,portal,offer_declined,,,,,,,",
    "2025,F,sw,R,,portal,no response,,,,,,,",
    "2026-08-01,G,sw,R,,portal,ghosted,,,,,,,",
  ].join("\n"),
);

describe("applicationStats", () => {
  const withOutcome = rows.map((r) =>
    r.company === "D"
      ? { ...r, outcome: { status: "rejected", dateResolved: null, notes: null, stages: [{ label: "Phone screen", done: true, date: null, scheduled: null }] } }
      : r,
  );
  const s = applicationStats(withOutcome);

  it("leaves drafted rows out of every statistic", () => {
    expect(s.drafted).toBe(1);
    expect(s.submitted).toBe(6);
    expect(s.funnel[0].value).toBe(6);
  });

  it("counts a stage reached from outcome.md even when the row is rejected", () => {
    // C (interview), D (rejected after phone screen), E (offer declined)
    expect(s.funnel[1].value).toBe(3);
    expect(s.funnel[2].value).toBe(1);
  });

  it("rejection rate: rejected + no_response over final outcomes", () => {
    // finals: D rejected, E offer_declined, F no_response -> 2/3 (unknown G is not final)
    expect(s.rejectionRate).toBeCloseTo(2 / 3);
  });

  it("buckets unknown statuses as closed and names them", () => {
    expect(s.unknownStatuses).toEqual(["ghosted"]);
    expect(s.buckets.find((b) => b.label.startsWith("Odrzucone"))?.value).toBe(4);
  });

  it("groups by month, keeping year-only dates", () => {
    expect(s.byMonth.map((b) => b.label)).toEqual(["2025", "2026-08", "2026-09", "2026-10"]);
  });
});
