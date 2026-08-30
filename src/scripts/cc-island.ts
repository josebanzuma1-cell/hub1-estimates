/* Client island for the closing cost calculator. Shared by the generic tool
   page and all 51 state pages, so it reads its state row from the page. */
import { mount } from '@kit/calc/engine';
import { currency } from '@kit/calc/format';
import { FIELDS, makeCompute } from '../lib/tools/closing-costs';
import type { CCModel, CostLine } from '../lib/tools/closing-costs';
import type { StateData } from '@data/types';

document.getElementById('cc-form')?.addEventListener('submit', (e) => e.preventDefault());

const raw = document.getElementById('cc-state')?.textContent;
let state: StateData | null = null;
try { state = raw ? JSON.parse(raw) : null; } catch { state = null; }

const GROUPS: Array<[keyof CCModel, string]> = [
  ['lender', 'Lender fees'],
  ['title', 'Title & settlement'],
  ['gov', 'Government charges'],
  ['prepaid', 'Prepaid & escrow'],
];

function renderBreakdown(m: CCModel) {
  const host = document.getElementById('cc-breakdown');
  if (!host) return;
  const rows = GROUPS.map(([key, label]) => {
    const lines = m[key] as unknown as CostLine[];
    const subtotal = lines.reduce((t, l) => t + l.amount, 0);
    const body = lines.map((l) => `
      <tr>
        <td style="padding-left:var(--s-6)">${l.label}${l.note ? `<div style="font-size:var(--t-xs);color:var(--c-ink-3);white-space:normal;max-width:44ch;font-weight:400">${l.note}</div>` : ''}</td>
        <td>${l.shoppable ? '<span class="badge">shoppable</span>' : ''}</td>
        <td>${currency(l.amount)}</td>
      </tr>`).join('');
    return `<tr style="background:var(--c-surface-2)">
        <th colspan="2" style="text-align:left">${label}</th>
        <th>${currency(subtotal)}</th>
      </tr>${body}`;
  }).join('');

  host.innerHTML = `<table class="data">
    <thead><tr><th>Item</th><th></th><th>Amount</th></tr></thead>
    <tbody>${rows}
      <tr style="background:var(--c-accent-soft)">
        <th colspan="2" style="text-align:left">Total closing costs</th>
        <th>${currency(m.total)}</th>
      </tr>
    </tbody></table>`;
}

mount<CCModel>({
  id: 'cc',
  fields: FIELDS,
  compute: makeCompute(state),
  debounceMs: 80,
  onRender: renderBreakdown,
});
