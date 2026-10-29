const { getPool } = require('../lib/db');

module.exports = async (req, res) => {
  try {
    const pool = await getPool();
    const [pages, off, counts] = await Promise.all([
      pool.request().query('SELECT id, title, sheet, source, note FROM dbo.pages ORDER BY sort_order, title'),
      pool.request().query('SELECT title, sheet, note FROM dbo.off_pages'),
      pool.request().query('SELECT page_id, COUNT(*) AS n FROM dbo.page_columns GROUP BY page_id')
    ]);
    const n = Object.fromEntries(counts.recordset.map(r => [r.page_id, r.n]));
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).json({
      pages: pages.recordset.map(p => ({ id: p.id, title: p.title, sheet: p.sheet, source: p.source, n: n[p.id] || 0, note: p.note || '' })),
      off: off.recordset
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not read the page list.' });
  }
};
