// Data source: the JSON "candidate-api" that rocketjobs.pl's own frontend calls.
// No authentication required. Search returns a page of offer objects; detail
// returns one offer (with its HTML description) by slug.
//
// Personal use only: rocketjobs.pl's robots.txt disallows /api/, so keep volume
// low and do not use this commercially or for bulk data collection.

export const SITE = "https://rocketjobs.pl"
export const SITE_HOST = /(^|\.)rocketjobs\.pl$/i
export const SEARCH_URL = `${SITE}/api/candidate-api/offers`
export const DETAIL_URL = `${SITE}/api/candidate-api/offers`
/** Public offer page prefix; the API's own `url` field uses this form. */
export const OFFER_PATH = "/oferta-pracy/"
/** Results per page requested from the API (`itemsCount`). */
export const PAGE_SIZE = 20

const UA = "Mozilla/5.0 (compatible; rocketjobs-cli/1.0)"

/** Experience levels the API filters on. An unknown value silently returns 0 results, so the CLI validates. */
export const SENIORITY_LEVELS = ["junior", "mid", "senior", "manager", "c_level"] as const

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

/** GET JSON with exponential backoff (plus jitter) on 429/5xx. Returns null on a 404. */
export async function jsonFetch(url: string): Promise<unknown | null> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }
  throw new Error("Request failed after max retries")
}

// ---------------------------------------------------------------------------
// Output hygiene (copied from linkedin-search): listing text is third-party
// data, so characters and markup a reader never sees must not reach the model.
// ---------------------------------------------------------------------------

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
}

/**
 * C0/C1 controls (other than tab/newline/CR), soft hyphen, bidi controls,
 * zero-width characters, invisible operators, BOM, variation selectors and
 * Unicode tag characters.
 */
const INVISIBLE_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F­؜᠎​-‏‪-‮⁠-⁯︀-️﻿\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/gu

/** Strip INVISIBLE_CHARS from every string in a result, recursively: the CLI's output boundary. */
export function stripInvisible<T>(value: T): T {
  if (typeof value === "string") return value.replace(INVISIBLE_CHARS, "") as T
  if (Array.isArray(value)) return value.map(stripInvisible) as T
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripInvisible(v)])) as T
  }
  return value
}

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"])

function isHiddenTag(attrs: string): boolean {
  for (const m of attrs.matchAll(/([^\s"'=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    const name = m[1].toLowerCase()
    const value = m[2] ?? m[3] ?? m[4] ?? ""
    if (name === "hidden") return true
    if (name === "style" && /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden|mso-hide\s*:\s*all)\b/i.test(value)) {
      return true
    }
  }
  return false
}

/**
 * Drop markup a browser never renders - comments, <script>/<style>/<template>
 * blocks, and elements marked hidden - before tags are stripped.
 */
export function visibleHtml(html: string): string {
  const src = html
    .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, "")
  const open = /<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?>/g
  const kept: string[] = []
  let from = 0
  let m: RegExpExecArray | null
  while ((m = open.exec(src)) !== null) {
    if (!m[2] || !isHiddenTag(m[2])) continue
    const tag = m[1].toLowerCase()
    let end = open.lastIndex
    if (!VOID_TAGS.has(tag) && !m[0].endsWith("/>")) {
      const same = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi")
      same.lastIndex = end
      end = src.length
      let depth = 1
      let s: RegExpExecArray | null
      while ((s = same.exec(src)) !== null) {
        if (s[1]) depth--
        else if (!s[0].endsWith("/>")) depth++
        if (depth === 0) {
          end = same.lastIndex
          break
        }
      }
    }
    kept.push(src.slice(from, m.index))
    from = end
    open.lastIndex = end
  }
  kept.push(src.slice(from))
  return kept.join("")
}

function cleanLine(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
}

/** Render an HTML description as readable text, keeping paragraph and list breaks. */
export function htmlToText(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = visibleHtml(html)
    .replace(/\s+/g, " ")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const text = withBreaks
    .split("\n")
    .map((l) => (l.trim().startsWith("- ") ? "- " + cleanLine(l.trim().slice(2)) : cleanLine(l)))
    .filter((l) => l !== "-")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
  // List items often wrap a <p>, which leaves a blank line between bullets.
  let tight = text
  for (let prev = ""; prev !== tight; ) {
    prev = tight
    tight = tight.replace(/(^- [^\n]*)\n\n(?=- )/m, "$1\n")
  }
  return tight.trim() || null
}

// ---------------------------------------------------------------------------
// Mapping API objects to the portal-skill contract.
// ---------------------------------------------------------------------------

export interface Salary {
  contractType: string | null
  min: number | null
  max: number | null
  currency: string | null
  period: string | null
  gross: boolean | null
}

export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  locations: string[]
  date: string | null
  url: string
  seniority: string | null
  workplaceType: string | null
  workingTime: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryPeriod: string | null
  contractType: string | null
  salaries: Salary[]
  skills: string[]
  expiresAt: string | null
}

