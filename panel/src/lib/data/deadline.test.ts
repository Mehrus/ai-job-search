import { describe, expect, it } from "vitest";

import { deadlineState } from "./deadline";

describe("deadlineState", () => {
  const today = "2026-11-02";
  it("uses the 7-day window", () => {
    expect(deadlineState("2026-11-02", today)).toBe("soon");
    expect(deadlineState("2026-11-09", today)).toBe("soon");
    expect(deadlineState("2026-11-10", today)).toBe("open");
    expect(deadlineState("2026-11-01", today)).toBe("passed");
  });
  it("ignores missing or malformed dates", () => {
    expect(deadlineState(null, today)).toBeNull();
    expect(deadlineState("next friday", today)).toBeNull();
    expect(deadlineState("2026-02-30", today)).toBeNull();
  });
});
