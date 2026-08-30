/* 50 states + DC.
   ALL ROWS ARE SEEDED ESTIMATES — verified: false. See src/data/README.md for
   the verification procedure and the primary source for each column. Do not
   launch these pages with verified: false; the build gate exists for this. */
import type { StateData } from './types';

const s = (
  code: string, name: string,
  transferTaxPct: number | null, transferTaxPaidBy: StateData['transferTaxPaidBy'],
  recordingFee: number, attorneyState: boolean, attorneyFee: number,
  propertyTaxPct: number, insuranceAnnual: number, transferTaxNote: string,
): StateData => ({
  code, name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  transferTaxPct, transferTaxPaidBy, recordingFee,
  attorneyState, attorneyFee, propertyTaxPct, insuranceAnnual,
  transferTaxNote,
  verified: false,
  source: 'seeded estimate — unverified',
});

export const STATES: StateData[] = [
  s('AL', 'Alabama',        0.10, 'seller',     120, false,   0, 0.41, 1_800, 'Deed tax $0.50 per $500 of price.'),
  s('AK', 'Alaska',         null, 'negotiable', 130, false,   0, 1.07, 1_300, 'No state transfer tax.'),
  s('AZ', 'Arizona',        null, 'negotiable', 110, false,   0, 0.63, 1_900, 'Flat $2 affidavit fee only; no percentage tax.'),
  s('AR', 'Arkansas',       0.33, 'seller',     100, false,   0, 0.62, 2_400, 'Real property transfer tax $3.30 per $1,000.'),
  s('CA', 'California',     0.11, 'seller',     150, false,   0, 0.75, 1_500, 'County $1.10 per $1,000; many cities add substantially more.'),
  s('CO', 'Colorado',       0.01, 'seller',     130, false,   0, 0.52, 2_200, 'Documentary fee $0.01 per $100.'),
  s('CT', 'Connecticut',    1.00, 'seller',     180, true,  1_200, 1.79, 1_800, 'State 0.75%-1.25% by price tier, plus municipal 0.25%+.'),
  s('DE', 'Delaware',       4.00, 'negotiable', 160, true,  1_100, 0.58, 1_100, 'Combined state and county 4%, commonly split buyer/seller.'),
  s('DC', 'District of Columbia', 1.10, 'buyer', 200, true, 1_300, 0.57, 1_300, 'Recordation 1.1%-1.45%; seller pays a matching transfer tax.'),
  s('FL', 'Florida',        0.70, 'seller',     140, false,   0, 0.86, 4_200, 'Documentary stamp $0.70 per $100; Miami-Dade differs.'),
  s('GA', 'Georgia',        0.10, 'seller',     120, true,  1_000, 0.90, 2_100, 'Transfer tax $1.00 per $1,000.'),
  s('HI', 'Hawaii',         0.10, 'seller',     150, false,   0, 0.29, 1_400, 'Conveyance tax 0.10%-1.25%, rising with price.'),
  s('ID', 'Idaho',          null, 'negotiable', 110, false,   0, 0.63, 1_600, 'No state transfer tax.'),
  s('IL', 'Illinois',       0.10, 'seller',     160, true,  1_100, 2.07, 2_000, 'State $0.50 per $500, plus county and often city.'),
  s('IN', 'Indiana',        null, 'negotiable', 110, false,   0, 0.83, 1_500, 'No state transfer tax.'),
  s('IA', 'Iowa',           0.16, 'seller',     120, false,   0, 1.50, 1_800, 'Transfer tax $1.60 per $1,000 above $500.'),
  s('KS', 'Kansas',         null, 'negotiable', 120, false,   0, 1.34, 3_400, 'No transfer tax; mortgage registration fee repealed.'),
  s('KY', 'Kentucky',       0.10, 'seller',     110, true,    900, 0.83, 1_900, 'Transfer tax $0.50 per $500.'),
  s('LA', 'Louisiana',      null, 'negotiable', 140, true,  1_000, 0.55, 2_800, 'No state transfer tax; Orleans Parish charges a flat fee.'),
  s('ME', 'Maine',          0.44, 'negotiable', 130, false,   0, 1.24, 1_500, 'Transfer tax $2.20 per $500, split buyer/seller.'),
  s('MD', 'Maryland',       0.50, 'negotiable', 170, false,   0, 1.05, 1_700, 'State 0.5% plus county recordation; first-time buyers exempt from half.'),
  s('MA', 'Massachusetts',  0.46, 'seller',     175, true,  1_300, 1.14, 1_800, 'Excise stamps $4.56 per $1,000; Barnstable County higher.'),
  s('MI', 'Michigan',       0.86, 'seller',     130, false,   0, 1.38, 1_400, 'State 0.75% plus county 0.11%.'),
  s('MN', 'Minnesota',      0.33, 'seller',     140, false,   0, 1.11, 2_200, 'Deed tax 0.33%; Hennepin and Ramsey add 0.01%.'),
  s('MS', 'Mississippi',    null, 'negotiable', 110, false,   0, 0.79, 3_000, 'No state transfer tax.'),
  s('MO', 'Missouri',       null, 'negotiable', 110, false,   0, 0.97, 2_400, 'No state transfer tax.'),
  s('MT', 'Montana',        null, 'negotiable', 110, false,   0, 0.74, 2_000, 'No transfer tax; realty transfer certificate required.'),
  s('NE', 'Nebraska',       0.23, 'seller',     120, false,   0, 1.63, 2_900, 'Documentary stamp $2.25 per $1,000.'),
  s('NV', 'Nevada',         0.51, 'seller',     140, false,   0, 0.55, 1_400, 'Transfer tax varies by county; Clark County highest.'),
  s('NH', 'New Hampshire',  1.50, 'negotiable', 150, false,   0, 1.93, 1_400, 'Transfer tax 1.5% total, split 0.75% each side.'),
  s('NJ', 'New Jersey',     1.00, 'seller',     180, true,  1_200, 2.23, 1_400, 'Realty transfer fee is tiered; buyer adds 1% above $1M.'),
  s('NM', 'New Mexico',     null, 'negotiable', 120, false,   0, 0.67, 2_100, 'No state transfer tax.'),
  s('NY', 'New York',       0.40, 'seller',     250, true,  2_000, 1.54, 1_600, 'State 0.4%; NYC adds 1%-1.425% plus mansion tax above $1M.'),
  s('NC', 'North Carolina', 0.20, 'seller',     130, false,   0, 0.73, 2_000, 'Excise tax $1.00 per $500; seven counties add more.'),
  s('ND', 'North Dakota',   null, 'negotiable', 110, false,   0, 0.98, 2_100, 'No state transfer tax.'),
  s('OH', 'Ohio',           0.10, 'seller',     130, false,   0, 1.52, 1_400, 'Conveyance fee $1 per $1,000 plus county permissive fee.'),
  s('OK', 'Oklahoma',       0.15, 'seller',     110, false,   0, 0.90, 3_600, 'Documentary stamp $0.75 per $500.'),
  s('OR', 'Oregon',         null, 'negotiable', 130, false,   0, 0.93, 1_100, 'No transfer tax except Washington County.'),
  s('PA', 'Pennsylvania',   2.00, 'negotiable', 160, false,   0, 1.49, 1_300, 'State 1% plus local 1%; commonly split, Philadelphia higher.'),
  s('RI', 'Rhode Island',   0.46, 'seller',     150, true,  1_100, 1.40, 1_800, 'Transfer tax $2.30 per $500.'),
  s('SC', 'South Carolina', 0.37, 'seller',     130, true,  1_000, 0.57, 1_800, 'Deed recording fee $3.70 per $1,000.'),
  s('SD', 'South Dakota',   0.10, 'seller',     110, false,   0, 1.17, 2_600, 'Transfer fee $0.50 per $500.'),
  s('TN', 'Tennessee',      0.37, 'buyer',      130, false,   0, 0.67, 2_100, 'Transfer tax $0.37 per $100, customarily paid by buyer.'),
  s('TX', 'Texas',          null, 'negotiable', 130, false,   0, 1.68, 4_400, 'No transfer tax; title policy premium is state-regulated.'),
  s('UT', 'Utah',           null, 'negotiable', 120, false,   0, 0.57, 1_400, 'No state transfer tax.'),
  s('VT', 'Vermont',        1.25, 'buyer',      140, false,   0, 1.83, 1_300, 'Property transfer tax 1.25%; lower rate on first $100k of a principal residence.'),
  s('VA', 'Virginia',       0.25, 'buyer',      150, true,  1_000, 0.82, 1_700, 'Grantee tax $0.25 per $100; grantor pays a separate 0.10%.'),
  s('WA', 'Washington',     1.28, 'seller',     160, false,   0, 0.87, 1_300, 'REET is tiered 1.1%-3.0% by price, plus local 0.25%-0.50%.'),
  s('WV', 'West Virginia',  0.22, 'seller',     120, true,    900, 0.57, 1_500, 'Transfer tax $1.10 per $500 plus county add-on.'),
  s('WI', 'Wisconsin',      0.30, 'seller',     130, false,   0, 1.61, 1_400, 'Transfer fee $3.00 per $1,000.'),
  s('WY', 'Wyoming',        null, 'negotiable', 110, false,   0, 0.56, 1_800, 'No state transfer tax.'),
];

export const stateBySlug = (slug: string): StateData | undefined =>
  STATES.find((st) => st.slug === slug);

export const stateByCode = (code: string): StateData | undefined =>
  STATES.find((st) => st.code === code);

/** Rows still awaiting verification — used by scripts/check-data.mjs. */
export const unverifiedStates = (): StateData[] => STATES.filter((st) => !st.verified);
