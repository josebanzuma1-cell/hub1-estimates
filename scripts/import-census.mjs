/* Census ACS importer — verifies the demographic half of src/data/.
 *
 * Replaces seeded estimates with real figures from the American Community
 * Survey 5-year tables, and stamps each row with provenance saying which table
 * and vintage it came from. Re-run when a new ACS vintage publishes.
 *
 *   node scripts/import-census.mjs --year 2023           # dry run, prints a diff
 *   node scripts/import-census.mjs --year 2023 --write   # writes the data files
 *
 * Needs a free Census API key. Get one at
 *   https://api.census.gov/data/key_signup.html
 * then put it in .env (which is gitignored) as:
 *   CENSUS_API_KEY=...
 * The script reads it from the environment; it is never written into source.
 *
 * WHAT THIS DOES NOT VERIFY: transfer taxes, recording fees, attorney
 * requirements and insurance premiums have no Census equivalent and stay
 * unverified until sourced separately. See src/data/README.md.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const YEAR = (() => {
  const i = args.indexOf('--year');
  return i >= 0 && args[i + 1] ? args[i + 1] : '2023';
})();

const KEY = process.env.CENSUS_API_KEY || readEnvFile();
if (!KEY) {
  console.error(`
No Census API key found.

  1. Get one free (instant): https://api.census.gov/data/key_signup.html
  2. Create ${path.join(ROOT, '.env')} containing:

       CENSUS_API_KEY=your_key_here

  .env is gitignored, so the key never enters the repository.
`);
  process.exit(1);
}

function readEnvFile() {
  try {
    const txt = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    const m = txt.match(/^\s*CENSUS_API_KEY\s*=\s*(.+?)\s*$/m);
    return m ? m[1].replace(/^["']|["']$/g, '') : null;
  } catch { return null; }
}

const VARS = {
  medianValue:  'B25077_001E', // median home value
  medianIncome: 'B19013_001E', // median household income
  medianRent:   'B25064_001E', // median gross rent
  medianTaxes:  'B25103_001E', // median real estate taxes paid
};

const SOURCE = `Census ACS ${YEAR} 5-year (${Object.values(VARS).join(', ')})`;
const TODAY = new Date().toISOString().slice(0, 10);

async function fetchAcs(geoFor) {
  const url = new URL(`https://api.census.gov/data/${YEAR}/acs/acs5`);
  url.searchParams.set('get', ['NAME', ...Object.values(VARS)].join(','));
  url.searchParams.set('for', geoFor);
  url.searchParams.set('key', KEY);

  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  if (!res.ok) throw new Error(`Census API ${res.status}: ${text.slice(0, 200)}`);
  if (text.trimStart().startsWith('<')) {
    throw new Error('Census returned HTML rather than JSON — the API key is probably missing or invalid.');
  }
  const [header, ...rows] = JSON.parse(text);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  return rows.map((r) => ({
    name: r[idx.NAME],
    medianValue: num(r[idx[VARS.medianValue]]),
    medianIncome: num(r[idx[VARS.medianIncome]]),
    medianRent: num(r[idx[VARS.medianRent]]),
    medianTaxes: num(r[idx[VARS.medianTaxes]]),
  }));
}

// Census uses large negative sentinels for suppressed or unavailable estimates.
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > -1e6 ? n : null;
};

/** Effective property tax rate: median taxes paid over median value. Computed
 *  rather than taken from a secondary source, so the two always agree. */
const effectiveRate = (taxes, value) =>
  taxes && value ? Number(((taxes / value) * 100).toFixed(2)) : null;

/* ---------- match our rows to Census geographies ---------- */