export interface JobDetail extends JobResult {
  description: string | null
  niceToHaveSkills: string[]
  languages: string[]
  companyUrl: string | null
  companySize: string | null
  applyUrl: string | null
  isActive: boolean | null
}

type Raw = Record<string, unknown>

function str(v: unknown): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t : null
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : null
}

function arr(v: unknown): Raw[] {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Raw[]) : []
}

/**
 * The API lists every contract type in several currencies, most of them
 * conversions. Keep only the employer's original figures (`currencySource:
 * "original"`), per pay unit as published (an hourly B2B rate stays hourly).
 */
export function mapSalaries(employmentTypes: unknown): Salary[] {
  const all = arr(employmentTypes)
  const original = all.filter((e) => e.currencySource === "original")
  const source = original.length ? original : all.filter((e) => e.currency === "PLN")
  return source
    .map((e) => ({
      contractType: str(e.type),
      min: num(e.fromPerUnit ?? e.from),
      max: num(e.toPerUnit ?? e.to),
      currency: str(e.currency),
      period: str(e.unit)?.toLowerCase() ?? null,
      gross: typeof e.gross === "boolean" ? e.gross : null,
    }))
}

export function offerUrl(slug: string): string {
  return `${SITE}${OFFER_PATH}${slug}`
}

export function mapOffer(raw: Raw): JobResult | null {
  const slug = str(raw.slug)
  const title = str(raw.title)
  if (!slug || !title) return null
  const salaries = mapSalaries(raw.employmentTypes)
  const primary = salaries.find((s) => s.min !== null || s.max !== null) ?? null
  const cities = arr(raw.locations).map((l) => str(l.city)).filter((c): c is string => c !== null)
  const city = str(raw.city)
  return {
    id: slug,
    title,
    company: str(raw.companyName),
    location: city,
    locations: cities.length ? [...new Set(cities)] : city ? [city] : [],
    date: str(raw.publishedAt),
    url: str(raw.url) ?? offerUrl(slug),
    seniority: str(raw.experienceLevel),
    workplaceType: str(raw.workplaceType),
    workingTime: str(raw.workingTime),
    salaryMin: primary?.min ?? null,
    salaryMax: primary?.max ?? null,
    salaryCurrency: primary?.currency ?? null,
    salaryPeriod: primary?.period ?? null,
    contractType: primary?.contractType ?? salaries[0]?.contractType ?? null,
    salaries,
    skills: arr(raw.requiredSkills).map((s) => str(s.name)).filter((s): s is string => s !== null),
    expiresAt: str(raw.expiredAt),
  }
}

export function mapDetail(raw: Raw): JobDetail | null {
  const base = mapOffer(raw)
  if (!base) return null
  return {
    ...base,
    description: htmlToText(typeof raw.body === "string" ? raw.body : null),
    niceToHaveSkills: arr(raw.niceToHaveSkills).map((s) => str(s.name)).filter((s): s is string => s !== null),
    languages: arr(raw.languages)
      .map((l) => [str(l.code), str(l.level)].filter(Boolean).join(" "))
      .filter((l) => l !== ""),
    companyUrl: str(raw.companyUrl),
    companySize: str(raw.companySize),
    applyUrl: str(raw.applyUrl),
    isActive: typeof raw.isActive === "boolean" ? raw.isActive : null,
  }
}

