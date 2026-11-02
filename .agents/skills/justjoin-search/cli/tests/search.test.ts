import { afterEach, describe, expect, test } from "bun:test"
import { runSearch } from "../src/commands/search"
import { OFFER } from "./fixtures"

const originalFetch = globalThis.fetch
const originalStdoutWrite = process.stdout.write

afterEach(() => {
  globalThis.fetch = originalFetch
  process.stdout.write = originalStdoutWrite
})

function captureStdout(): () => string {
  let out = ""
  process.stdout.write = ((chunk: string | Uint8Array) => {
    out += chunk.toString()
    return true
  }) as typeof process.stdout.write
  return () => out
}

describe("runSearch (mocked fetch)", () => {
  test("emits the contract JSON shape, honours --limit and strips invisible characters", async () => {
    const urls: string[] = []
    const second = { ...OFFER, slug: "acme-two", title: "Frontend​ Developer" }
    globalThis.fetch = (async (url: string) => {
      urls.push(String(url))
      return new Response(JSON.stringify({ data: [second, OFFER], meta: { totalItems: 2 } }), { status: 200 })
    }) as unknown as typeof fetch
    const out = captureStdout()

    const code = await runSearch({ query: "react", seniority: ["senior"], page: 1, limit: 1, format: "json" })

    expect(code).toBe(0)
    const body = JSON.parse(out())
    expect(body.meta).toEqual({ count: 1, page: 1 })
    expect(body.results[0].title).toBe("Frontend Developer")
    expect(new URL(urls[0]).searchParams.getAll("experienceLevels")).toEqual(["senior"])
  })

  test("--limit 0 emits zero results", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ data: [OFFER] }))) as unknown as typeof fetch
    const out = captureStdout()
    expect(await runSearch({ seniority: [], page: 1, limit: 0, format: "json" })).toBe(0)
    expect(JSON.parse(out()).results).toHaveLength(0)
  })
})
