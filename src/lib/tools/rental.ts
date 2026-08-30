/* Tool 6 — Rental property analyzer.
   Cap rate, cash-on-cash, DSCR and a ten-year pro forma.

   The distinction that matters and that most calculators blur: cap rate is a
   property metric and ignores financing entirely, while cash-on-cash is an
   investor metric and depends completely on it. The same building has one cap
   rate and as many cash-on-cash returns as there are ways to finance it.

   Maintenance and capex are taken as a share of rent, not of price. Tying them
   to price makes an expensive building in a cheap-rent market look artificially
   costly to run, which is backwards. */
import { pmt, balanceAfter, irr } from '@kit/calc/finance';
import type { FieldSpec, Values } from '@kit/calc/url-state';

export const FIELDS: FieldSpec[] = [
  { key: 'price',  type: 'number', default: 265_000, min: 10_000, max: 50_000_000, dp: 0 },
  { key: 'down',   type: 'number', default: 25,      min: 0,      max: 100,        dp: 2 },
  { key: 'rate',   type: 'number', default: 7.25,    min: 0,      max: 25,         dp: 3 },
  { key: 'term',   type: 'number', default: 30,      min: 1,      max: 50,         dp: 0 },
  { key: 'close',  type: 'number', default: 6_500,   min: 0,      max: 500_000,    dp: 0 },
  { key: 'rehab',  type: 'number', default: 5_000,   min: 0,      max: 2_000_000,  dp: 0 },
  { key: 'rent',   type: 'number', default: 2_600,   min: 0,      max: 200_000,    dp: 0 },
  { key: 'other',  type: 'number', default: 0,       min: 0,      max: 50_000,     dp: 0 },
  { key: 'vac',    type: 'number', default: 6,       min: 0,      max: 50,         dp: 1 },
  { key: 'tax',    type: 'number', default: 1.2,     min: 0,      max: 10,         dp: 3 },
  { key: 'ins',    type: 'number', default: 1_900,   min: 0,      max: 200_000,    dp: 0 },
  { key: 'hoa',    type: 'number', default: 0,       min: 0,      max: 5_000,      dp: 0 },
  { key: 'util',   type: 'number', default: 0,       min: 0,      max: 10_000,     dp: 0 },
  { key: 'maint',  type: 'number', default: 8,       min: 0,      max: 40,         dp: 1 },
  { key: 'capex',  type: 'number', default: 6,       min: 0,      max: 40,         dp: 1 },
  { key: 'mgmt',   type: 'number', default: 8,       min: 0,      max: 25,         dp: 1 },
  { key: 'rgrow',  type: 'number', default: 3,       min: -10,    max: 20,         dp: 2 },
  { key: 'egrow',  type: 'number', default: 3.5,     min: -10,    max: 20,         dp: 2 },
  { key: 'appr',   type: 'number', default: 3,       min: -10,    max: 20,         dp: 2 },
  { key: 'sell',   type: 'number', default: 7,       min: 0,      max: 20,         dp: 2 },
  { key: 'hold',   type: 'number', default: 10,      min: 1,      max: 40,         dp: 0 },
];

export const D = FIELDS.reduce<Record<string, number>>(
  (m, f) => ((m[f.key] = f.default as number), m), {});

export interface ProFormaYear {
  year: number;
  grossRent: number;
  vacancy: number;
  effectiveIncome: number;
  operatingExpenses: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
}

export interface RentalModel {
  totalCashInvested: number;
  loan: number;
  monthlyDebtService: number;
  grossRentAnnual: number;
  effectiveIncome: number;
  operatingExpenses: number;
  noi: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  capRate: number;
  cashOnCash: number;
  dscr: number;
  onePercentRule: number;
  grm: number;
  expenseRatio: number;
  breakEvenOccupancy: number;
  proForma: ProFormaYear[];
  saleProceeds: number;
  totalProfit: number;
  irrPct: number | null;
  equitySeries: number[];
  cashFlowSeries: number[];
}

