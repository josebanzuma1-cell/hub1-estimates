import { transferTaxOn } from '@data/types';
/* Tool 5 — Closing cost estimator.
   Broken into the four buckets a Loan Estimate actually uses, because the
   useful question is never "what's the total" — it's "which of these can I
   negotiate". Lender fees and title are shoppable; government charges and
   prepaid items are not. */
import type { FieldSpec, Values } from '@kit/calc/url-state';
import type { StateData } from '@data/types';

export const FIELDS: FieldSpec[] = [
  { key: 'price',  type: 'number', default: 400_000, min: 10_000, max: 20_000_000, dp: 0 },
  { key: 'down',   type: 'number', default: 20,      min: 0,      max: 100,        dp: 2 },
  { key: 'orig',   type: 'number', default: 0.75,    min: 0,      max: 5,          dp: 3 },
  { key: 'points', type: 'number', default: 0,       min: 0,      max: 5,          dp: 3 },
  { key: 'rate',   type: 'number', default: 6.5,     min: 0,      max: 25,         dp: 3 },
  { key: 'owners', type: 'bool',   default: true },
  { key: 'st',     type: 'text',   default: '' },
];

export const D = FIELDS.reduce<Record<string, number | string | boolean>>(
  (m, f) => ((m[f.key] = f.default), m), {});

export interface CostLine { label: string; amount: number; shoppable: boolean; note?: string }
export interface CCModel {
  loan: number;
  downPayment: number;
  lenderTotal: number;
  titleTotal: number;
  govTotal: number;
  prepaidTotal: number;
  total: number;
  totalPct: number;
  cashToClose: number;
  shoppableTotal: number;
  lender: CostLine[];
  title: CostLine[];
  gov: CostLine[];
  prepaid: CostLine[];
  transferTaxApplies: boolean;
}

/** Owner's title premium — a smoothed national approximation, not a rate table.
 *  Real premiums are filed per state and several states regulate them outright,
 *  so this is deliberately labelled an estimate everywhere it appears. */
const ownersPremium = (price: number): number =>
  Math.round(Math.max(400, 550 + price * 0.0042));

const lendersPremium = (loan: number): number =>
  Math.round(Math.max(300, 300 + loan * 0.0013));

export function makeCompute(state: StateData | null) {
  return function compute(v: Values): CCModel {
    const price = Number(v.price) || 0;
    const downPct = Number(v.down) || 0;
    const origPct = Number(v.orig) || 0;
    const pointsPct = Number(v.points) || 0;
    const rate = Number(v.rate) || 0;
    const wantOwners = Boolean(v.owners);

    const downPayment = price * (downPct / 100);
    const loan = Math.max(0, price - downPayment);

    const lender: CostLine[] = [
      { label: 'Origination fee', amount: loan * (origPct / 100), shoppable: false, note: 'Set by the lender you choose — compare across lenders, not within one.' },
      { label: 'Discount points', amount: loan * (pointsPct / 100), shoppable: false, note: 'Optional prepaid interest to buy the rate down.' },
      { label: 'Underwriting & processing', amount: 995, shoppable: false },
      { label: 'Appraisal', amount: 600, shoppable: false, note: 'Ordered by the lender; you cannot shop it.' },
      { label: 'Credit report & verifications', amount: 120, shoppable: false },
      { label: 'Flood certification', amount: 25, shoppable: false },
    ].filter((l) => l.amount > 0);

    const title: CostLine[] = [
      { label: "Lender's title policy", amount: lendersPremium(loan), shoppable: true, note: 'Required by the lender. Protects them, not you.' },
      ...(wantOwners ? [{ label: "Owner's title policy", amount: ownersPremium(price), shoppable: true, note: 'Optional but strongly advised — this is the one that protects you.' }] : []),
      { label: 'Settlement / escrow fee', amount: 750, shoppable: true },
      { label: 'Title search & exam', amount: 350, shoppable: true },
      ...(state?.attorneyState ? [{ label: 'Closing attorney', amount: state.attorneyFee, shoppable: true, note: 'Customarily required in this state.' }] : []),
    ];

    /* The buyer's share. 'split' is a statutory half — Maine, New Hampshire
       and Delaware divide it by law — while 'negotiable' is custom, and shown
       as a half because that is what usually happens. */
    const paidBy = state?.transferTax.paidBy;
    const buyerPaysTransfer = paidBy === 'buyer' || paidBy === 'split' || paidBy === 'negotiable';
    const transferShare = paidBy === 'split' || paidBy === 'negotiable' ? 0.5 : 1;
    const transferTax = state && buyerPaysTransfer
      ? transferTaxOn(price, state.transferTax) * transferShare
      : 0;

    const gov: CostLine[] = [
      { label: 'Recording fees', amount: state?.recordingFee ?? 125, shoppable: false },
      ...(transferTax > 0 ? [{
        label: 'Transfer / deed tax',
        amount: transferTax,
        shoppable: false,
        note: paidBy === 'split'
          ? 'Divided equally between buyer and seller by statute — the buyer half is shown.'
          : paidBy === 'negotiable'
            ? 'Customarily split — shown here as the buyer half. Always negotiable.'
            : 'Customarily paid by the buyer in this state.',
      }] : []),
    ];

    // Prepaid items are funding an account, not paying a fee.
    const insuranceAnnual = state?.insuranceAnnual ?? 1_800;
    const annualTax = price * ((state?.propertyTaxPct ?? 1.0) / 100);
    const prepaid: CostLine[] = [
      { label: 'Prepaid interest', amount: (loan * (rate / 100) / 365) * 15, shoppable: false, note: 'Interest from closing to the end of the month — averages about 15 days.' },
      { label: 'Homeowners insurance (12 months)', amount: insuranceAnnual, shoppable: true, note: 'Shop this separately; premiums vary far more than lender fees.' },
      { label: 'Insurance escrow cushion (2 months)', amount: insuranceAnnual / 6, shoppable: false },
      { label: 'Property tax escrow (4 months)', amount: annualTax / 3, shoppable: false, note: 'Refunded to you if the loan is paid off or sold.' },
    ];

    const sum = (a: CostLine[]) => a.reduce((t, l) => t + l.amount, 0);
    const lenderTotal = sum(lender), titleTotal = sum(title);
    const govTotal = sum(gov), prepaidTotal = sum(prepaid);
    const total = lenderTotal + titleTotal + govTotal + prepaidTotal;

    return {
      loan, downPayment,
      lenderTotal, titleTotal, govTotal, prepaidTotal, total,
      totalPct: price > 0 ? (total / price) * 100 : 0,
      cashToClose: total + downPayment,
      shoppableTotal: [...lender, ...title, ...gov, ...prepaid].filter((l) => l.shoppable).reduce((t, l) => t + l.amount, 0),
      lender, title, gov, prepaid,
      transferTaxApplies: transferTax > 0,
    };
  };
}
