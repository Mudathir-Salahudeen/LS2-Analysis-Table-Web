const { sql, getPool } = require('../lib/db');
const { buildPage } = require('../lib/shape');

// GET /api/page?id=em-available            all facilities
// GET /api/page?id=em-available&lga=Chikun one LGA only (keeps each reply small)
module.exports = async (req, res) => {
  const id = String(req.query.id || '');
  const lga = req.query.lga ? String(req.query.lga) : null;
  if (!/^[a-z0-9-]{1,60}$/.test(id)) return res.status(400).json({ error: 'Bad page id.' });
  try {
    const pool = await getPool();
    const q = () => pool.request().input('id', sql.NVarChar(60), id);
    const withLga = r => (lga ? r.input('lga', sql.NVarChar(100), lga) : r);
    const join = lga ? 'JOIN dbo.facilities f ON f.idx = {t}.facility_idx AND f.lga = @lga' : '';
    const [pg, cols, weeks, visits, vals] = await Promise.all([
      q().query('SELECT title FROM dbo.pages WHERE id = @id'),
      q().query('SELECT k, grp, opt, kind, period, is_default FROM dbo.page_columns WHERE page_id = @id ORDER BY k'),
      q().query('SELECT wi, label FROM dbo.page_weeks WHERE page_id = @id ORDER BY wi'),
      withLga(q()).query('SELECT v.facility_idx, v.wi FROM dbo.page_visits v ' + join.replace('{t}', 'v') + ' WHERE v.page_id = @id'),
      withLga(q()).query('SELECT r.facility_idx, r.wi, r.k, r.value FROM dbo.responses r ' + join.replace('{t}', 'r') + ' WHERE r.page_id = @id')
    ]);
    if (!pg.recordset.length) return res.status(404).json({ error: 'No such page.' });
    const out = buildPage(pg.recordset[0].title, cols.recordset, weeks.recordset, visits.recordset, vals.recordset);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not read this page.' });
  }
};
