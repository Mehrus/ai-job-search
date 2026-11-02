import { describe, expect, test } from "bun:test"
import { runCLI } from "./helpers"

// Every case here fails validation before any request is made.
function expectError(result: { exitCode: number; stdout: string; stderr: string }, code: string) {
  expect(result.exitCode).toBe(1)
  expect(result.stdout).toBe("")
  const err = JSON.parse(result.stderr)
  expect(err.code).toBe(code)
  expect(typeof err.error).toBe("string")
}

describe("CLI error contract", () => {
  test("a bogus flag exits 1 with a JSON error", async () => {
    expectError(await runCLI(["search", "-q", "react", "--bogus", "x"]), "UNKNOWN_FLAG")
  })

  test("an unknown seniority level is rejected before any request", async () => {
    expectError(await runCLI(["search", "-q", "react", "--seniority", "mid,guru"]), "BAD_ARG")
  })

  test("an empty query is rejected", async () => {
    expectError(await runCLI(["search", "-q", ""]), "BAD_ARG")
  })

  test("bad numbers and formats are rejected", async () => {
    expectError(await runCLI(["search", "-q", "react", "--page", "0"]), "BAD_ARG")
    expectError(await runCLI(["search", "-q", "react", "--jobage", "1.5"]), "BAD_ARG")
    expectError(await runCLI(["search", "-q", "react", "--format", "xml"]), "BAD_ARG")
  })

  test("detail without an id fails", async () => {
    expectError(await runCLI(["detail"]), "NO_ID")
  })

  test("detail with a URL on another host fails before fetching", async () => {
    expectError(await runCLI(["detail", "https://evil.example/pl/job/x"]), "BAD_ID")
  })

  test("an unknown command fails", async () => {
    expectError(await runCLI(["frobnicate"]), "BAD_CMD")
  })
})