/** Parse the search response body: `{ data: [...], meta: {...} }`. Malformed items are skipped. */
export function parseSearchResponse(body: unknown): { results: JobResult[]; total: number | null } {
  if (!body || typeof body !== "object") return { results: [], total: null }
  const b = body as Raw
  const results = arr(b.data)
    .map((o) => {
      try {
        return mapOffer(o)
      } catch {
        return null
      }
    })
    .filter((r): r is JobResult => r !== null)
  const meta = b.meta && typeof b.meta === "object" ? (b.meta as Raw) : {}
  return { results, total: typeof meta.totalItems === "number" ? meta.totalItems : null }
}

export interface SearchParams {
  query?: string
  location?: string
  seniority: string[]
  page: number
}

/** Build the search URL. A location of "remote" maps to the remote-work filter instead of a city. */
export function buildSearchUrl(p: SearchParams): string {
  const params = new URLSearchParams()
  for (const level of p.seniority) params.append("experienceLevels", level)
  if (p.location) {
    if (/^(remote|zdalnie|zdalna)$/i.test(p.location.trim())) params.set("remoteWorkOptions", "remote")
    else params.set("city", p.location.trim())
  }
  if (p.query) params.set("keywords", p.query)
  params.set("keywordType", "any")
  // With keywords, "any" mode also matches mentions deep in the description,
  // so newest-first buries the real matches; relevance puts them on top.
  params.set("sortBy", p.query ? "match" : "publishedAt")
  params.set("orderBy", "descending")
  params.set("from", String((p.page - 1) * PAGE_SIZE))
  params.set("itemsCount", String(PAGE_SIZE))
  return `${SEARCH_URL}?${params.toString()}`
}

/** Keep results published within the last `days` days (the API has no age parameter). */
export function filterByAge<T extends { date: string | null }>(results: T[], days: number | undefined, now = Date.now()): T[] {
  if (!days) return results
  const cutoff = now - days * 86_400_000
  return results.filter((r) => {
    const t = r.date ? Date.parse(r.date) : NaN
    return Number.isFinite(t) && t >= cutoff
  })
}

/**
 * Accept an offer slug or a public offer URL on this portal's host. URLs on any
 * other host are rejected (parsed with URL, so look-alike hosts fail too).
 */
export function normalizeId(input: string): string | null {
  const trimmed = input.trim()
  const hasScheme = /^https?:\/\//i.test(trimmed)
  if (hasScheme || /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) {
    let parsed: URL
    try {
      parsed = new URL(hasScheme ? trimmed : `https://${trimmed}`)
    } catch {
      return null
    }
    if (!SITE_HOST.test(parsed.hostname)) return null
    const m = parsed.pathname.match(/^\/(?:job-offer|oferta-pracy|offers)\/([a-z0-9-]+)\/?$/i)
    return m ? m[1].toLowerCase() : null
  }
  return /^[a-z0-9][a-z0-9-]{2,}$/i.test(trimmed) ? trimmed.toLowerCase() : null
}

export function formatSalary(r: Pick<JobResult, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod" | "contractType">): string {
  if (r.salaryMin === null && r.salaryMax === null) return "—"
  const fmt = (n: number | null) => (n === null ? "?" : Math.round(n).toLocaleString("en-US"))
  const range = r.salaryMin === r.salaryMax ? fmt(r.salaryMin) : `${fmt(r.salaryMin)}-${fmt(r.salaryMax)}`
  const period = r.salaryPeriod ? `/${r.salaryPeriod}` : ""
  const contract = r.contractType ? ` ${r.contractType}` : ""
  return `${range} ${r.salaryCurrency ?? ""}${period}${contract}`.replace(/\s+/g, " ").trim()
}
