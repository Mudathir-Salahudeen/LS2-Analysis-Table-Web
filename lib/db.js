const sql = require('mssql');

let pool = null;

async function getPool() {
  if (pool) return pool;
  const need = ['AZURE_SQL_SERVER', 'AZURE_SQL_DATABASE', 'AZURE_SQL_USER', 'AZURE_SQL_PASSWORD'];
  const miss = need.filter(n => !process.env[n] || process.env[n].includes('your-server') || process.env[n] === 'change-me' || process.env[n] === 'dummy' || process.env[n] === 'none');
  if (miss.length) throw new Error('Database not configured: ' + miss.join(', '));
  const p = new sql.ConnectionPool({
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    options: { encrypt: true, trustServerCertificate: false },
    pool: { max: 4, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 20000,
    requestTimeout: 45000
  });
  p.on('error', () => { pool = null; });
  pool = await p.connect();
  return pool;
}

module.exports = { sql, getPool };
