# Performance tests

Run against a **throwaway** database, never your real one.

```bash
createdb ecom_market_perf
DATABASE_URL=postgresql://…/ecom_market_perf?schema=public npx prisma migrate deploy
DATABASE_URL=postgresql://…/ecom_market_perf?schema=public npm run seed
psql postgresql://…/ecom_market_perf -f test/perf/perf-data.sql     # 200 shops, 20k products
npm run build
DATABASE_URL=postgresql://…/ecom_market_perf?schema=public PORT=8083 AUTH_RATE_LIMIT=100000 node dist/main.js &

node test/perf/loadtest.js                                     # search / nearby / product page
NODE_PATH=node_modules node test/perf/stampede.js postgresql://…/ecom_market_perf   # 60 buyers, 20 units
NODE_PATH=node_modules node test/perf/explain-search.js "$PWD" '{"q":"honey","lat":24.7,"lng":46.7}' postgresql://…/ecom_market_perf
```

Results on an Apple-silicon laptop, one API process, PostgreSQL 15 (Oct 2026):

| Scenario | Result |
|---|---|
| Search, 2,000 mixed requests @ 50 concurrent | 0 errors, 192 req/s, p50 243 ms, p95 403 ms |
| Single search query (DB time) | 10–60 ms |
| Nearby shops @ 50 concurrent | 6,000 req/s, p95 10 ms |
| Product page @ 50 concurrent | ~2,000 req/s, p95 29 ms |
| 60 simultaneous checkouts for 20 units | exactly 20 succeed, 40 "sold out", stock 0, no errors |
