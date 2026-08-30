/* Tool 1 — Amortization + extra payment simulator.
   Field specs and the model live together so the page (which needs defaults
   to render initial HTML) and the client island (which needs compute) read
   from one source and cannot drift. */
import { amortize, byYear, pmt } from '@kit/calc/finance';
import type { FieldSpec, Values } from '@kit/calc/url-state';

export const FIELDS: FieldSpec[] = [
  { key: 'loan',  type: 'number', default: 400_000, min: 1_000,  max: 10_000_000, dp: 0 },
  { key: 'rate',  type: 'number', default: 6.5,     min: 0,      max: 25,         dp: 3 },
  { key: 'term',  type: 'number', default: 30,      min: 1,      max: 50,         dp: 0 },
  { key: 'extra', type: 'number', default: 0,       min: 0,      max: 50_000,     dp: 0 },
  { key: 'annual',type: 'number', default: 0,       min: 0,      max: 500_000,    dp: 0 },
  { key: 'lump',  type: 'number', default: 0,       min: 0,      max: 5_000_000,  dp: 0 },
  { key: 'lumpm', type: 'number', default: 12,      min: 1,      max: 600,        dp: 0 },
];

export const D = FIELDS.reduce<Record<string, number>>(
  (m, f) => ((m[f.key] = f.default as number), m), {});

export interface AmortModel {
  monthlyPayment: number;
  payoffMonths: number;
  payoffDateMonths: number;
  totalInterest: number;
  totalPaid: number;
  /** baseline with no extra payments, for the comparison */
  baseInterest: number;
  baseMonths: number;
  interestSaved: number;
  monthsSaved: number;
  hasExtra: boolean;
  years: ReturnType<typeof byYear>;
  baseBalances: number[];
  extraBalances: number[];
  schedule: ReturnType<typeof amortize>['schedule'];
}

export function compute(v: Values): AmortModel {
  const loan = Number(v.loan) || 0;
  const rate = Number(v.rate) || 0;
  const termMonths = Math.round((Number(v.term) || 1) * 12);
  const extraMonthly = Number(v.extra) || 0;
  const extraAnnual = Number(v.annual) || 0;
  const lumpSum = Number(v.lump) || 0;
  const lumpSumMonth = Math.round(Number(v.lumpm) || 0);

  const base = amortize({ principal: loan, annualPct: rate, termMonths });
  const hasExtra = extraMonthly > 0 || extraAnnual > 0 || lumpSum > 0;
  const withExtra = hasExtra
    ? amortize({ principal: loan, annualPct: rate, termMonths, extraMonthly, extraAnnual, lumpSum, lumpSumMonth })
    : base;

  // Balance series sampled yearly — 360 points per line is more resolution
  // than a 680px-wide chart can show, and costs paint time for nothing.
  const yearly = (schedule: typeof base.schedule, years: number) => {
    const out: number[] = [loan];
    for (let y = 1; y <= years; y++) {
      const row = schedule[y * 12 - 1];
      out.push(row ? row.balance : 0);
    }
    return out;
  };
  const spanYears = Math.ceil(base.payoffMonths / 12);

  return {
    monthlyPayment: pmt(rate, termMonths, loan),
    payoffMonths: withExtra.payoffMonths,
    payoffDateMonths: withExtra.payoffMonths,
    totalInterest: withExtra.totalInterest,
    totalPaid: withExtra.totalPaid,
    baseInterest: base.totalInterest,
    baseMonths: base.payoffMonths,
    interestSaved: base.totalInterest - withExtra.totalInterest,
    monthsSaved: base.payoffMonths - withExtra.payoffMonths,
    hasExtra,
    years: byYear(withExtra.schedule),
    baseBalances: yearly(base.schedule, spanYears),
    extraBalances: yearly(withExtra.schedule, spanYears),
    schedule: withExtra.schedule,
  };
}
