# Data sets — verification procedure

Every row in `states.ts` and `metros.ts` ships with `verified: false` and is
rendered on the site behind an explicit "unverified estimate" notice.

**Do not launch with unverified rows.** The seeded values exist so the page
templates can be built and reviewed against realistic shapes. They are not a
data set, and several are certainly wrong at the decimal place that matters.

## Why this is gated rather than trusted

Three separate reasons, all of which have bitten publishers in this niche:

1. **A visitor acts on it.** Transfer tax on a $500,000 purchase is a
   four-figure line item. Being wrong by half a percent is $2,500 of someone's
   closing statement.
2. **Search engines assess content quality.** Confidently-stated wrong numbers
   across 50 near-identical pages is exactly the profile that gets a site
   classed as low-value scaled content.
3. **You cannot defend a number you cannot source.** When a county disputes a
   figure, the answer needs to be a citation, not a shrug.

## Column sources

| Column | Primary source | Notes |
|---|---|---|
| `transferTaxPct`, `transferTaxNote` | State department of revenue | The state rate only. Counties and cities frequently add their own; the note field should say so explicitly. |
| `transferTaxPaidBy` | ALTA state-by-state closing customs | Custom, not law. Always negotiable — the page says this. |
| `recordingFee` | County recorder fee schedules | Varies within a state. Publish a typical range, not a false precision. |
| `attorneyState`, `attorneyFee` | State bar / ALTA | Attorney-required states are well documented; the fee is a market estimate. |
| `propertyTaxPct` | Census ACS Table B25103 | Effective rate = median taxes ÷ median value. Recompute rather than copying a secondary source. |
| `insuranceAnnual` | NAIC Homeowners Insurance Report | Published with a lag; state the report year on the page. |
| `medianPrice` | Census ACS B25077 or FHFA HPI | Pick one and stay with it — mixing sources across metros makes comparisons meaningless. |
| `medianIncome` | Census ACS B19013 | |
| `medianRent` | Census ACS B25064 | Median gross rent, all bedroom counts. |

## Procedure

1. Work one column at a time across all rows, not one row at a time. Sources are
   published as full tables; loading a table once and filling 51 cells is both
   faster and far less error-prone than 51 separate lookups.
2. Record the release year in `source` (e.g. `"Census ACS 2023 5-year, B25103"`).
3. Flip `verified: true` only for rows you actually checked.
4. Run `npm run data:report` to see remaining coverage.
5. Set `PUBLIC_REQUIRE_VERIFIED=1` in the production environment. The build then
   fails if any published row is still unverified.

## Expanding the metro set

`metros.ts` ships with a seed set of major metros. The build plan calls for
~400. Do not hand-write them — export a CSV from Census ACS with the columns
above and run `node scripts/import-metros.mjs <file.csv>`, which writes
`metros.generated.ts` with provenance intact. Hand-entry across 400 rows will
introduce errors faster than it produces pages.

---

# Verification workflow

Not all 93 rows are equally hard. They fall into tiers by source type, and the
tiers differ by orders of magnitude in effort.

## Tier A — automated, one API

`propertyTaxPct` (states and metros), `medianPrice`, `medianIncome` and
`medianRent` all come from Census ACS 5-year tables:

| Field | Table |
|---|---|
| Median home value | `B25077` |
| Median household income | `B19013` |
| Median gross rent | `B25064` |
| Median real estate taxes | `B25103` |

The effective property tax rate is computed as `B25103 ÷ B25077` rather than
copied from a secondary source, so the two can never disagree.

```bash
npm run data:census          # dry run — prints a before/after diff
npm run data:census:write    # applies it
```

Needs a free key from https://api.census.gov/data/key_signup.html in a
gitignored `.env` as `CENSUS_API_KEY=...`. The importer reads it from the
environment and never writes it into source.

Re-run when a new ACS vintage publishes, roughly each December.

## Tier B — one document, few numbers

Nothing in this hub. In the tax hubs this covers IRS and SSA figures.

## Tier C — 51 separate sources

`transferTaxPct`, `transferTaxPaidBy`, `recordingFee`, `attorneyState`. No
central machine-readable source exists.

Do **not** visit 51 revenue departments. Populate from a reputable consolidated
table, record *that* as the source, then spot-check 8–10 states against their
actual DOR pages. If the sample matches, the table is sound. If it does not,
you have learned something important cheaply.

## Tier D — should not be published as point values

Some fields have no single correct value:

