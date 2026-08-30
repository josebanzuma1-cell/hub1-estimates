/* Tool 3 — Rent vs buy, as a net worth projection.
   The comparison only means something if both paths are given the same money.
   So: the renter starts with the down payment and closing costs invested, and
   whichever party has the cheaper month invests the difference. Net worth for
   the buyer is sale-adjusted equity plus any portfolio; for the renter it is
   the portfolio alone.

   Ignoring the opportunity cost of the down payment is the single biggest
   distortion in rent-vs-buy tools, and it always favours buying. */
import { pmt, balanceAfter, monthlyRate } from '@kit/calc/finance';
import type { FieldSpec, Values } from '@kit/calc/url-state';

export const FIELDS: FieldSpec[] = [
  { key: 'price',  type: 'number', default: 450_000, min: 20_000, max: 20_000_000, dp: 0 },
  { key: 'down',   type: 'number', default: 20,      min: 0,      max: 100,        dp: 2 },
  { key: 'rate',   type: 'number', default: 6.5,     min: 0,      max: 25,         dp: 3 },
  { key: 'term',   type: 'number', default: 30,      min: 1,      max: 50,         dp: 0 },
  { key: 'tax',    type: 'number', default: 1.1,     min: 0,      max: 10,         dp: 3 },
  { key: 'ins',    type: 'number', default: 1_800,   min: 0,      max: 100_000,    dp: 0 },
  { key: 'hoa',    type: 'number', default: 0,       min: 0,      max: 5_000,      dp: 0 },
  { key: 'maint',  type: 'number', default: 1.0,     min: 0,      max: 10,         dp: 2 },
  { key: 'close',  type: 'number', default: 3.0,     min: 0,      max: 15,         dp: 2 },
  { key: 'sell',   type: 'number', default: 7.0,     min: 0,      max: 20,         dp: 2 },
  { key: 'appr',   type: 'number', default: 3.5,     min: -10,    max: 20,         dp: 2 },
  { key: 'rent',   type: 'number', default: 2_400,   min: 100,    max: 100_000,    dp: 0 },
  { key: 'rgrow',  type: 'number', default: 3.0,     min: -10,    max: 20,         dp: 2 },
  { key: 'rins',   type: 'number', default: 18,      min: 0,      max: 1_000,      dp: 0 },
  { key: 'invest', type: 'number', default: 7.0,     min: -10,    max: 25,         dp: 2 },
  { key: 'years',  type: 'number', default: 10,      min: 1,      max: 40,         dp: 0 },
];

export const D = FIELDS.reduce<Record<string, number>>(
  (m, f) => ((m[f.key] = f.default as number), m), {});

export interface RvBModel {
  monthlyPayment: number;
  buyMonth1: number;
  rentMonth1: number;
  buyNetWorth: number;
  rentNetWorth: number;
  advantage: number;
  buyerWins: boolean;
  breakEvenYear: number | null;
  homeValueEnd: number;
  equityEnd: number;
  totalInterest: number;
  buySeries: number[];
  rentSeries: number[];
  years: number;
}

export function compute(v: Values): RvBModel {
  const price = Number(v.price) || 0;
  const downPct = Number(v.down) || 0;
  const rate = Number(v.rate) || 0;
  const termMonths = Math.round((Number(v.term) || 1) * 12);
  const taxPct = Number(v.tax) || 0;
  const insAnnual = Number(v.ins) || 0;
  const hoa = Number(v.hoa) || 0;
  const maintPct = Number(v.maint) || 0;
  const closePct = Number(v.close) || 0;
  const sellPct = Number(v.sell) || 0;
  const apprPct = Number(v.appr) || 0;
  const rent0 = Number(v.rent) || 0;
  const rgrowPct = Number(v.rgrow) || 0;
  const rins = Number(v.rins) || 0;
  const investPct = Number(v.invest) || 0;
  const years = Math.max(1, Math.round(Number(v.years) || 1));
  const horizon = years * 12;

  const downPayment = price * (downPct / 100);
  const loan = price - downPayment;
  const closingCosts = price * (closePct / 100);
  const monthlyPayment = pmt(rate, termMonths, loan);

  const mAppr = Math.pow(1 + apprPct / 100, 1 / 12);
  const mRentGrow = Math.pow(1 + rgrowPct / 100, 1 / 12);
  const mInvest = monthlyRate(investPct);

  // Renter's starting stake: exactly the cash the buyer handed over at closing.
  let rentPortfolio = downPayment + closingCosts;
  let buyPortfolio = 0;
  let homeValue = price;
  let rent = rent0;
  let totalInterest = 0;

  const buySeries: number[] = [];
  const rentSeries: number[] = [];
  let breakEvenYear: number | null = null;
  let buyMonth1 = 0;
  let rentMonth1 = 0;

  for (let m = 1; m <= horizon; m++) {
    const balance = balanceAfter(rate, termMonths, loan, Math.min(m, termMonths));
    const prevBalance = balanceAfter(rate, termMonths, loan, Math.min(m - 1, termMonths));
    totalInterest += Math.max(0, monthlyPayment - (prevBalance - balance));

    // Owning: P&I plus the carrying costs that scale with the property's value.
    const propertyTax = (homeValue * (taxPct / 100)) / 12;
    const insurance = insAnnual / 12;
    const maintenance = (homeValue * (maintPct / 100)) / 12;
    const buyCost = (m <= termMonths ? monthlyPayment : 0) + propertyTax + insurance + maintenance + hoa;
    const rentCost = rent + rins;

    if (m === 1) { buyMonth1 = buyCost; rentMonth1 = rentCost; }

    // Whoever pays less this month invests the difference. Same budget, both paths.
    const diff = buyCost - rentCost;
    if (diff > 0) rentPortfolio += diff;
    else buyPortfolio += -diff;

    rentPortfolio *= 1 + mInvest;
    buyPortfolio *= 1 + mInvest;
    homeValue *= mAppr;
    rent *= mRentGrow;

    // Net worth is measured as if you liquidated today, so selling costs count.
    const equity = homeValue * (1 - sellPct / 100) - balance;
    const buyNet = equity + buyPortfolio;
    const rentNet = rentPortfolio;

    if (m % 3 === 0 || m === horizon) { buySeries.push(buyNet); rentSeries.push(rentNet); }
    if (breakEvenYear === null && buyNet > rentNet) breakEvenYear = Math.round((m / 12) * 10) / 10;
  }

  const finalBalance = balanceAfter(rate, termMonths, loan, Math.min(horizon, termMonths));
  const equityEnd = homeValue * (1 - sellPct / 100) - finalBalance;
  const buyNetWorth = equityEnd + buyPortfolio;
  const rentNetWorth = rentPortfolio;

  return {
    monthlyPayment, buyMonth1, rentMonth1,
    buyNetWorth, rentNetWorth,
    advantage: buyNetWorth - rentNetWorth,
    buyerWins: buyNetWorth > rentNetWorth,
    breakEvenYear,
    homeValueEnd: homeValue,
    equityEnd,
    totalInterest,
    buySeries, rentSeries, years,
  };
}
