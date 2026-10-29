// Turns database rows into the JSON shape the page already reads.
// Kept free of database code so it can be tested without a database.

function buildPage(title, colRows, weekRows, visitRows, valueRows) {
  const cols = colRows.slice().sort((a, b) => a.k - b.k);
  const nc = cols.length;
  const weeks = weekRows.slice().sort((a, b) => a.wi - b.wi).map(w => w.label);
  const rowAt = new Map(), r1At = new Map();
  const rows = [], r1 = [];
  visitRows.forEach(v => {
    if (v.wi >= 0) {
      const r = [v.facility_idx, v.wi].concat(new Array(nc).fill(null));
      rowAt.set(v.facility_idx + ':' + v.wi, r); rows.push(r);
    } else {
      const r = [v.facility_idx].concat(new Array(nc).fill(null));
      r1At.set(v.facility_idx, r); r1.push(r);
    }
  });
  valueRows.forEach(x => {
    if (x.wi >= 0) { const r = rowAt.get(x.facility_idx + ':' + x.wi); if (r) r[2 + x.k] = x.value; }
    else { const r = r1At.get(x.facility_idx); if (r) r[1 + x.k] = x.value; }
  });
  rows.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  r1.sort((a, b) => a[0] - b[0]);
  const out = {
    title, weeks,
    cols: cols.map(c => ({ g: c.grp, o: c.opt, k: c.kind, p: c.period })),
    rows, r1
  };
  const def = cols.filter(c => c.is_default).map(c => c.k);
  if (def.length) out.def = def;
  return out;
}

module.exports = { buildPage };
