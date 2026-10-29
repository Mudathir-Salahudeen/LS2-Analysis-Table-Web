// Checks that rows stored the way the loader stores them come back as the exact JSON the page reads today.
// Usage: node test/roundtrip.js [path-to-data-folder]
const fs = require('fs'), path = require('path');
const { buildPage } = require('../lib/shape');
const dir = process.argv[2] || path.join(__dirname, '..', 'data');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'pages.json'), 'utf8'));
let bad = 0, cells = 0;
for (const p of manifest.pages) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, p.id + '.json'), 'utf8'));
  const dflt = new Set(d.def || []);
  const colRows = d.cols.map((c, k) => ({ k, grp: c.g, opt: c.o || '', kind: c.k, period: c.p, is_default: dflt.has(k) }));
  const weekRows = d.weeks.map((label, wi) => ({ wi, label }));
  const visits = [], vals = [];
  d.rows.forEach(r => { visits.push({ facility_idx: r[0], wi: r[1] }); r.slice(2).forEach((v, k) => { if (v != null) vals.push({ facility_idx: r[0], wi: r[1], k, value: v }); }); });
  (d.r1 || []).forEach(r => { visits.push({ facility_idx: r[0], wi: -1 }); r.slice(1).forEach((v, k) => { if (v != null) vals.push({ facility_idx: r[0], wi: -1, k, value: v }); }); });
  // shuffle so the test does not depend on row order
  visits.sort(() => Math.random() - 0.5); vals.sort(() => Math.random() - 0.5);
  const out = buildPage(d.title, colRows, weekRows, visits, vals);
  const sortRows = a => a.slice().sort((x, y) => x[0] - y[0] || (x[1] - y[1]));
  const exp = { title: d.title, weeks: d.weeks, cols: d.cols.map(c => ({ g: c.g, o: c.o || '', k: c.k, p: c.p })), rows: sortRows(d.rows), r1: sortRows(d.r1 || []), def: d.def || undefined };
  const got = { title: out.title, weeks: out.weeks, cols: out.cols, rows: out.rows, r1: out.r1, def: out.def };
  const ok = JSON.stringify(exp) === JSON.stringify(got);
  cells += vals.length;
  if (!ok) { bad++; console.log('MISMATCH', p.id); }
}
console.log(manifest.pages.length + ' pages, ' + cells.toLocaleString() + ' values checked. ' + (bad ? bad + ' mismatches' : 'All identical.'));
process.exit(bad ? 1 : 0);
