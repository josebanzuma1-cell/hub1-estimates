/* Client island for the affordability calculator. Shared by the generic tool
   page and every /affordability/[metro] page. */
import { mount } from '@kit/calc/engine';
import { stackedBarChart } from '@kit/calc/chart';
import { currency, currencyCompact } from '@kit/calc/format';
import { FIELDS, compute } from '../lib/tools/affordability';
import type { AffordModel } from '../lib/tools/affordability';

document.getElementById('af-form')?.addEventListener('submit', (e) => e.preventDefault());

mount<AffordModel>({
  id: 'af',
  fields: FIELDS,
  compute,
  debounceMs: 80,
  onRender(m) {
    const el = document.getElementById('chart-af');
    if (el) {
      stackedBarChart(el, {
        groups: [{
          label: 'Monthly payment',
          segments: [
            { value: m.principalInterest, color: 'var(--c-series-1)', name: 'Principal & interest' },
            { value: m.monthlyTax, color: 'var(--c-series-2)', name: 'Property tax' },
            { value: m.monthlyIns, color: 'var(--c-series-3)', name: 'Insurance' },
            { value: m.monthlyPmi, color: '#9a6b4f', name: 'PMI' },
            { value: m.hoa, color: '#7d8590', name: 'HOA' },
          ].filter((s) => s.value > 0),
        }],
        yFormat: currencyCompact,
        height: 200,
      });
    }

    const verdict = document.getElementById('af-verdict');
    if (!verdict) return;
    const parts: string[] = [];

    parts.push(m.bindingLimit === 'front'
      ? `<p><strong>Your housing ratio is the binding limit.</strong> The ${m.actualFrontDti.toFixed(0)}% front-end cap runs out before your other debts become the problem. Saving a larger down payment raises this number; paying off a car loan will not.</p>`
      : `<p><strong>Your other debts are the binding limit.</strong> Total debt hits the back-end cap at ${m.actualBackDti.toFixed(0)}% before housing alone reaches its own limit. Every $100 of monthly debt you clear frees $100 of housing capacity, which is worth roughly ${currency(pricePerMonthlyDollar(m) * 100)} of additional purchase price — often more than saving the same $100 toward the down payment.</p>`);

    if (m.pmiBoundary) {
      parts.push(`<p><strong>You land exactly at 20% down.</strong> You could stretch slightly further, but crossing below 20% triggers mortgage insurance, and the added premium costs more than the extra price is worth. ${currency(m.maxPrice)} is the efficient stopping point.</p>`);
    } else if (m.needsPmi) {
      parts.push(`<p><strong>This includes mortgage insurance</strong> of about ${currency(m.monthlyPmi)} a month, because the down payment is ${m.downPct.toFixed(0)}% of the price. It falls off automatically at 78% loan-to-value, or you can request removal at 80%.</p>`);
    }

    verdict.innerHTML = `<div class="note"><strong class="note__title">What is limiting you</strong>${parts.join('')}</div>`;
  },
});

/** How much purchase price one extra dollar of monthly payment buys, at the
 *  current rate and tax assumptions. Derived from the solved point rather than
 *  re-deriving the payment factor, so it stays consistent with the headline. */
function pricePerMonthlyDollar(m: AffordModel): number {
  return m.totalPiti > 0 ? m.maxPrice / m.totalPiti : 0;
}
