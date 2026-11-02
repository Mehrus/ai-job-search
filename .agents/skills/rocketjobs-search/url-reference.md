# rocketjobs.pl URL Reference

The JSON "candidate-api" that rocketjobs.pl's Next.js frontend calls from the browser.
Unauthenticated. Verified live on 2026-11-02 (browser devtools + direct requests).

> Personal use only — `robots.txt` disallows `/api/`; keep volume low.
>
> Same API (and same response shape) as justjoin.it — see
> `../justjoin-search/url-reference.md`; only the host and the public offer path differ.

## Search

```
GET https://rocketjobs.pl/api/candidate-api/offers
```

| Param | Meaning | Example |
|-------|---------|---------|
| `keywords` | Free-text query | `react` |
| `keywordType` | Match mode; the site sends `any` | `any` |
| `experienceLevels` | Repeat per level: `junior`, `mid`, `senior`, `manager`, `c_level`. Unknown values return 0 results with HTTP 200 | `experienceLevels=mid&experienceLevels=senior` |
| `city` | City name (case-insensitive, Polish diacritics) | `Warszawa`, `Kraków` |
| `cityRadius` | km around the city; the site sends `30`, optional | `30` |
| `remoteWorkOptions` | Workplace filter; the site sends `remote` for fully remote | `remote` |
| `sortBy` | `publishedAt` (newest) or `match` (relevance). `published` is rejected with 400 | `publishedAt` |
| `orderBy` | `descending` / `ascending` | `descending` |
| `from` | Offset (cursor) | `0`, `20`, … |
| `itemsCount` | Page size (the site uses 10) | `20` |

Response:

```jsonc
{
  "data": [ { /* offer */ } ],
  "meta": { "from": 0, "totalItems": 756, "prev": {...}, "next": { "cursor": 20, "itemsCount": 20 } }
}
```

Offer fields used: `slug` (→ `id`), `title`, `companyName`, `city`, `locations[].city`,
`publishedAt` (ISO), `expiredAt`, `experienceLevel`, `workplaceType` (`remote`/`hybrid`/`office`),
`workingTime`, `requiredSkills[].name`, and `employmentTypes[]`:

```jsonc
{ "from": 16800, "fromPerUnit": 100, "to": 30240, "toPerUnit": 180,
  "currency": "PLN", "currencySource": "original" | "conversion",
  "type": "b2b" | "permanent" | ..., "unit": "Month" | "Hour", "gross": false }
```

`from`/`to` are normalised to a month; `fromPerUnit`/`toPerUnit` are the published figures.
Each contract type is repeated in PLN/EUR/USD/GBP/CHF; only `currencySource: "original"` rows
are the employer's own numbers.

Same-endpoint helpers the site also calls (unused here): `/offers/count`, `/offers/suggest`.

## Detail

```
GET https://rocketjobs.pl/api/candidate-api/offers/<slug>
```

Returns the offer fields above plus `body` (HTML description), `niceToHaveSkills`,
`languages[{code,level}]`, `companyUrl`, `companySize`, `applyUrl`, `isActive`, and
`url` (`https://rocketjobs.pl/oferta-pracy/<slug>`). Unknown slug → 404.

## Public offer page

```
https://rocketjobs.pl/oferta-pracy/<slug>
```