export function compute(v: Values): RentalModel {
  const price = Number(v.price) || 0;
  const downPct = Number(v.down) || 0;
  const rate = Number(v.rate) || 0;
  const termMonths = Math.round((Number(v.term) || 1) * 12);
  const closing = Number(v.close) || 0;
  const rehab = Number(v.rehab) || 0;
  const rent0 = Number(v.rent) || 0;
  const other = Number(v.other) || 0;
  const vacPct = Number(v.vac) || 0;
  const taxPct = Number(v.tax) || 0;
  const insAnnual = Number(v.ins) || 0;
  const hoa = Number(v.hoa) || 0;
  const util = Number(v.util) || 0;
  const maintPct = Number(v.maint) || 0;
  const capexPct = Number(v.capex) || 0;
  const mgmtPct = Number(v.mgmt) || 0;
  const rgrow = Number(v.rgrow) || 0;
  const egrow = Number(v.egrow) || 0;
  const appr = Number(v.appr) || 0;
  const sellPct = Number(v.sell) || 0;
  const hold = Math.max(1, Math.round(Number(v.hold) || 1));

  const downPayment = price * (downPct / 100);
  const loan = Math.max(0, price - downPayment);
  const monthlyDebtService = pmt(rate, termMonths, loan);
  const totalCashInvested = downPayment + closing + rehab;

  const proForma: ProFormaYear[] = [];
  const equitySeries: number[] = [];
  const cashFlowSeries: number[] = [];
  // Year 0 is the cash outlay; later years are cash flow; the final year adds
  // net sale proceeds. That vector is what IRR is computed from.
  const cashflows: number[] = [-totalCashInvested];

  let propertyValue = price;
  let year1 = { noi: 0, effectiveIncome: 0, operatingExpenses: 0, grossRent: 0, debtService: 0, cashFlow: 0 };

  for (let y = 1; y <= hold; y++) {
    const growth = Math.pow(1 + rgrow / 100, y - 1);
    const expGrowth = Math.pow(1 + egrow / 100, y - 1);

    const grossRent = (rent0 * 12 + other * 12) * growth;
    const vacancy = grossRent * (vacPct / 100);
    const effectiveIncome = grossRent - vacancy;

    // Property tax follows assessed value; the rest follow general inflation.
    const propertyTax = propertyValue * (taxPct / 100);
    const fixed = (insAnnual + hoa * 12 + util * 12) * expGrowth;
    // Variable costs are a share of collected rent, so vacancy reduces them too.
    const variable = effectiveIncome * ((maintPct + capexPct + mgmtPct) / 100);
    const operatingExpenses = propertyTax + fixed + variable;

    const noi = effectiveIncome - operatingExpenses;
    const debtService = monthlyDebtService * 12;
    const cashFlow = noi - debtService;

    const loanBalance = balanceAfter(rate, termMonths, loan, Math.min(y * 12, termMonths));
    const equity = propertyValue - loanBalance;

    proForma.push({
      year: y, grossRent, vacancy, effectiveIncome,
      operatingExpenses, noi, debtService, cashFlow,
      propertyValue, loanBalance, equity,
    });
    equitySeries.push(equity);
    cashFlowSeries.push(cashFlow);

    if (y === 1) year1 = { noi, effectiveIncome, operatingExpenses, grossRent, debtService, cashFlow };

    cashflows.push(cashFlow);
    propertyValue *= 1 + appr / 100;
  }

  const finalRow = proForma[proForma.length - 1];
  const saleProceeds = finalRow.propertyValue * (1 - sellPct / 100) - finalRow.loanBalance;
  cashflows[cashflows.length - 1] += saleProceeds;

  const totalCashFlow = proForma.reduce((t, r) => t + r.cashFlow, 0);
  const annualDebtService = monthlyDebtService * 12;

  return {
    totalCashInvested, loan, monthlyDebtService,
    grossRentAnnual: year1.grossRent,
    effectiveIncome: year1.effectiveIncome,
    operatingExpenses: year1.operatingExpenses,
    noi: year1.noi,
    annualCashFlow: year1.cashFlow,
    monthlyCashFlow: year1.cashFlow / 12,
    capRate: price > 0 ? (year1.noi / price) * 100 : 0,
    cashOnCash: totalCashInvested > 0 ? (year1.cashFlow / totalCashInvested) * 100 : 0,
    dscr: annualDebtService > 0 ? year1.noi / annualDebtService : Infinity,
    onePercentRule: price > 0 ? (rent0 / price) * 100 : 0,
    grm: year1.grossRent > 0 ? price / year1.grossRent : 0,
    expenseRatio: year1.effectiveIncome > 0 ? (year1.operatingExpenses / year1.effectiveIncome) * 100 : 0,
    // Occupancy at which NOI exactly covers debt service.
    breakEvenOccupancy: year1.grossRent > 0
      ? ((annualDebtService + year1.operatingExpenses) / year1.grossRent) * 100
      : 0,
    proForma, saleProceeds,
    totalProfit: totalCashFlow + saleProceeds - totalCashInvested,
    irrPct: irr(cashflows),
    equitySeries, cashFlowSeries,
  };
}
