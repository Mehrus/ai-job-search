# nofluffjobs.com URL Reference

The JSON API that nofluffjobs.com's Angular frontend calls from the browser.
Unauthenticated. Verified live on 2026-11-02 (direct requests).

> Personal use only — `robots.txt` disallows `/api/` (and `/posting/`); keep volume low.

## Search

```
POST https://nofluffjobs.com/api/search/posting?page=1&pageSize=20&salaryCurrency=PLN&salaryPeriod=month&region=pl
Content-Type: application/json

{ "rawSearch": "react seniority=mid,senior city=warszawa" }
```

| Query param | Meaning | Example |
|-------------|---------|---------|
| `page` | 1-indexed page of offers | `1`, `2` |
| `pageSize` | Offers per page (rows are per location, so a page has more rows than this) | `20` |
| `salaryCurrency` | Currency salaries are converted to. **Required** — without it the response has no `postings` | `PLN` |
| `salaryPeriod` | Period salaries are normalised to | `month` |
| `region` | Site region | `pl` |

`rawSearch` is the string the site's search box produces. Free words are parsed by the
site (known technologies → `requirement=`, `senior` → `seniority=`, rest → `keyword=`).
Criteria the CLI uses:

| Criterion | Values | Example |
|-----------|--------|---------|
| `seniority=` | `trainee`, `junior`, `mid`, `senior`, `expert` (comma list) | `seniority=mid,senior` |
| `city=` | City (case-insensitive, diacritics optional); `remote` for fully remote; quote multi-word names | `city=kraków`, `city="zielona góra"` |

`pageTo=N` (seen in older clients) returns pages 1..N at once; the CLI uses `page`.

Response:

```jsonc
{
  "postings": [ { /* one row per offer location */ } ],
  "totalCount": 2023,       // rows, not unique offers
  "totalPages": 12,
  "rawSearch": "requirement=React",   // the site's parse of the query
  "criteriaSearch": { ... }
}
```

Row fields used: `url` (slug → `id`), `reference` (8-char offer id, shared by all rows of an
offer → de-duplication key), `title`, `name` (company), `location.places[].city`
(`provinceOnly` rows have no city), `location.fullyRemote`, `location.type`
(`remote`/`hybrid`/…), `posted` / `renewed` (epoch ms), `seniority[]` (`"Mid"`, …),
`category`, `tiles.values[]` (`type: "requirement"` → skills) and `salary`:

```jsonc
{ "from": 13000, "to": 22000, "type": "b2b", "currency": "PLN", "period": "Month",
  "containsSalary": "VISIBLE" }   // converted to salaryCurrency / salaryPeriod
```

## Detail

```
GET https://nofluffjobs.com/api/posting/<slug|reference>
```

Unknown id → 404. Fields used: `postingUrl`, `reference`, `title`, `basics.{category,seniority}`,
`company.{name,size,url}`, `details.description` (HTML), `requirements.{musts,nices,description,languages}`,
`specs.dailyTasks[]`, `benefits.benefits[]`, `location.{places,remote}`, `apply.externalPortalLinks[]`,
`posted`, `expiresAt`, `status` (`PUBLISHED`), and the original salary:

```jsonc
"essentials": { "originalSalary": { "currency": "PLN",
  "types": { "b2b": { "period": "Hour", "range": [155, 205] } }, "containsSalary": "VISIBLE" } }
```

Not emitted: `consents` (GDPR clause with recruiter e-mail), `applyForm`, `analytics`.

## Public offer page

```
https://nofluffjobs.com/pl/job/<slug>
```
