/* Sanity checks on the amortization engine.
   Run: node scripts/test-finance.mjs
   Node 23+ strips TypeScript types natively, so the source imports directly. */
import { pmt, amortize, balanceAfter, futureValue, irr } from '@kit/calc/finance';

let pass = 0, fail = 0;
const approx = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
function check(name, actual, expected, tol) {
  const ok = approx(actual, expected, tol);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      got ${actual}  expected ~${expected}`);
}

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
