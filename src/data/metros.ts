/* Seed metro set.
   ALL ROWS ARE SEEDED ESTIMATES — verified: false. See README.md.

   The build plan calls for ~400 metro pages. This file holds a hand-checked
   shape for the top metros; expand it with scripts/import-metros.mjs from a
   Census ACS export rather than by hand. Four hundred hand-typed rows is four
   hundred chances to publish a wrong number. */
import type { MetroData } from './types';

const m = (
  name: string, stateCode: string,
  medianPrice: number, medianIncome: number,
  propertyTaxPct: number, insuranceAnnual: number, medianRent: number,
): MetroData => ({
  name, stateCode,
  slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${stateCode.toLowerCase()}`,
  medianPrice, medianIncome, propertyTaxPct, insuranceAnnual, medianRent,
  verified: false,
  source: 'seeded estimate — unverified',
});

export const METROS: MetroData[] = [
  m('New York',      'NY', 780_000,  85_000, 1.35, 1_900, 2_100),
  m('Los Angeles',   'CA', 900_000,  83_000, 0.74, 1_600, 2_050),
  m('Chicago',       'IL', 340_000,  81_000, 2.10, 2_000, 1_500),
  m('Dallas',        'TX', 390_000,  83_000, 1.72, 4_100, 1_600),
  m('Houston',       'TX', 340_000,  78_000, 1.85, 4_600, 1_400),
  m('Phoenix',       'AZ', 450_000,  79_000, 0.62, 1_900, 1_650),
  m('Philadelphia',  'PA', 290_000,  78_000, 1.42, 1_400, 1_400),
  m('San Antonio',   'TX', 300_000,  70_000, 1.90, 4_300, 1_300),
  m('San Diego',     'CA', 900_000,  98_000, 0.68, 1_700, 2_400),
  m('Austin',        'TX', 450_000,  95_000, 1.65, 3_900, 1_650),
  m('Jacksonville',  'FL', 340_000,  74_000, 0.88, 3_800, 1_450),
  m('Fort Worth',    'TX', 340_000,  78_000, 1.80, 4_200, 1_450),
  m('Columbus',      'OH', 290_000,  72_000, 1.55, 1_400, 1_250),
  m('Charlotte',     'NC', 400_000,  80_000, 0.78, 2_100, 1_550),
  m('Indianapolis',  'IN', 260_000,  69_000, 0.85, 1_500, 1_200),
  m('San Francisco', 'CA', 1_300_000, 126_000, 0.72, 1_800, 2_900),
  m('Seattle',       'WA', 780_000, 110_000, 0.89, 1_400, 2_200),
  m('Denver',        'CO', 570_000,  95_000, 0.51, 2_400, 1_850),
  m('Washington',    'DC', 640_000, 106_000, 0.57, 1_400, 2_000),
  m('Boston',        'MA', 700_000,  98_000, 1.05, 1_900, 2_300),
  m('Nashville',     'TN', 450_000,  79_000, 0.65, 2_200, 1_600),
  m('Portland',      'OR', 530_000,  88_000, 0.98, 1_200, 1_700),
  m('Las Vegas',     'NV', 440_000,  72_000, 0.52, 1_400, 1_500),
  m('Detroit',       'MI', 240_000,  68_000, 1.45, 1_600, 1_200),
  m('Atlanta',       'GA', 400_000,  82_000, 0.92, 2_300, 1_650),
  m('Miami',         'FL', 580_000,  72_000, 0.95, 5_600, 2_100),
  m('Tampa',         'FL', 400_000,  73_000, 0.90, 4_500, 1_700),
  m('Orlando',       'FL', 390_000,  73_000, 0.92, 4_100, 1_700),
  m('Minneapolis',   'MN', 370_000,  92_000, 1.12, 2_400, 1_450),
  m('Baltimore',     'MD', 380_000,  92_000, 1.08, 1_800, 1_600),
  m('St Louis',      'MO', 250_000,  75_000, 1.00, 2_500, 1_150),
  m('Pittsburgh',    'PA', 230_000,  71_000, 1.60, 1_300, 1_150),
  m('Cincinnati',    'OH', 270_000,  74_000, 1.48, 1_400, 1_200),
  m('Kansas City',   'MO', 300_000,  78_000, 1.15, 2_600, 1_250),
  m('Sacramento',    'CA', 570_000,  85_000, 0.78, 1_500, 1_850),
  m('Salt Lake City','UT', 540_000,  88_000, 0.56, 1_500, 1_500),
  m('Raleigh',       'NC', 430_000,  92_000, 0.75, 2_000, 1_550),
  m('Richmond',      'VA', 370_000,  82_000, 0.85, 1_800, 1_450),
  m('Milwaukee',     'WI', 300_000,  71_000, 1.70, 1_400, 1_200),
  m('Oklahoma City', 'OK', 250_000,  68_000, 0.95, 3_800, 1_100),
  m('Louisville',    'KY', 270_000,  70_000, 0.85, 2_000, 1_150),
  m('Providence',    'RI', 450_000,  81_000, 1.35, 1_900, 1_600),
];

export const metroBySlug = (slug: string): MetroData | undefined =>
  METROS.find((x) => x.slug === slug);

export const metrosByState = (code: string): MetroData[] =>
  METROS.filter((x) => x.stateCode === code);

export const unverifiedMetros = (): MetroData[] => METROS.filter((x) => !x.verified);