- **`transferTaxPaidBy`** — convention, and it varies by county
- **`recordingFee`** — varies *within* states
- **Title premiums** (the formula in `closing-costs.ts`) — filed per state, some regulated
- **`insuranceAnnual`** — NAIC publishes state averages with a lag; an average is not a quote

For these, publish a range or drop the field. The "unverified estimate" notice
mitigates; it does not make an unverifiable point value correct.

## Provenance, not a boolean

`verified` is `false`, or a record of what was actually checked:

```ts
verified: {
  checkedOn: '2026-08-31',
  source: 'Census ACS 2023 5-year (B25077_001E, …)',
  by: 'census-import',
}
```

A bare `true` rots — in eighteen months nobody can tell whether it meant
"checked against the source" or "looked about right". The gate also fails rows
verified more than 400 days ago, because most of these figures are re-issued
annually and a two-year-old check is barely better than none.

## Assessment of the four unverified fields (2026-09-01)

The 51 state rows carry four unverified fields. They are **not** one job — they
differ in whether a verified value can exist at all. Treating them as a single
"verify 51 rows" task is why this column has sat unfinished.

### 1. `transferTaxPct` — genuinely verifiable. Do this one.

Real statutes, one per state, changing rarely. This is also the largest of the
four in dollar terms, so it is the one worth the grind.

A six-state spot check against the statutes found **two errors in six**:

| State | Ours | Statute | |
|---|---|---|---|
| Florida | 0.70% | $0.70 per $100 = 0.70% | match |
| Maine | 0.44% | $2.20 per $500 = 0.44% | match |
| South Carolina | 0.37% | $1.85 per $500 combined | match |
| Connecticut | 1.00% | 0.75–1.25% by tier + municipal | match |
| **North Carolina** | **0.20%** | **$2.00 per $2,000 = 0.10%** | **out by 2x** |
| **Vermont** | **1.25%** | **0.5% to $100k, then 1.25%** | **top tier applied flat** |

Two-thirds accuracy is what "seeded plausibly" looks like. Verifying this field
means 51 statutes; the Lincoln Institute's *Significant Features of the Property
Tax* database and NCSL both track it, but the entries seen were 2018–2020
vintage, so they are a starting point and not an answer.

**Note the shape problem too.** Several states are tiered (VT, CT) or add
substantial local charges (CA, NY, MD). A single percentage cannot express
those, and the row note is currently doing that work in prose. Consider the
same treatment `minCover` got in hub 4: a structured type that can say "tiered"
or "plus local" rather than a number that silently picks one tier.

### 2. `insuranceAnnual` — verifiable in principle, not usefully in practice.

The authoritative source is the NAIC *Homeowners Insurance Report*. The most
recent release carries **2022 data**, and it sits behind the NAIC's document
portal rather than as a direct PDF.

Homeowners premiums have risen steeply since 2022 — double digits in several
years and far more in catastrophe-exposed states. Stamping a 2022 figure
"verified" would make it **less** accurate than the seeded estimate in some
states while making it look more authoritative. That is the worst of both.

**Recommendation:** leave it seeded and clearly unverified until a current
source exists, or drop the field and let the affordability tool take insurance
as a user input with a stated national default.

### 3. `recordingFee` — the value does not exist at state level.

Recording fees are set by the **county** register of deeds almost everywhere,
and vary by document page count. A single state-wide number is not a fact that
can be checked, so no amount of research will verify it.

**Recommendation:** this is Tier D by this project's own taxonomy — a thing that
should not be a point value. Either express it as a range with the county
variation stated, or remove it and fold a national typical figure into the
closing-cost total with a note.

### 4. `attorneyState` — not a bright-line category.

Whether a state "requires an attorney at closing" is a mix of
unauthorized-practice-of-law opinions, bar rules, title-industry practice and
local custom. The American Bar Association's own summary says only "roughly a
dozen states". The current data has 14; commonly cited lists range from 12 to
22 depending on what counts.

**Recommendation:** reframe from a boolean to what can actually be sourced —
for example "attorney customarily conducts closing" with the basis named — or
drop it. A false negative here tells a buyer they do not need a lawyer.

### Summary

| Field | Verifiable? | Recommendation |
|---|---|---|
| `transferTaxPct` | Yes | Verify — 51 statutes. Consider a structured type for tiers and local add-ons. |
| `insuranceAnnual` | Only to 2022 | Leave unverified, or make it a user input |
| `recordingFee` | No — county level | Restructure or remove |
| `attorneyState` | Not cleanly | Reframe or remove |

Only one of the four is a research problem. The other three are schema
problems, and hub 4 already demonstrated the fix: when a schema cannot express
the truth, it asserts something false instead.
