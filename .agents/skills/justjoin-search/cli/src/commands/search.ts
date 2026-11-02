import {
  buildSearchUrl,
  filterByAge,
  formatSalary,
  jsonFetch,
  parseSearchResponse,
  stripInvisible,
  writeError,
  type JobResult,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  seniority: string[]
  jobage?: number
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

function cell(text: string | null, width: number): string {
  return (text || "—").slice(0, width).padEnd(width)
}

function renderTable(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  const header =
    "TITLE".padEnd(40) + " " + "COMPANY".padEnd(22) + " " + "LOCATION".padEnd(14) + " " +
    "SENIORITY".padEnd(9) + " " + "SALARY".padEnd(30) + " " + "DATE".padEnd(10) + " ID"
  const lines = rows.map(
    (r) =>
      `${cell(r.title, 40)} ${cell(r.company, 22)} ${cell(r.location, 14)} ${cell(r.seniority, 9)} ` +
      `${cell(formatSalary(r), 30)} ${cell(r.date ? r.date.slice(0, 10) : null, 10)} ${r.id}`,
  )
  return [header, "-".repeat(header.length), ...lines].join("\n")
}

function renderPlain(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  return rows
    .map((r) =>
      [
        r.title,
        `  ${r.company || "—"} · ${r.locations.join(", ") || r.location || "—"} · ${r.workplaceType || "—"} · ${r.date || "—"}`,
        `  seniority: ${r.seniority || "—"} · salary: ${formatSalary(r)}`,
        r.skills.length ? `  skills: ${r.skills.join(", ")}` : "",
        `  id: ${r.id}`,
        `  ${r.url}`,
      ]
        .filter((l) => l !== "")
        .join("\n"),
    )
    .join("\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const body = await jsonFetch(
      buildSearchUrl({ query: opts.query, location: opts.location, seniority: opts.seniority, page: opts.page }),
    )
    let results = stripInvisible(parseSearchResponse(body).results)
    results = filterByAge(results, opts.jobage)
    if (opts.limit !== undefined) results = results.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(results) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(renderPlain(results) + "\n")
    } else {
      process.stdout.write(
        JSON.stringify({ meta: { count: results.length, page: opts.page }, results }, null, 2) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
