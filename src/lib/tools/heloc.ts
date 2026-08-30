/* Tool 7 — HELOC vs cash-out refinance.
   The decision hinges on one thing most comparisons bury: a cash-out refinance
   re-prices your entire balance at today's rate, while a HELOC leaves the first
   mortgage alone and prices only the new money. If you hold a 3% first
   mortgage, borrowing $50,000 via cash-out at 7% effectively costs you 7% on
   the other $300,000 as well. That is the number this tool puts in front. */
import { pmt, balanceAfter } from '@kit/calc/finance';
import type { FieldSpec, Values } from '@kit/calc/url-state';

export const FIELDS: FieldSpec[] = [
  { key: 'value',  type: 'number', default: 550_000, min: 10_000, max: 20_000_000, dp: 0 },
  { key: 'bal',    type: 'number', default: 300_000, min: 0,      max: 20_000_000, dp: 0 },
  { key: 'crate',  type: 'number', default: 3.25,    min: 0,      max: 25,         dp: 3 },
  { key: 'cleft',  type: 'number', default: 288,     min: 1,      max: 600,        dp: 0 },
  { key: 'cash',   type: 'number', default: 60_000,  min: 0,      max: 5_000_000,  dp: 0 },
  { key: 'hrate',  type: 'number', default: 8.25,    min: 0,      max: 30,         dp: 3 },
  { key: 'hterm',  type: 'number', default: 240,     min: 12,     max: 480,        dp: 0 },
  { key: 'hcost',  type: 'number', default: 500,     min: 0,      max: 50_000,     dp: 0 },
  { key: 'rrate',  type: 'number', default: 6.75,    min: 0,      max: 25,         dp: 3 },
  { key: 'rterm',  type: 'number', default: 360,     min: 12,     max: 600,        dp: 0 },
  { key: 'rcost',  type: 'number', default: 8_000,   min: 0,      max: 200_000,    dp: 0 },
  { key: 'years',  type: 'number', default: 10,      min: 1,      max: 40,         dp: 0 },
];

export const D = FIELDS.reduce<Record<string, number>>(
  (m, f) => ((m[f.key] = f.default as number), m), {});

export interface HelocModel {
  ltvAfter: number;
  maxCashAt80: number;
  exceeds80: boolean;
  currentPayment: number;
  helocPayment: number;
  helocTotalMonthly: number;
  refiPayment: number;
  refiPrincipal: number;
  blendedRateHeloc: number;
  helocOutlay: number;
  refiOutlay: number;
  helocBalanceEnd: number;
  refiBalanceEnd: number;
  helocPosition: number;
  refiPosition: number;
  advantage: number;
  helocWins: boolean;
  repricedAmount: number;
  repricingCost: number;
  months: number;
  helocSeries: number[];
  refiSeries: number[];
}

export function compute(v: Values): HelocModel {
  const value = Number(v.value) || 0;
  const bal = Number(v.bal) || 0;
  const crate = Number(v.crate) || 0;
  const cleft = Math.max(1, Math.round(Number(v.cleft) || 1));
  const cash = Number(v.cash) || 0;
  const hrate = Number(v.hrate) || 0;
  const hterm = Math.max(1, Math.round(Number(v.hterm) || 1));
  const hcost = Number(v.hcost) || 0;
  const rrate = Number(v.rrate) || 0;
  const rterm = Math.max(1, Math.round(Number(v.rterm) || 1));
  const rcost = Number(v.rcost) || 0;
  const months = Math.round((Number(v.years) || 1) * 12);

  const currentPayment = pmt(crate, cleft, bal);

  // HELOC: first mortgage untouched, second lien for the cash.
  const helocPrincipal = cash;
  const helocPayment = pmt(hrate, hterm, helocPrincipal);
  const helocTotalMonthly = currentPayment + helocPayment;

  // Cash-out: one new loan covering the old balance, the cash, and the costs.
  const refiPrincipal = bal + cash + rcost;
  const refiPayment = pmt(rrate, rterm, refiPrincipal);

  // Net position at each point: cash spent so far plus debt still owed.
  const helocSeries: number[] = [];
  const refiSeries: number[] = [];
  for (let m = 0; m <= months; m += 3) {
    const hDebt = balanceAfter(crate, cleft, bal, Math.min(m, cleft))
      + balanceAfter(hrate, hterm, helocPrincipal, Math.min(m, hterm));
    const rDebt = balanceAfter(rrate, rterm, refiPrincipal, Math.min(m, rterm));
    helocSeries.push(hcost + helocTotalMonthly * m + hDebt);
    refiSeries.push(refiPayment * m + rDebt);
  }

  const helocBalanceEnd = balanceAfter(crate, cleft, bal, Math.min(months, cleft))
    + balanceAfter(hrate, hterm, helocPrincipal, Math.min(months, hterm));
  const refiBalanceEnd = balanceAfter(rrate, rterm, refiPrincipal, Math.min(months, rterm));

  const helocOutlay = hcost + helocTotalMonthly * months;
  const refiOutlay = refiPayment * months;
  const helocPosition = helocOutlay + helocBalanceEnd;
  const refiPosition = refiOutlay + refiBalanceEnd;

  const totalDebt = bal + cash;
  return {
    ltvAfter: value > 0 ? (totalDebt / value) * 100 : 0,
    maxCashAt80: Math.max(0, value * 0.8 - bal),
    exceeds80: value > 0 && totalDebt / value > 0.8,
    currentPayment, helocPayment, helocTotalMonthly,
    refiPayment, refiPrincipal,
    blendedRateHeloc: totalDebt > 0 ? (bal * crate + cash * hrate) / totalDebt : 0,
    helocOutlay, refiOutlay, helocBalanceEnd, refiBalanceEnd,
    helocPosition, refiPosition,
    advantage: refiPosition - helocPosition,
    helocWins: helocPosition < refiPosition,
    repricedAmount: bal,
    // What re-pricing the existing balance costs in year-one interest alone.
    repricingCost: bal * ((rrate - crate) / 100),
    months, helocSeries, refiSeries,
  };
}
