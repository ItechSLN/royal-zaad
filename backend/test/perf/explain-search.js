// Captures the SQL SearchRepository builds and runs EXPLAIN ANALYZE on it.
const path = require('path');
const { Client } = require('pg');
const B = process.argv[2];
const { SearchRepository } = require(path.join(B, process.env.DIST ?? 'dist', 'search/search.repository.js'));
const { DEFAULT_RANKING } = require(path.join(B, process.env.DIST ?? 'dist', 'search/ranking.js'));
(async () => {
  let captured;
  const { Prisma } = require('@prisma/client');
  const fake = { $queryRaw: (strings, ...values) => { captured = Prisma.sql(strings, ...values); return Promise.resolve([]); } };
  const repo = new SearchRepository(fake);
  const query = JSON.parse(process.argv[3]);
  await repo.candidates({ page: 1, limit: 24, ...query }, query.sort ?? 'relevance', DEFAULT_RANKING);
  // Prisma.sql → $1..$n placeholders
  const text = captured.sql.replace(/\?/g, (() => { let i = 0; return () => `$${++i}`; })());
  const db = new Client({ connectionString: process.argv[4] }); await db.connect();
  if (process.env.WORK_MEM) await db.query(`SET work_mem = '${process.env.WORK_MEM}'`);
  const plan = await db.query(`EXPLAIN (ANALYZE, BUFFERS OFF) ${text}`, captured.values);
  console.log(plan.rows.map((r) => r['QUERY PLAN']).join('\n'));
  await db.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
