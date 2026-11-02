import { describe, expect, test } from "bun:test"
import { parseJSON, runCLI } from "./helpers"

// Live smoke test against the real portal. Skipped unless LIVE=1, so CI never
// sends requests (personal-use only; keep volume low):
//   LIVE=1 bun test tests/live.test.ts
const live = !process.env.LIVE

interface Out {
  meta: { count: number; page: number }
  results: { id: string; title: string; url: string; company: string | null }[]
}

describe("live", () => {
  test.skipIf(live)("search 'react' returns real results, and detail resolves one", async () => {
    const data = parseJSON<Out>(await runCLI(["search", "-q", "react", "--seniority", "mid,senior", "--limit", "5"]))
    expect(data.results.length).toBeGreaterThanOrEqual(1)
    for (const r of data.results) {
      expect(r.id).toBeTruthy()
      expect(r.title).toBeTruthy()
      expect(r.url).toStartWith("https://rocketjobs.pl/")
    }
    const detail = parseJSON<{ description: string | null }>(await runCLI(["detail", data.results[0].id]))
    expect(detail.description?.length ?? 0).toBeGreaterThan(50)
  })
})
