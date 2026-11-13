// Tiny pg helper: node db.js "<sql>" [params-json]
const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync(require('path').join(__dirname, '../../../../.env'), 'utf8');
const url = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)[1].replace(/\?schema=public$/, '');
module.exports = async function q(sql, params = []) {
  const c = new Client({ connectionString: url });
  await c.connect();
  try { return (await c.query(sql, params)).rows; } finally { await c.end(); }
};
if (require.main === module) {
  module.exports(process.argv[2], JSON.parse(process.argv[3] || '[]')).then((r) => console.log(JSON.stringify(r, null, 1))).catch((e) => { console.error(e.message); process.exit(1); });
}
