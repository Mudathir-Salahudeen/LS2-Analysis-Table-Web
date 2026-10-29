const { getPool } = require('../lib/db');

module.exports = async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(
      'SELECT id, name, state, lga, ward, residence AS area, type FROM dbo.facilities ORDER BY idx');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).json(r.recordset);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not read the facility list.' });
  }
};
