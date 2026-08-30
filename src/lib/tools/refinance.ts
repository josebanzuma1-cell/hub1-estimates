/* Tool 2 — Refinance break-even.
   Two break-even numbers, deliberately. The one every competitor shows is
   costs ÷ monthly saving, which is wrong whenever the new term is longer
   than the remaining term: a lower payment bought by restarting the clock
   is not a saving, it is deferral. The second number compares net position
   — cash paid plus remaining debt — month by month, so a reset term shows
   its real cost. */
import { pmt, balanceAfter } from '@kit/calc/finance';
import type { FieldSpec, Values } from '@kit/calc/url-state';

export const FIELDS: FieldSpec[] = [
  { key: 'bal',    type: 'number', default: 350_000, min: 1_000, max: 10_000_000, dp: 0 },
  { key: 'crate',  type: 'number', default: 7.25,    min: 0,     max: 25,         dp: 3 },
  { key: 'cleft',  type: 'number', default: 312,     min: 1,     max: 600,        dp: 0 },
  { key: 'nrate',  type: 'number', default: 5.875,   min: 0,     max: 25,         dp: 3 },
  { key: 'nterm',  type: 'number', default: 360,     min: 12,    max: 600,        dp: 0 },
  { key: 'costs',  type: 'number', default: 7_000,   min: 0,     max: 200_000,    dp: 0 },
  { key: 'roll',   type: 'bool',   default: false },
  { key: 'stay',   type: 'number', default: 7,       min: 1,     max: 40,         dp: 0 },
];

export const D = FIELDS.reduce<Record<string, number | string | boolean>>(
  (m, f) => ((m[f.key] = f.default), m), {});

export interface RefiModel {
  currentPayment: number;
  newPayment: number;
  monthlySaving: number;
  newPrincipal: number;
  simpleBreakEven: number;
  trueBreakEven: number;
  savingOverStay: number;
  interestKeep: number;
  interestRefi: number;
  lifetimeDelta: number;
  worthIt: boolean;
  resetsClock: boolean;
  positionDelta: number[];
  stayMonths: number;
}

export function compute(v: Values): RefiModel {
  const bal = Number(v.bal) || 0;
  const crate = Number(v.crate) || 0;
  const cleft = Math.max(1, Math.round(Number(v.cleft) || 1));
  const nrate = Number(v.nrate) || 0;
  const nterm = Math.max(1, Math.round(Number(v.nterm) || 1));
  const costs = Number(v.costs) || 0;
  const roll = Boolean(v.roll);
  const stayMonths = Math.round((Number(v.stay) || 1) * 12);

  const currentPayment = pmt(crate, cleft, bal);
  const newPrincipal = bal + (roll ? costs : 0);
  const newPayment = pmt(nrate, nterm, newPrincipal);
  const monthlySaving = currentPayment - newPayment;
  const cashAtClose = roll ? 0 : costs;

  // Simple break-even: months of saving needed to repay the cash you brought.
  const simpleBreakEven = monthlySaving > 0 ? cashAtClose / monthlySaving : Infinity;

  // True break-even: first month where the refinance leaves you better off on
  // (cash spent + debt still owed). Equity path, not just cash flow.
  const horizon = Math.max(stayMonths, Math.min(Math.max(cleft, nterm), 600));
  const positionDelta: number[] = [];
  let trueBreakEven = Infinity;
  for (let m = 0; m <= horizon; m++) {
    const keepOut = currentPayment * m + balanceAfter(crate, cleft, bal, Math.min(m, cleft));
    const refiOut = cashAtClose + newPayment * m + balanceAfter(nrate, nterm, newPrincipal, Math.min(m, nterm));
    const delta = keepOut - refiOut; // positive = refinancing is ahead
    if (m % 3 === 0) positionDelta.push(delta);
    if (trueBreakEven === Infinity && m > 0 && delta > 0) trueBreakEven = m;
  }

  const interestKeep = currentPayment * Math.min(stayMonths, cleft)
    - (bal - balanceAfter(crate, cleft, bal, Math.min(stayMonths, cleft)));
  const interestRefi = newPayment * Math.min(stayMonths, nterm)
    - (newPrincipal - balanceAfter(nrate, nterm, newPrincipal, Math.min(stayMonths, nterm)));

  const keepPos = currentPayment * stayMonths + balanceAfter(crate, cleft, bal, Math.min(stayMonths, cleft));
  const refiPos = cashAtClose + newPayment * stayMonths + balanceAfter(nrate, nterm, newPrincipal, Math.min(stayMonths, nterm));

  return {
    currentPayment, newPayment, monthlySaving, newPrincipal,
    simpleBreakEven, trueBreakEven,
    savingOverStay: keepPos - refiPos,
    interestKeep, interestRefi,
    lifetimeDelta: interestKeep - interestRefi,
    worthIt: trueBreakEven <= stayMonths,
    resetsClock: nterm > cleft,
    positionDelta, stayMonths,
  };
}
