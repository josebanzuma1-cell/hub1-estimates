/* Tool 4 — Home affordability.
   Solves for price rather than testing one, because "what can I afford" is the
   actual query. Two DTI limits bind: the front-end ratio on housing alone and
   the back-end ratio on all debt. Whichever binds first sets the answer, and
   which one binds is itself useful information — it tells you whether to save
   more or pay down a car loan. */
import { pmt } from '@kit/calc/finance';
import type { FieldSpec, Values } from '@kit/calc/url-state';

export const FIELDS: FieldSpec[] = [
  { key: 'inc',   type: 'number', default: 110_000, min: 0, max: 10_000_000, dp: 0 },
  { key: 'debts', type: 'number', default: 650,     min: 0, max: 100_000,    dp: 0 },
  { key: 'down',  type: 'number', default: 80_000,  min: 0, max: 10_000_000, dp: 0 },
  { key: 'rate',  type: 'number', default: 6.5,     min: 0, max: 25,         dp: 3 },
  { key: 'term',  type: 'number', default: 30,      min: 1, max: 50,         dp: 0 },
  { key: 'tax',   type: 'number', default: 1.1,     min: 0, max: 10,         dp: 3 },
  { key: 'ins',   type: 'number', default: 1_800,   min: 0, max: 100_000,    dp: 0 },
  { key: 'hoa',   type: 'number', default: 0,       min: 0, max: 5_000,      dp: 0 },
  { key: 'front', type: 'number', default: 28,      min: 5, max: 60,         dp: 1 },
  { key: 'back',  type: 'number', default: 43,      min: 5, max: 70,         dp: 1 },
];

export const D = FIELDS.reduce<Record<string, number>>(
  (m, f) => ((m[f.key] = f.default as number), m), {});

export interface AffordModel {
  maxPrice: number;
  maxLoan: number;
  maxPiti: number;
  principalInterest: number;
  monthlyTax: number;
  monthlyIns: number;
  monthlyPmi: number;
  hoa: number;
  totalPiti: number;
  downPct: number;
  needsPmi: boolean;
  /** true when the answer is capped at exactly 80% LTV to avoid PMI */
  pmiBoundary: boolean;
  bindingLimit: 'front' | 'back';
  frontCap: number;
  backCap: number;
  actualFrontDti: number;
  actualBackDti: number;
  incomeNeededFor: (price: number) => number;
}

const PMI_ANNUAL_PCT = 0.6; // typical for 5-15% down at average credit

export function compute(v: Values): AffordModel {
  const income = Number(v.inc) || 0;
  const debts = Number(v.debts) || 0;
  const down = Number(v.down) || 0;
  const rate = Number(v.rate) || 0;
  const termMonths = Math.round((Number(v.term) || 1) * 12);
  const taxPct = Number(v.tax) || 0;
  const insAnnual = Number(v.ins) || 0;
  const hoa = Number(v.hoa) || 0;
  const frontPct = Number(v.front) || 28;
  const backPct = Number(v.back) || 43;

  const monthlyIncome = income / 12;
  const frontCap = monthlyIncome * (frontPct / 100);
  const backCap = Math.max(0, monthlyIncome * (backPct / 100) - debts);
  const maxPiti = Math.min(frontCap, backCap);
  const bindingLimit: 'front' | 'back' = frontCap <= backCap ? 'front' : 'back';

  // Payment per dollar borrowed. Solving for price is then algebraic.
  const k = pmt(rate, termMonths, 1);
  const monthlyIns = insAnnual / 12;

  const solve = (pmiPct: number) => {
    // PITI = (price - down)*k + price*tax/12 + ins/12 + hoa + (price - down)*pmi/12
    const perPrice = k + taxPct / 100 / 12 + pmiPct / 100 / 12;
    const constant = maxPiti + down * k + down * (pmiPct / 100 / 12) - monthlyIns - hoa;
    return perPrice > 0 ? Math.max(0, constant / perPrice) : 0;
  };

  // PMI is a step function of the price, so this is a small fixed-point problem
  // with three outcomes rather than two.
  const pmiFreePrice = down / 0.2; // the most you can buy at exactly 80% LTV
  const priceNoPmi = solve(0);
  let maxPrice: number;
  let needsPmi: boolean;
  let pmiBoundary = false;

  if (priceNoPmi <= pmiFreePrice) {
    // Comfortably inside 20% down. No PMI, no conflict.
    maxPrice = priceNoPmi;
    needsPmi = false;
  } else {
    const pricePmi = solve(PMI_ANNUAL_PCT);
    if (pricePmi > pmiFreePrice) {
      // Even carrying PMI you can afford past the 80% LTV line.
      maxPrice = pricePmi;
      needsPmi = true;
    } else {
      // The interesting case: with PMI you cannot afford past the boundary, but
      // the boundary itself is affordable without it. Buying at exactly 80% LTV
      // is the correct answer, and it is worth telling the user about.
      maxPrice = pmiFreePrice;
      needsPmi = false;
      pmiBoundary = true;
    }
  }

  const maxLoan = Math.max(0, maxPrice - down);
  const principalInterest = maxLoan * k;
  const monthlyTax = (maxPrice * (taxPct / 100)) / 12;
  const monthlyPmi = needsPmi ? (maxLoan * (PMI_ANNUAL_PCT / 100)) / 12 : 0;
  const totalPiti = principalInterest + monthlyTax + monthlyIns + monthlyPmi + hoa;

  return {
    maxPrice, maxLoan, maxPiti,
    principalInterest, monthlyTax, monthlyIns, monthlyPmi, hoa, totalPiti,
    downPct: maxPrice > 0 ? (down / maxPrice) * 100 : 0,
    needsPmi, pmiBoundary, bindingLimit, frontCap, backCap,
    actualFrontDti: monthlyIncome > 0 ? (totalPiti / monthlyIncome) * 100 : 0,
    actualBackDti: monthlyIncome > 0 ? ((totalPiti + debts) / monthlyIncome) * 100 : 0,
    incomeNeededFor: (price: number) => {
      const loan = Math.max(0, price - down);
      const pmi = down / price < 0.2 ? (loan * (PMI_ANNUAL_PCT / 100)) / 12 : 0;
      const piti = loan * k + (price * (taxPct / 100)) / 12 + monthlyIns + hoa + pmi;
      return Math.max(piti / (frontPct / 100), (piti + debts) / (backPct / 100)) * 12;
    },
  };
}