// Census metro names look like "Austin-Round Rock-San Marcos, TX Metro Area".
// Match on our city name appearing in the first segment plus the state code.
function matchMetro(rows, metro) {
  const wanted = metro.name.toLowerCase();
  const st = metro.stateCode.toUpperCase();
  const candidates = rows.filter((r) => {
    const [placePart, statePart = ''] = r.name.split(',');
    if (!statePart.toUpperCase().includes(st)) return false;
    return placePart.toLowerCase().split(/[-–]/).some((seg) => seg.trim() === wanted);
  });
  // Prefer a Metro Area over a Micropolitan one when both match.
  return candidates.find((c) => /Metro Area/i.test(c.name)) ?? candidates[0] ?? null;
}

function fmtProvenance(indent) {
  const pad = ' '.repeat(indent);
  return `{\n${pad}    checkedOn: '${TODAY}',\n${pad}    source: '${SOURCE}',\n${pad}    by: 'census-import',\n${pad}  }`;
}

async function main() {
  console.log(`Census ACS ${YEAR} 5-year — ${WRITE ? 'WRITING' : 'dry run'}\n`);

  const [states, metros] = await Promise.all([
    fetchAcs('state:*'),
    fetchAcs('metropolitan statistical area/micropolitan statistical area:*'),
  ]);
  console.log(`  fetched ${states.length} states, ${metros.length} metro areas\n`);

  const { STATES } = await import(`file://${path.join(ROOT, 'src/data/states.ts')}`);
  const { METROS } = await import(`file://${path.join(ROOT, 'src/data/metros.ts')}`);

  const stateUpdates = [];
  const missingStates = [];
  for (const row of STATES) {
    const hit = states.find((s) => s.name === row.name);
    if (!hit) { missingStates.push(row.code); continue; }
    const rate = effectiveRate(hit.medianTaxes, hit.medianValue);
    if (rate === null) { missingStates.push(row.code); continue; }
    stateUpdates.push({ code: row.code, name: row.name, was: row.propertyTaxPct, now: rate });
  }

  const metroUpdates = [];
  const missingMetros = [];
  for (const row of METROS) {
    const hit = matchMetro(metros, row);
    if (!hit || !hit.medianValue) { missingMetros.push(row.slug); continue; }
    metroUpdates.push({
      slug: row.slug,
      censusName: hit.name,
      price: { was: row.medianPrice, now: hit.medianValue },
      income: { was: row.medianIncome, now: hit.medianIncome },
      rent: { was: row.medianRent, now: hit.medianRent },
      tax: { was: row.propertyTaxPct, now: effectiveRate(hit.medianTaxes, hit.medianValue) },
    });
  }

  report(stateUpdates, metroUpdates, missingStates, missingMetros);

  if (!WRITE) {
    console.log('\nDry run. Re-run with --write to apply.');
    return;
  }
  writeStates(stateUpdates);
  writeMetros(metroUpdates);
  console.log('\nWritten. Run `npm run data:report` to see remaining coverage.');
}

function pctDelta(was, now) {
  if (!was || !now) return '';
  const d = ((now - was) / was) * 100;
  const sign = d > 0 ? '+' : '';
  // Flag anything that moved a long way: usually a bad geography match rather
  // than a genuinely wrong seed value, and worth eyeballing before writing.
  return `${sign}${d.toFixed(0)}%${Math.abs(d) > 40 ? '  <-- check' : ''}`;
}

function report(stateUpdates, metroUpdates, missingStates, missingMetros) {
  console.log('STATE property tax rates');
  for (const u of stateUpdates.slice(0, 8)) {
    console.log(`  ${u.code}  ${String(u.was).padStart(5)}% -> ${String(u.now).padStart(5)}%   ${pctDelta(u.was, u.now)}`);
  }
  if (stateUpdates.length > 8) console.log(`  … ${stateUpdates.length - 8} more`);
  console.log(`  ${stateUpdates.length} matched, ${missingStates.length} unmatched${missingStates.length ? ': ' + missingStates.join(', ') : ''}\n`);

  console.log('METRO figures');
  for (const u of metroUpdates.slice(0, 6)) {
    console.log(`  ${u.slug}`);
    console.log(`    census: ${u.censusName}`);
    console.log(`    price  ${fmtMoney(u.price.was)} -> ${fmtMoney(u.price.now)}  ${pctDelta(u.price.was, u.price.now)}`);
    console.log(`    income ${fmtMoney(u.income.was)} -> ${fmtMoney(u.income.now)}  ${pctDelta(u.income.was, u.income.now)}`);
    console.log(`    rent   ${fmtMoney(u.rent.was)} -> ${fmtMoney(u.rent.now)}  ${pctDelta(u.rent.was, u.rent.now)}`);
    console.log(`    tax    ${u.tax.was}% -> ${u.tax.now}%`);
  }
  if (metroUpdates.length > 6) console.log(`  … ${metroUpdates.length - 6} more`);
  console.log(`  ${metroUpdates.length} matched, ${missingMetros.length} unmatched${missingMetros.length ? ': ' + missingMetros.join(', ') : ''}`);
}

