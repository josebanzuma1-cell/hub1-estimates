# Estimates — Hub 1: Mortgage & Real Estate

Seven mortgage and real estate calculators, plus 51 state and 42 metro
programmatic pages. Hub 1 of the utility site portfolio.

Astro 5, static output, one vanilla-TS island per page. No UI framework.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3025
npm run build        # runs the data gate, then builds to dist/
npm run data:report  # data verification coverage
```

Model tests (the math is the product — run these after touching a model):

```bash
node --import ./scripts/alias-loader.mjs scripts/test-finance.mjs
```

## What is here

**Tools** (`/tools/*`) — plan tool numbers in brackets:

| Tool | Notes |
|---|---|
| Amortization + extra payments [1] | Full schedule, payoff-date shift, interest saved |
| Refinance break-even [2] | Two break-evens: simple, and net-position |
| Rent vs buy [3] | Month-by-month net worth, both paths, same budget |
| Home affordability [4] | Solves for price against both DTI limits, handles the PMI boundary |
| Closing costs [5] | Four Loan Estimate buckets, state transfer tax and recording fees |
| Rental property [6] | Cap rate, cash-on-cash, DSCR, 10-year pro forma, IRR |
| HELOC vs cash-out [7] | Prices the re-pricing of the existing balance |

**Programmatic** — `/closing-costs/[state]` (51) and `/affordability/[metro]` (42).
These branch on real data rather than swapping a name: a no-transfer-tax state
renders different sections from a 4% state, and attorney-closing states get a
section others do not.

**107 pages total**, sitemap at `/sitemap.xml`.

## Architecture

```
src/kit/            hub-agnostic — copy to the next hub (see PORTING.md)
src/lib/site.ts     name, tool registry, nav — rewritten per hub
src/lib/tools/      one pure module per calculator: FIELDS, D, compute()
src/data/           state + metro data sets, each row carrying provenance
src/scripts/        islands shared across more than one page
src/pages/          page shells and prose
```

Models are pure functions with no DOM access, so they run under plain `node`
and can be tested independently of the browser.

## Before launch — required

1. **Verify the data.** Every row in `src/data/` ships `verified: false` and
   renders behind an "unverified estimate" notice. See `src/data/README.md` for
   the per-column sources and procedure. Then set `PUBLIC_REQUIRE_VERIFIED=1`
   in production so the build fails if any unverified row remains.
2. **Set the domain.** `SITE.url` in `src/lib/site.ts`, `site` in
   `astro.config.mjs`, and the `Sitemap:` line in `public/robots.txt`.
3. **No advertising.** Ad slots were removed; the site ships with no ad
   markup, no ad script, and no third-party requests. If ads are ever wanted
   back, the reserved-height `AdSlot` component is in git history at `bdc82c3`.
4. **Re-check prose figures.** Worked examples in the copy are computed from
   the models; if you change a default, re-derive them.

## Performance

Per-page JavaScript is 1.4–2.6 kB gzipped, plus a shared kit chunk of about
5 kB — roughly 7.5 kB on the heaviest page against the 50 kB budget. No
third-party scripts, so nothing external can shift layout or block render.

## Deployment

Static `dist/`. Any static host. On Vercel: framework preset Astro, build
`npm run build`, output `dist`.

## Licence / disclaimers

Calculators are estimates, not financial advice. `/methodology` documents every
formula and every exclusion; `/terms` and `/privacy` are in place for AdSense
review.
