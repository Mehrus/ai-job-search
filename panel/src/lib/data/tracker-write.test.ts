import { describe, expect, it } from "vitest";

import { parseTracker } from "./tracker";
import { applyRowEdit, rowRefs, sanitizeNote, TrackerConflictError } from "./tracker-write";

const HEADER =
  "date,company,sector,role,role_type,channel,status,contact_person,fit_rating,notes,cv_file,cover_letter_file,source,deadline";
const CSV = [
  HEADER,
  "2026-10-30,Acme,it,Dev,fe,portal,drafted,,70,,cv/a.tex,cover_letters/a.tex,https://x.test/a,2026-11-10",
  '2026-09-01,Old Corp,sw,Angular Dev,fe,referral,applied,,55,"quoted, note",,,,',
  "2025,Legacy,sw,Dev,fe,portal,applied,,60,,,,",
  "",
].join("\r\n");

const refs = rowRefs(CSV);
const today = "2026-11-02";

describe("applyRowEdit", () => {
  it("moves a drafted row to applied, sets the submission date, touches nothing else", () => {
    const out = applyRowEdit(CSV, { row: refs[0], today, status: "applied", note: "sent via portal, all good" });
    const lines = out.split("\r\n");
    expect(lines[1]).toBe(
      "2026-11-02,Acme,it,Dev,fe,portal,applied,,70,2026-11-02 applied - sent via portal - all good,cv/a.tex,cover_letters/a.tex,https://x.test/a,2026-11-10",
    );
    expect(lines.filter((_, i) => i !== 1)).toEqual(CSV.split("\r\n").filter((_, i) => i !== 1));
  });

  it("keeps a hand-quoted notes field quoted and parseable", () => {
    const out = applyRowEdit(CSV, { row: refs[1], today, followUp: true });
    expect(out.split("\r\n")[2]).toBe('2026-09-01,Old Corp,sw,Angular Dev,fe,referral,applied,,55,"quoted, note; followed up 2026-11-02",,,,');
    const row = parseTracker(out)[1];
    expect(row.notes).toBe("quoted, note; followed up 2026-11-02");
    expect(row.status).toBe("applied");
  });

  it("does not add a deadline column to a legacy 13-field row beyond what it needs", () => {
    const out = applyRowEdit(CSV, { row: refs[2], today, status: "rejected" });
    expect(out.split("\r\n")[3]).toBe("2025,Legacy,sw,Dev,fe,portal,rejected,,60,2026-11-02 rejected,,,");
  });

  it("refuses to write when the row changed since it was read", () => {
    const changed = CSV.replace("Acme,it", "Acme,fintech");
    expect(() => applyRowEdit(changed, { row: refs[0], today, status: "applied" })).toThrow(TrackerConflictError);
  });

  it("is a no-op when nothing changes", () => {
    expect(applyRowEdit(CSV, { row: refs[1], today, status: "applied" })).toBe(CSV);
  });

  it("rejects unknown statuses", () => {
    // @ts-expect-error testing runtime guard
    expect(() => applyRowEdit(CSV, { row: refs[0], today, status: "ghosted" })).toThrow();
  });
});

describe("sanitizeNote", () => {
  it("removes commas, quotes and line breaks", () => {
    expect(sanitizeNote('rejected, no "feedback"\ngiven')).toBe("rejected - no feedback given");
  });
});
