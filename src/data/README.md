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
