/* Sanity checks on the amortization engine.
   Run: node scripts/test-finance.mjs
   Node 23+ strips TypeScript types natively, so the source imports directly. */
import { pmt, amortize, balanceAfter, futureValue, irr } from '@kit/calc/finance';
import { STATES } from '../src/data/states.ts';
import { transferTaxOn, effectiveTransferRate } from '../src/data/types.ts';

let pass = 0, fail = 0;
const approx = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
function check(name, actual, expected, tol) {
  const ok = approx(actual, expected, tol);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      got ${actual}  expected ~${expected}`);
}
const ok = (n, cond) => check(n, cond ? 1 : 0, 1, 0);

// Known-good reference: $400,000 @ 6.5% / 30yr = $2,528.27/mo
check('pmt 400k 6.5% 30y', pmt(6.5, 360, 400000), 2528.27, 0.01);
// $200,000 @ 5% / 15yr = $1,581.59
check('pmt 200k 5% 15y', pmt(5, 180, 200000), 1581.59, 0.01);
// 0% loan amortises linearly
check('pmt 0% edge case', pmt(0, 120, 12000), 100, 0.001);

const base = amortize({ principal: 400000, annualPct: 6.5, termMonths: 360 });
check('schedule length', base.schedule.length, 360, 0);
check('final balance is zero', base.schedule.at(-1).balance, 0, 0.005);
check('total interest', base.totalInterest, 510178, 300);
// First payment split: interest = 400000 * 0.065/12
check('month 1 interest', base.schedule[0].interest, 2166.67, 0.01);
check('month 1 principal', base.schedule[0].principal, 361.60, 0.05);

// Extra payments must shorten the loan and cut interest
const extra = amortize({ principal: 400000, annualPct: 6.5, termMonths: 360, extraMonthly: 200 });
console.log(`\n  $200/mo extra -> payoff ${extra.payoffMonths} months (${(360 - extra.payoffMonths)} saved), interest saved ${Math.round(base.totalInterest - extra.totalInterest)}`);
check('extra shortens loan', extra.payoffMonths < 360 ? 1 : 0, 1, 0);
check('extra final balance zero', extra.schedule.at(-1).balance, 0, 0.005);
check('extra never overshoots', extra.schedule.every(r => r.balance >= -0.005) ? 1 : 0, 1, 0);

// Sum of principal + extra across the schedule must equal the original loan
const principalSum = extra.schedule.reduce((a, r) => a + r.principal + r.extra, 0);
check('principal sums to loan', principalSum, 400000, 0.5);

// balanceAfter closed form must agree with the iterative schedule
check('balanceAfter agrees @ m120', balanceAfter(6.5, 360, 400000, 120), base.schedule[119].balance, 0.5);

// Payment below monthly interest must not loop forever or go negative
const absurd = amortize({ principal: 400000, annualPct: 25, termMonths: 12 });
check('absurd input terminates', absurd.schedule.length <= 1200 ? 1 : 0, 1, 0);

check('futureValue 0%', futureValue(0, 12, 100, 0), 1200, 0.001);
check('irr simple', irr([-1000, 500, 500, 200]), 11.16, 0.05);


/* ---------------- transfer taxes ---------------- */
/* Four of the five errors this pass found were caused by storing a schedule as
   a single percentage. These pin the shape, not just the number. */
const tt = (c) => STATES.find((s) => s.code === c).transferTax;
const on = (c, p) => transferTaxOn(p, tt(c));
const rate = (c, p) => effectiveTransferRate(p, tt(c));

check('tt: 17 states have a verified schedule',
  STATES.filter((s) => s.transferTax.verified).length, 17, 0);
check('tt: 15 states levy none', STATES.filter((s) => s.transferTax.tiers === null).length, 15, 0);
check('tt: a state with no tax owes nothing', on('TX', 400_000), 0);

// North Carolina was simply the wrong number — $2.00 per $2,000 is 0.10%.
check('tt: North Carolina is 0.10%', rate('NC', 400_000), 0.10, 0.001);
check('tt: and that is $400 on a $400,000 sale', on('NC', 400_000), 400, 0.5);

/* Vermont is marginal: 0.5% on the first $100,000, 1.25% above. Storing the
   top tier flat overstated the tax on every sale. */
check('tt: Vermont is 0.5% at $50,000', rate('VT', 50_000), 0.50, 0.001);
check('tt: Vermont blends to 1.06% at $400,000', rate('VT', 400_000), 1.0625, 0.001);
ok('tt: Vermont never reaches its top rate outright', rate('VT', 400_000) < 1.25);

/* Washington and DC are CLIFFS — the band's rate applies to the whole price,
   so the effective rate jumps rather than blending. Storing WA's second band
   as a flat rate overstated every sale below $525,000. */
check('tt: Washington is 1.10% below the threshold', rate('WA', 500_000), 1.10, 0.001);
check('tt: Washington is 1.28% above it', rate('WA', 600_000), 1.28, 0.001);
ok('tt: crossing the Washington threshold costs more in total',
  on('WA', 526_000) > on('WA', 525_000));
check('tt: DC is 1.10% below $400,000', rate('DC', 399_000), 1.10, 0.001);
check('tt: DC is 1.45% on the whole price above it', rate('DC', 401_000), 1.45, 0.001);

// Nevada: 0.51% is Clark County, not the state rate.
check('tt: Nevada state rate is 0.39%', rate('NV', 400_000), 0.39, 0.001);

// Statutory splits must be recorded as such, not as custom.
for (const c of ['ME', 'NH', 'DE', 'DC']) {
  ok(`tt: ${c} splits by statute`, tt(c).paidBy === 'split');
}
check('tt: New Hampshire is 1.5% in total', rate('NH', 400_000), 1.50, 0.001);

/* Structural invariants across every row. */
ok('tt: no schedule has an out-of-order band', STATES.every((s) => {
  const t = s.transferTax.tiers;
  if (!t) return true;
  for (let i = 1; i < t.length; i++) {
    if (t[i - 1].upTo === null) return false;
    if (t[i].upTo !== null && t[i].upTo <= t[i - 1].upTo) return false;
  }
  return t[t.length - 1].upTo === null;
}));
ok('tt: every rate is plausible', STATES.every((s) =>
  !s.transferTax.tiers || s.transferTax.tiers.every((x) => x.rate >= 0 && x.rate <= 10)));
ok('tt: every verified row names a source', STATES.every((s) =>
  !s.transferTax.verified || (s.transferTax.verified.source && s.transferTax.verified.by)));
ok('tt: a local add-on is always explained in the note', STATES.every((s) =>
  !s.transferTax.localAddOn || s.transferTax.note.length > 40));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
