import { DETAIL_URL, formatSalary, jsonFetch, mapDetail, normalizeId, stripInvisible, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse an offer slug from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const body = await jsonFetch(`${DETAIL_URL}/${encodeURIComponent(id)}`)
    const job = body && typeof body === "object" ? mapDetail(body as Record<string, unknown>) : null
    if (!job) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const clean = stripInvisible(job)

    if (opts.format === "plain") {
      const lines: (string | null)[] = [
        clean.title,
        `${clean.company || "—"} · ${clean.locations.join(", ") || clean.location || "—"} · ${clean.workplaceType || "—"}`,
        "",
        clean.seniority ? `Seniority: ${clean.seniority}` : null,
        clean.workingTime ? `Working time: ${clean.workingTime}` : null,
        ...(clean.salaries.some((s) => s.min !== null || s.max !== null)
          ? clean.salaries
              .filter((s) => s.min !== null || s.max !== null)
              .map((s) => `Salary: ${formatSalary({ salaryMin: s.min, salaryMax: s.max, salaryCurrency: s.currency, salaryPeriod: s.period, contractType: s.contractType })}${s.gross === null ? "" : s.gross ? " (gross)" : " (net)"}`)
          : [`Salary: not disclosed${clean.contractType ? ` (${clean.salaries.map((s) => s.contractType).filter(Boolean).join(", ")})` : ""}`]),
        clean.skills.length ? `Skills: ${clean.skills.join(", ")}` : null,
        clean.niceToHaveSkills.length ? `Nice to have: ${clean.niceToHaveSkills.join(", ")}` : null,
        clean.languages.length ? `Languages: ${clean.languages.join(", ")}` : null,
        clean.date ? `Published: ${clean.date}` : null,
        clean.expiresAt ? `Expires: ${clean.expiresAt}` : null,
        `Status: ${clean.isActive === false ? "CLOSED / EXPIRED" : "ACTIVE"}`,
        "",
        clean.description || "(no description)",
        "",
        clean.applyUrl ? `Apply: ${clean.applyUrl}` : null,
        `URL: ${clean.url}`,
      ]
      process.stdout.write(lines.filter((l) => l !== null).join("\n").trim() + "\n")
    } else {
      process.stdout.write(JSON.stringify(clean, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
