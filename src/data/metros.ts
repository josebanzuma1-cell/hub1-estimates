/* Seed metro set.
   ALL ROWS ARE SEEDED ESTIMATES — verified: false. See README.md.

   The build plan calls for ~400 metro pages. This file holds a hand-checked
   shape for the top metros; expand it with scripts/import-metros.mjs from a
   Census ACS export rather than by hand. Four hundred hand-typed rows is four
   hundred chances to publish a wrong number. */
import type { MetroData } from './types';

const m = (
  name: string, stateCode: string,
  medianValue: number, medianIncome: number,
  propertyTaxPct: number, insuranceAnnual: number, medianRent: number,
): MetroData => ({
  name, stateCode,
  slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${stateCode.toLowerCase()}`,
  medianValue, medianIncome, propertyTaxPct, insuranceAnnual, medianRent,
  verified: {
    checkedOn: '2026-08-31',
    source: 'Census ACS 2023 5-year (B25077_001E, B19013_001E, B25064_001E, B25103_001E)',
    by: 'census-import',
  },
  source: 'Census ACS 2023 5-year (B25077_001E, B19013_001E, B25064_001E, B25103_001E) — insurance still seeded',
});

export const METROS: MetroData[] = [
  m('New York', 'NY', 587400, 97334, 1.69, 1_900, 1780),
  m('Los Angeles', 'CA', 825300, 93525, 0.68, 1_600, 1987),
  m('Chicago', 'IL', 301900, 88850, 2.08, 2_000, 1378),
  m('Dallas', 'TX', 330300, 87155, 1.69, 4_100, 1509),
  m('Houston', 'TX', 275200, 80458, 1.71, 4_600, 1378),
  m('Phoenix', 'AZ', 401400, 84703, 0.48, 1_900, 1581),
  m('Philadelphia', 'PA', 326700, 89273, 1.53, 1_400, 1413),
  m('San Antonio', 'TX', 258700, 74297, 1.67, 4_300, 1299),
  m('San Diego', 'CA', 791600, 102285, 0.7, 1_700, 2154),
  m('Austin', 'TX', 434800, 97638, 1.6, 3_900, 1646),
  m('Jacksonville', 'FL', 308900, 77013, 0.78, 3_800, 1416),
  m('Fort Worth', 'TX', 330300, 87155, 1.69, 4_200, 1509),
  m('Columbus', 'OH', 274300, 79847, 1.4, 1_400, 1208),
  m('Charlotte', 'NC', 319400, 80201, 0.69, 2_100, 1377),
  m('Indianapolis', 'IN', 244000, 77065, 0.83, 1_500, 1142),
  m('San Francisco', 'CA', 1113800, 133780, 0.73, 1_800, 2426),
  m('Seattle', 'WA', 673500, 112594, 0.87, 1_400, 1932),
  m('Denver', 'CO', 570300, 102339, 0.5, 2_400, 1805),
  m('Washington', 'DC', 553000, 123896, 0.92, 1_400, 1975),
  m('Boston', 'MA', 610900, 112484, 1.1, 1_900, 1940),
  m('Nashville', 'TN', 376800, 82499, 0.52, 2_200, 1434),
  m('Portland', 'OR', 526500, 94573, 0.88, 1_200, 1654),
  m('Las Vegas', 'NV', 400800, 73845, 0.5, 1_400, 1518),
  m('Detroit', 'MI', 237100, 75123, 1.39, 1_600, 1162),
  m('Atlanta', 'GA', 335100, 86338, 0.82, 2_300, 1563),
  m('Miami', 'FL', 405600, 73481, 0.88, 5_600, 1770),
  m('Tampa', 'FL', 306100, 71254, 0.78, 4_500, 1497),
  m('Orlando', 'FL', 338500, 75611, 0.77, 4_100, 1659),
  m('Minneapolis', 'MN', 354400, 98180, 1.08, 2_400, 1396),
  m('Baltimore', 'MD', 373300, 97300, 1.03, 1_800, 1562),
  m('St Louis', 'MO', 232100, 78225, 1.22, 2_500, 1073),
  m('Pittsburgh', 'PA', 204500, 73942, 1.36, 1_300, 1011),
  m('Cincinnati', 'OH', 240200, 79490, 1.21, 1_400, 1047),
  m('Kansas City', 'MO', 265400, 81927, 1.1, 2_600, 1201),
  m('Sacramento', 'CA', 559000, 93986, 0.76, 1_500, 1729),
  m('Salt Lake City', 'UT', 478200, 95045, 0.56, 1_500, 1486),
  m('Raleigh', 'NC', 381000, 96066, 0.71, 2_000, 1459),
  m('Richmond', 'VA', 325800, 84405, 0.74, 1_800, 1388),
  m('Milwaukee', 'WI', 283800, 76404, 1.55, 1_400, 1105),
  m('Oklahoma City', 'OK', 214700, 70499, 0.96, 3_800, 1081),
  m('Louisville', 'KY', 236400, 71737, 0.81, 2_000, 1064),
  m('Providence', 'RI', 385900, 85646, 1.24, 1_900, 1236),
];

export const metroBySlug = (slug: string): MetroData | undefined =>
  METROS.find((x) => x.slug === slug);

export const metrosByState = (code: string): MetroData[] =>
  METROS.filter((x) => x.stateCode === code);

export const unverifiedMetros = (): MetroData[] => METROS.filter((x) => !x.verified);
