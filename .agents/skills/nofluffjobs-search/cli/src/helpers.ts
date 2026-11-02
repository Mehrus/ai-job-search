// Data source: the JSON API that nofluffjobs.com's own frontend calls.
// No authentication required. Search is a POST with a "rawSearch" criteria
// string; detail is a GET of one posting by its URL slug or reference.
//
// Personal use only: nofluffjobs.com's robots.txt disallows /api/, so keep
// volume low and do not use this commercially or for bulk data collection.

export const SITE = "https://nofluffjobs.com"
export const SITE_HOST = /(^|\.)nofluffjobs\.com$/i
export const SEARCH_URL = `${SITE}/api/search/posting`
export const DETAIL_URL = `${SITE}/api/posting`
/** Public offer page prefix (Polish site). */
export const OFFER_PATH = "/pl/job/"
/** Offers per page requested from the API (`pageSize`). */
export const PAGE_SIZE = 20

const UA = "Mozilla/5.0 (compatible; nofluffjobs-cli/1.0)"

/** Seniority levels the site filters on. An unknown value is rejected by the CLI rather than sent. */
export const SENIORITY_LEVELS = ["trainee", "junior", "mid", "senior", "expert"] as const

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

/**
 * Fetch JSON with exponential backoff (plus jitter) on 429/5xx. Returns null
 * on a 404. Pass `body` to send a JSON POST.
 */
export async function jsonFetch(url: string, body?: unknown): Promise<unknown | null> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const headers: Record<string, string> = {
      "User-Agent": UA,
      Accept: "application/json",
      "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
    }
    if (body !== undefined) headers["Content-Type"] = "application/json"
    const response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
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
}

export interface JobResult {
  id: string
  reference: string | null
  title: string
  company: string | null
  location: string | null
  locations: string[]
  date: string | null
  postedAt: string | null
  url: string
  seniority: string | null
  category: string | null
  workplaceType: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryPeriod: string | null
  contractType: string | null
  skills: string[]
}

export interface JobDetail extends JobResult {
  salaries: Salary[]
  description: string | null
  requirements: string | null
  dailyTasks: string[]
  niceToHaveSkills: string[]
  benefits: string[]
  languages: string[]
  companySize: string | null
  companyUrl: string | null
  applyUrl: string | null
  expiresAt: string | null
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

function obj(v: unknown): Raw {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {}
}

function arr(v: unknown): Raw[] {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Raw[]) : []
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.map(str).filter((s): s is string => s !== null) : []
}

/** Epoch milliseconds to ISO 8601, or null. */
export function isoDate(v: unknown): string | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function offerUrl(slug: string): string {
  return `${SITE}${OFFER_PATH}${slug}`
}

/** Cities from `location.places`, skipping province-only rows; "Remote" stays as published. */
function cities(location: Raw): string[] {
  const out = arr(location.places)
    .filter((p) => p.provinceOnly !== true)
    .map((p) => str(p.city))
    .filter((c): c is string => c !== null)
  return [...new Set(out)]
}

function seniorityOf(v: unknown): string | null {
  const levels = strings(v).map((s) => s.toLowerCase())
  return levels.length ? levels.join(",") : null
}

/** Map one row of the search response. Rows without an URL slug or title are skipped. */
export function mapPosting(raw: Raw): JobResult | null {
  const slug = str(raw.url)?.toLowerCase() ?? null
  const title = str(raw.title)
  if (!slug || !title) return null
  const location = obj(raw.location)
  const locs = cities(location)
  const salary = obj(raw.salary)
  const visible = salary.containsSalary === undefined || salary.containsSalary === "VISIBLE"
  const posted = isoDate(raw.posted)
  return {
    id: slug,
    reference: str(raw.reference),
    title,
    company: str(raw.name),
    location: locs[0] ?? null,
    locations: locs,
    date: isoDate(raw.renewed) ?? posted,
    postedAt: posted,
    url: offerUrl(slug),
    seniority: seniorityOf(raw.seniority),
    category: str(raw.category),
    workplaceType: location.fullyRemote === true ? "remote" : str(location.type),
    salaryMin: visible ? num(salary.from) : null,
    salaryMax: visible ? num(salary.to) : null,
    salaryCurrency: visible ? str(salary.currency) : null,
    salaryPeriod: str(salary.period)?.toLowerCase() ?? null,
    contractType: str(salary.type),
    skills: arr(obj(raw.tiles).values)
      .filter((t) => t.type === "requirement")
      .map((t) => str(t.value))
      .filter((s): s is string => s !== null),
  }
}

