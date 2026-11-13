const { Client } = require('pg');
const API = process.env.API_URL ?? 'http://localhost:8083/api/v1';
const call = async (m, p, token, body) => { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); let d; try { d = await r.json(); } catch {} return { status: r.status, data: d }; };
(async () => {
  const db = new Client({ connectionString: process.argv[2] }); await db.connect();
  await db.query(`update "Inventory" set quantity=20, reserved=0 where "productId"='pp1_1'`);
  const R = Date.now().toString(36);
  const buyers = await Promise.all(Array.from({ length: 60 }, async (_, i) => {
    const t = (await call('POST', '/auth/register', null, { email: `stampede-${R}-${i}@example.test`, password: 'Qa-Passw0rd!', firstName: 'S', lastName: String(i) })).data.token;
    const a = (await call('POST', '/addresses', t, { recipientName: 'S', line1: '1 St', city: 'Riyadh', postalCode: '12345', country: 'SA' })).data;
    return { t, a };
  }));
  const t0 = performance.now();
  const results = await Promise.all(buyers.map((b, i) => call('POST', '/orders', b.t, { items: [{ productId: 'pp1_1', quantity: 1 }], shippingAddressId: b.a.id, paymentMethod: 'cod', idempotencyKey: `st-${R}-${i}` })));
  const ms = Math.round(performance.now() - t0);
  const ok = results.filter((r) => r.status === 201).length;
  const soldOut = results.filter((r) => r.status === 400 && /Insufficient stock/.test(r.data?.errors?.items ?? '')).length;
  const other = results.filter((r) => r.status !== 201 && !(r.status === 400 && /Insufficient stock/.test(r.data?.errors?.items ?? '')));
  const stock = (await db.query(`select quantity from "Inventory" where "productId"='pp1_1'`)).rows[0].quantity;
  const orders = (await db.query(`select count(*)::int n from "OrderItem" where "productId"='pp1_1'`)).rows[0].n;
  console.log({ concurrentCheckouts: 60, succeeded: ok, rejectedSoldOut: soldOut, otherErrors: other.length, sample: other.slice(0, 2).map((r) => r.status + ' ' + JSON.stringify(r.data).slice(0, 150)), stockLeft: stock, orderLines: orders, totalMs: ms });
  await db.end();
})();
