/* Shared shapes for the programmatic data sets.

   Every numeric field that a visitor could act on carries provenance. The
   `verified` flag is not decoration: pages render an explicit "unverified
   estimate" notice until it is true, and `npm run data:check` will fail a
   production build if PUBLIC_REQUIRE_VERIFIED=1 and any published row is
   still unverified.

   The reason is narrow and practical. Publishing a wrong transfer tax rate
   across 50 state pages is both a content-quality problem and the kind of
   thing a visitor makes a real financial decision on. Seeded values
   are a scaffold for the page template, not a data set. */


/** Evidence that a value was actually checked, rather than merely believed.
 *
 *  A bare `verified: true` rots: in eighteen months nobody can tell whether it
 *  means "checked against the IRS" or "looked about right". Recording the
 *  source and the date also lets the build gate fail on STALE data, which
 *  matters because most of these figures are re-issued annually. */
export interface Provenance {
  /** ISO date the value was last checked */
  checkedOn: string;
  /** specific enough to re-check — a table number, not "the Census website" */
  source: string;
  /** who signed it off */
  by: string;
}

/** `false` until checked; a Provenance record once it has been. */
export type Verified = Provenance | false;

/** One band of a transfer tax schedule. */
export interface TransferTier {
  /** upper bound of the band, in dollars of price; null = no upper bound */
  upTo: number | null;
  /** percent of price */
  rate: number;
}

/** A state's real estate transfer tax.

    Stored as a schedule rather than a single percentage, because several
    states are not a single percentage and flattening them produced real
    errors: Vermont was carrying its top tier as if it applied from the first
    dollar, and Washington was carrying its second band, which overstates the
    tax on every home below $525,000. */
export interface TransferTax {
  /** null where the state imposes no transfer or deed tax at all */
  tiers: readonly TransferTier[] | null;
  /** How the bands work. 'marginal' taxes each band at its own rate, like an
   *  income tax. 'cliff' applies the band's rate to the WHOLE price — which
   *  is what Washington and DC actually do, and produces a jump of thousands
   *  of dollars at the threshold rather than a gentle slope. */
  tierMode: 'marginal' | 'cliff';
  /** Who customarily pays. This is closing custom, not statute, in most
   *  states; 'split' means the statute itself divides it. */
  paidBy: 'buyer' | 'seller' | 'split' | 'negotiable' | 'varies';
  /** True where counties or cities commonly levy their own on top, so the
   *  figure here is a floor rather than the amount actually due. */
  localAddOn: boolean;
  note: string;
  verified: Verified;
}

/** Transfer tax due on a price, honouring the state's band structure. */
export function transferTaxOn(price: number, tt: TransferTax): number {
  if (!tt.tiers || price <= 0) return 0;
  if (tt.tierMode === 'cliff') {
    const band = tt.tiers.find((t) => t.upTo === null || price <= t.upTo) ?? tt.tiers[tt.tiers.length - 1];
    return price * (band.rate / 100);
  }
  let due = 0;
  let from = 0;
  for (const t of tt.tiers) {
    const ceiling = t.upTo ?? Infinity;
    if (price <= from) break;
    due += (Math.min(price, ceiling) - from) * (t.rate / 100);
    from = ceiling;
  }
  return due;
}

/** Effective rate as a percentage of price — what the old single number was
 *  trying to be, but computed from the schedule so it cannot disagree. */
export function effectiveTransferRate(price: number, tt: TransferTax): number {
  if (!tt.tiers || price <= 0) return 0;
  return (transferTaxOn(price, tt) / price) * 100;
}

export interface StateData {
  code: string;
  name: string;
  slug: string;
  transferTax: TransferTax;
  /** typical deed + mortgage recording charge, flat dollars */
  recordingFee: number;
  /** states where an attorney is customarily required at closing */
  attorneyState: boolean;
  attorneyFee: number;
  /** average effective property tax, % of market value per year */
  propertyTaxPct: number;
  /** average annual homeowners premium */
  insuranceAnnual: number;
  verified: Verified;
  source: string;
}

export interface MetroData {
  slug: string;
  name: string;
  stateCode: string;
  /** Census median home VALUE (B25077) — what owners estimate their homes are
   *  worth across all owner-occupied stock. This is NOT the median sale price,
   *  which runs higher because it reflects only what actually transacted. */
  medianValue: number;
  /** median household income, used for the affordability ratio */
  medianIncome: number;
  /** local effective property tax rate, % of value per year */
  propertyTaxPct: number;
  insuranceAnnual: number;
  /** Census median GROSS rent (B25064) — all unit sizes, utilities included.
   *  Not a 2-bed asking rent, which runs higher. */
  medianRent: number;
  verified: Verified;
  source: string;
}

/** Sources to verify against. Listed here so the check script can print them. */
export const SOURCES = {
  transferTax: 'State departments of revenue; ALTA state-by-state closing customs',
  propertyTax: 'Census Bureau American Community Survey, Table B25103 (median real estate taxes)',
  insurance: 'NAIC Homeowners Insurance Report (average annual premium by state)',
  price: 'FHFA House Price Index / Census ACS Table B25077 (median home value)',
  income: 'Census ACS Table B19013 (median household income)',
  rent: 'Census ACS Table B25064 (median gross rent)',
} as const;
