// Local stand-in for Azure SQL: runs the real API files against the JSON data. Does NOT test the SQL text.
const http = require('http'), fs = require('fs'), path = require('path'), Module = require('module');
const dir = path.join(__dirname, '..', 'data');
const J = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const fac = J('facilities.json'), man = J('pages.json');
const pageCache = {}; const pg = id => pageCache[id] || (pageCache[id] = J(id + '.json'));
function fakeRequest() {
  const inp = {};
  const r = {
    input(n, t, v) { inp[n] = v; return r; },
    async query(q) {
      const lga = inp.lga, id = inp.id, ok = i => !lga || fac[i].lga === lga;
      let rs;
      if (/FROM dbo\.facilities ORDER/.test(q)) rs = fac.map(f => ({ id: f.id, name: f.name, state: f.state || 'Kaduna', lga: f.lga, ward: f.ward, area: f.area, type: f.type }));
      else if (/FROM dbo\.pages ORDER/.test(q)) rs = man.pages.map(p => ({ id: p.id, title: p.title, sheet: p.sheet, source: p.source, note: p.note || null }));
      else if (/FROM dbo\.off_pages/.test(q)) rs = man.off;
      else if (/GROUP BY page_id/.test(q)) rs = man.pages.map(p => ({ page_id: p.id, n: pg(p.id).cols.length }));
      else if (/SELECT title FROM dbo\.pages WHERE/.test(q)) rs = man.pages.some(p => p.id === id) ? [{ title: pg(id).title }] : [];
      else if (/FROM dbo\.page_columns/.test(q)) { const d = pg(id), df = new Set(d.def || []); rs = d.cols.map((c, k) => ({ k, grp: c.g, opt: c.o || '', kind: c.k, period: c.p, is_default: df.has(k) })); }
      else if (/FROM dbo\.page_weeks/.test(q)) rs = pg(id).weeks.map((label, wi) => ({ wi, label }));
      else if (/FROM dbo\.page_visits/.test(q)) { const d = pg(id); rs = []; d.rows.forEach(r => ok(r[0]) && rs.push({ facility_idx: r[0], wi: r[1] })); (d.r1 || []).forEach(r => ok(r[0]) && rs.push({ facility_idx: r[0], wi: -1 })); }
      else if (/FROM dbo\.responses/.test(q)) { const d = pg(id); rs = []; d.rows.forEach(r => ok(r[0]) && r.slice(2).forEach((v, k) => v != null && rs.push({ facility_idx: r[0], wi: r[1], k, value: v }))); (d.r1 || []).forEach(r => ok(r[0]) && r.slice(1).forEach((v, k) => v != null && rs.push({ facility_idx: r[0], wi: -1, k, value: v }))); }
      else throw new Error('unmatched query: ' + q);
      return { recordset: rs };
    }
  };
  return r;
}
const dbPath = require.resolve('../lib/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { sql: { NVarChar: () => 0 }, getPool: async () => ({ request: fakeRequest }) } };
const routes = { '/api/manifest': require('../api/manifest'), '/api/facilities': require('../api/facilities'), '/api/page': require('../api/page') };
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'));
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const h = routes[u.pathname];
  if (!h) { res.setHeader('content-type', 'text/html'); return res.end(html); }
  res.status = c => { res.statusCode = c; return res; };
  res.json = o => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
  req.query = Object.fromEntries(u.searchParams);
  await h(req, res);
}).listen(8790, () => console.log('fake api on 8790'));