const fmtMoney = (n) => (n ? '$' + Math.round(n).toLocaleString() : '—');

/* ---------- writers ----------
   These rewrite only the values they verified. Transfer tax, recording fees,
   attorney status and insurance have no Census source and are left alone,
   still carrying verified: false. */

function writeStates(updates) {
  const p = path.join(ROOT, 'src/data/states.ts');
  let src = fs.readFileSync(p, 'utf8');
  let n = 0;
  for (const u of updates) {
    // Rows are single s(...) calls; propertyTaxPct is the 8th positional arg.
    const re = new RegExp(`(s\('${u.code}',[^\n]*?,\s*)${escapeNum(u.was)}(,\s*[\d_]+,\s*'[^']*'\),)`);
    if (re.test(src)) { src = src.replace(re, `$1${u.now}$2`); n++; }
  }
  // Property tax is now sourced even though the rest of the row is not, so the
  // row-level flag stays false and the note records what WAS verified.
  src = src.replace(
    "  verified: false,\n  source: 'seeded estimate — unverified',",
    `  verified: false,\n  source: 'transfer tax and fees seeded — unverified; propertyTaxPct from ${SOURCE}, checked ${TODAY}',`
  );
  fs.writeFileSync(p, src);
  console.log(`\n  states.ts: ${n} property tax rates updated`);
}

const escapeNum = (v) => String(v).replace('.', '\.');

function writeMetros(updates) {
  const p = path.join(ROOT, 'src/data/metros.ts');
  let src = fs.readFileSync(p, 'utf8');
  let n = 0;
  for (const u of updates) {
    const [, city, st] = u.slug.match(/^(.*)-([a-z]{2})$/) ?? [];
    if (!city) continue;
    const nameRe = new RegExp(`m\('([^']+)',\s*'${st.toUpperCase()}',[^)]*\)`, 'g');
    src = src.replace(nameRe, (full, cityName) => {
      const slug = `${cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${st}`;
      if (slug !== u.slug) return full;
      n++;
      return `m('${cityName}', '${st.toUpperCase()}', ${Math.round(u.price.now)}, ${Math.round(u.income.now)}, ${u.tax.now}, ` +
             `${extractArg(full, 5)}, ${Math.round(u.rent.now)})`;
    });
  }
  src = src.replace(
    "  verified: false,\n  source: 'seeded estimate — unverified',",
    `  verified: {\n    checkedOn: '${TODAY}',\n    source: '${SOURCE}',\n    by: 'census-import',\n  },\n  source: '${SOURCE} — insurance still seeded',`
  );
  fs.writeFileSync(p, src);
  console.log(`  metros.ts: ${n} rows updated`);
}

/** Pull the nth positional argument out of an m(...) call, so fields the
 *  importer does not own (insurance) survive the rewrite untouched. */
function extractArg(call, index) {
  const inner = call.slice(call.indexOf('(') + 1, call.lastIndexOf(')'));
  const parts = inner.split(',').map((x) => x.trim());
  return parts[index] ?? '0';
}

main().catch((e) => { console.error('\n' + e.message); process.exit(1); });