/**
 * The API returns one row per location of an offer (a multi-city offer can
 * fill a page), so rows are de-duplicated by `reference`. When a city was
 * requested, the row for that city wins so the id/url point at it.
 */
export function parseSearchResponse(body: unknown, location?: string): { results: JobResult[]; total: number | null } {
  if (!body || typeof body !== "object") return { results: [], total: null }
  const b = body as Raw
  const want = location ? foldCity(location) : null
  const byKey = new Map<string, { row: JobResult; city: string | null }>()
  for (const raw of arr(b.postings)) {
    let row: JobResult | null
    try {
      row = mapPosting(raw)
    } catch {
      row = null
    }
    if (!row) continue
    const rowCity = arr(obj(raw.location).places).map((p) => str(p.city)).find((c) => c !== null) ?? null
    const key = row.reference ?? row.id
    const seen = byKey.get(key)
    if (!seen) {
      byKey.set(key, { row, city: rowCity })
    } else if (want && rowCity && foldCity(rowCity) === want && (!seen.city || foldCity(seen.city) !== want)) {
      byKey.set(key, { row, city: rowCity })
    }
  }
  const results = [...byKey.values()].map(({ row, city }) =>
    want && city && foldCity(city) === want ? { ...row, location: city } : row,
  )
  return { results, total: typeof b.totalCount === "number" ? b.totalCount : null }
}

function foldCity(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/gi, "l")
    .trim()
    .toLowerCase()
}

/** Salaries per contract type from `essentials.originalSalary` (the employer's own figures and unit). */
export function mapSalaries(essentials: unknown): Salary[] {
  const original = obj(obj(essentials).originalSalary)
  if (original.containsSalary !== undefined && original.containsSalary !== "VISIBLE") return []
  const currency = str(original.currency)
  return Object.entries(obj(original.types)).map(([type, v]) => {
    const t = obj(v)
    const range = Array.isArray(t.range) ? t.range : []
    return {
      contractType: type,
      min: num(range[0]),
      max: num(range[1] ?? range[0]),
      currency,
      period: str(t.period)?.toLowerCase() ?? null,
    }
  })
}

/** Map the detail response. Personal data in the posting (consent clauses, contact e-mails) is not emitted. */
export function mapDetail(raw: Raw): JobDetail | null {
  const slug = (str(raw.postingUrl) ?? str(raw.id))?.toLowerCase() ?? null
  const title = str(raw.title)
  if (!slug || !title) return null
  const location = obj(raw.location)
  const locs = cities(location)
  const basics = obj(raw.basics)
  const company = obj(raw.company)
  const requirements = obj(raw.requirements)
  const specs = obj(raw.specs)
  const salaries = mapSalaries(raw.essentials)
  const primary = salaries.find((s) => s.min !== null || s.max !== null) ?? null
  const apply = obj(raw.apply)
  const external = arr(apply.externalPortalLinks).map((l) => str(l.url)).find((u) => u !== null)
  const remote = typeof location.remote === "number" && location.remote >= 5
  const values = (v: unknown) => arr(v).map((x) => str(x.value)).filter((s): s is string => s !== null)
  const dailyTasks = strings(specs.dailyTasks)
  const status = str(raw.status)
  const posted = isoDate(raw.posted)
  return {
    id: slug,
    reference: str(raw.reference),
    title,
    company: str(company.name),
    location: locs[0] ?? null,
    locations: locs,
    date: posted,
    postedAt: posted,
    url: offerUrl(slug),
    seniority: seniorityOf(basics.seniority),
    category: str(basics.category),
    workplaceType: remote ? "remote" : locs.length ? "office/hybrid" : null,
    salaryMin: primary?.min ?? null,
    salaryMax: primary?.max ?? null,
    salaryCurrency: primary?.currency ?? null,
    salaryPeriod: primary?.period ?? null,
    contractType: primary?.contractType ?? salaries[0]?.contractType ?? null,
    salaries,
    skills: values(requirements.musts),
    niceToHaveSkills: values(requirements.nices),
    description: htmlToText(str(obj(raw.details).description)),
    requirements: htmlToText(str(requirements.description)),
    dailyTasks,
    benefits: strings(obj(raw.benefits).benefits),
    languages: arr(requirements.languages)
      .map((l) => [str(l.code), str(l.type)?.toLowerCase()].filter(Boolean).join(" "))
      .filter((l) => l !== ""),
    companySize: str(company.size),
    companyUrl: str(company.url),
    applyUrl: external ?? null,
    expiresAt: str(raw.expiresAt),
    isActive: status ? status === "PUBLISHED" : null,
  }
}

