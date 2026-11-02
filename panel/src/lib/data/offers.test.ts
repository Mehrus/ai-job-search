import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { compareOffers, parseSeenJobs, toBand } from "./offers";

const demo = JSON.parse(
  readFileSync(path.join(__dirname, "../../../fixtures/demo-seen_jobs.json"), "utf-8"),
);

describe("parseSeenJobs", () => {
  const offers = parseSeenJobs(demo);
  const byKey = Object.fromEntries(offers.map((o) => [o.key, o]));

  it("reads every entry", () => {
    expect(offers).toHaveLength(8);
  });

  it("keeps /rank fields", () => {
    const o = byKey["northwind-bank--senior-angular-developer"];
    expect(o.score).toBe(78);
    expect(o.band).toBe("strong");
    expect(o.strengths).toHaveLength(2);
    expect(o.locationVerdict).toBe("PASS");
  });

  it("reads a legacy verdict stored in `location` as the location verdict", () => {
    const o = byKey["litware--frontend-developer-legacy"];
    expect(o.locationVerdict).toBe("PASS");
    expect(o.location).toBeNull();
  });

  it("leaves unranked entries unscored and never infers dates", () => {
    const o = byKey["woodgrove--senior-frontend-engineer"];
    expect(o.score).toBeNull();
    expect(o.band).toBeNull();
    expect(o.deadline).toBeNull();
  });

  it("drops non-http URLs", () => {
    expect(byKey["proseware--php-developer"].url).toBeNull();
  });

  it("rejects a file without a seen map", () => {
    expect(() => parseSeenJobs({})).toThrow();
  });

  it("sorts ranked by score first", () => {
    const sorted = [...offers].sort(compareOffers);
    expect(sorted[0].score).toBe(78);
    expect(sorted.at(-1)?.score).toBeNull();
  });
});

describe("toBand", () => {
  it("prefers the stored verdict, falls back to score thresholds", () => {
    expect(toBand("Good Fit", 10)).toBe("good");
    expect(toBand(undefined, 75)).toBe("strong");
    expect(toBand(undefined, 44)).toBe("weak");
    expect(toBand(undefined, null)).toBeNull();
  });
});
