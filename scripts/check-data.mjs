/* Data verification gate. Runs before every build.

   Default: reports unverified rows and passes, so local development is not
   blocked by a data set that is deliberately incomplete.
   With PUBLIC_REQUIRE_VERIFIED=1: fails the build. Set this in production. */
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith('./types')) return next(pathToFileURL(path.join(root, 'src/data/types.ts')).href, ctx);
    return next(spec, ctx);
  },
});

const { STATES } = await import(pathToFileURL(path.join(root, 'src/data/states.ts')).href);
const { METROS } = await import(pathToFileURL(path.join(root, 'src/data/metros.ts')).href);

const strict = process.env.PUBLIC_REQUIRE_VERIFIED === '1';
const report = process.argv.includes('--report');

const sets = [['states', STATES], ['metros', METROS]];
let unverified = 0;
const problems = [];

for (const [name, rows] of sets) {
  const bad = rows.filter((r) => !r.verified);
  unverified += bad.length;
  console.log(`  ${name}: ${rows.length - bad.length}/${rows.length} verified`);
  if (report && bad.length) {
    console.log(`    unverified: ${bad.map((r) => r.slug ?? r.code).join(', ')}`);
  }
  // Structural checks always run, verified or not.
  const slugs = new Set();
  for (const r of rows) {
    if (slugs.has(r.slug)) problems.push(`${name}: duplicate slug "${r.slug}"`);
    slugs.add(r.slug);
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === 'number' && !Number.isFinite(v)) problems.push(`${name}/${r.slug}: ${k} is not finite`);
      if (typeof v === 'number' && v < 0 && k !== 'transferTaxPct') problems.push(`${name}/${r.slug}: ${k} is negative`);
    }
  }
}

if (problems.length) {
  console.error('\nData problems:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

if (unverified > 0) {
  const msg = `${unverified} row(s) still unverified — see src/data/README.md`;
  if (strict) { console.error(`\nBUILD BLOCKED: ${msg}`); process.exit(1); }
  console.log(`\n  Warning: ${msg}`);
  console.log('  Pages render an "unverified estimate" notice. Set PUBLIC_REQUIRE_VERIFIED=1 to block production builds.');
}