export interface SearchParams {
  query?: string
  location?: string
  seniority: string[]
  page: number
}

/** Remove characters that would break or extend the criteria string. */
function criteriaValue(s: string): string {
  return s.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Build the "rawSearch" criteria string the site's search box produces,
 * e.g. `react seniority=mid,senior city=warszawa`. A multi-word city is quoted.
 */
export function buildRawSearch(p: Omit<SearchParams, "page">): string {
  const parts: string[] = []
  if (p.query) {
    const q = criteriaValue(p.query)
    if (q) parts.push(q)
  }
  if (p.seniority.length) parts.push(`seniority=${p.seniority.join(",")}`)
  if (p.location) {
    let city = criteriaValue(p.location).toLowerCase()
    if (/^(zdalnie|zdalna|praca zdalna)$/.test(city)) city = "remote"
    if (city) parts.push(/\s/.test(city) ? `city="${city}"` : `city=${city}`)
  }
  return parts.join(" ")
}

/** Search URL + POST body. Salaries in the response are normalised by the site to PLN per month. */
export function buildSearchRequest(p: SearchParams): { url: string; body: { rawSearch: string } } {
  const params = new URLSearchParams({
    page: String(p.page),
    pageSize: String(PAGE_SIZE),
    salaryCurrency: "PLN",
    salaryPeriod: "month",
    region: "pl",
  })
  return { url: `${SEARCH_URL}?${params.toString()}`, body: { rawSearch: buildRawSearch(p) } }
}

/** Keep results published or renewed within the last `days` days (the API has no age parameter). */
export function filterByAge<T extends { date: string | null }>(results: T[], days: number | undefined, now = Date.now()): T[] {
  if (!days) return results
  const cutoff = now - days * 86_400_000
  return results.filter((r) => {
    const t = r.date ? Date.parse(r.date) : NaN
    return Number.isFinite(t) && t >= cutoff
  })
}

/**
 * Accept an offer slug, an 8-character reference, or a public offer URL on
 * this portal's host. URLs on any other host are rejected (parsed with URL, so
 * look-alike hosts fail too).
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
    const m = decodeURIComponent(parsed.pathname).match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?job\/([\p{L}0-9-]+)\/?$/iu)
    return m ? m[1].toLowerCase() : null
  }
  if (/^[A-Z0-9]{8}$/.test(trimmed)) return trimmed
  return /^[\p{L}0-9][\p{L}0-9-]{2,}$/iu.test(trimmed) ? trimmed.toLowerCase() : null
}

export function formatSalary(r: Pick<JobResult, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod" | "contractType">): string {
  if (r.salaryMin === null && r.salaryMax === null) return "—"
  const fmt = (n: number | null) => (n === null ? "?" : Math.round(n).toLocaleString("en-US"))
  const range = r.salaryMin === r.salaryMax ? fmt(r.salaryMin) : `${fmt(r.salaryMin)}-${fmt(r.salaryMax)}`
  const period = r.salaryPeriod ? `/${r.salaryPeriod}` : ""
  const contract = r.contractType ? ` ${r.contractType}` : ""
  return `${range} ${r.salaryCurrency ?? ""}${period}${contract}`.replace(/\s+/g, " ").trim()
}
