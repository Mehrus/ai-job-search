import { describe, expect, it } from "vitest";

import { indexTracker, parseCsv, parseTracker, trackerKey } from "./tracker";
import { norm } from "./normalize";

const HEADER =
  "date,company,sector,role,role_type,channel,status,contact_person,fit_rating,notes,cv_file,cover_letter_file,source,deadline";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes and CRLF", () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n1,2,3\r\n')).toEqual([
      ["a", "b, c", 'd "e"'],
      ["1", "2", "3"],
    ]);
  });
});

describe("parseTracker", () => {
  it("reads legacy 13-column rows with an empty deadline", () => {
    const legacyHeader = HEADER.replace(/,deadline$/, "");
    const [row] = parseTracker(`${legacyHeader}\n2026-01-01,Acme,it,Dev,fe,portal,applied,,70,,,,`);
    expect(row.deadline).toBeNull();
    expect(row.status).toBe("applied");
    expect(row.fitRating).toBe(70);
  });

  it("maps legacy space spellings to canonical statuses", () => {
    const rows = parseTracker(
      `${HEADER}\n2026-01-01,A,,R,,,no response,,,,,,,\n2026-01-01,B,,R,,,Offer Declined,,,,,,,`,
    );
    expect(rows.map((r) => r.status)).toEqual(["no_response", "offer_declined"]);
  });

  it("keeps a blank fit rating blank instead of 0", () => {
    const [row] = parseTracker(`${HEADER}\n2026-01-01,A,,R,,,drafted,,,,,,,`);
    expect(row.fitRating).toBeNull();
  });
});

describe("matching", () => {
  it("matches company+role like rank_state.norm", () => {
    expect(norm("Jit-Team S.A.")).toBe("jitteamsa");
    const index = indexTracker(parseTracker(`${HEADER}\n2026-01-01,Jit Team,,Senior Angular Developer,,,applied,,,,,,,`));
    expect(index.get(trackerKey("JIT TEAM", "Senior Angular-Developer"))?.status).toBe("applied");
  });
});
