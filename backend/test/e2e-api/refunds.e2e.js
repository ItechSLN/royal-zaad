// Refund consistency + nested validation errors.
// Run: NODE_PATH=backend/node_modules node backend/test/e2e-api/refunds.e2e.js backend/.env
require('dotenv').config({ path: process.argv[2], quiet: true });
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const API = process.env.API_URL ?? 'http://localhost:8080/api/v1';
const RUN = Date.now().toString(36);
const TAG = `qa-refund-${RUN}`;
const results = [];
const created = { orders: [], products: [] };
let db;

const check = (name, ok, detail = '') => {
  results.push(!!ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? '  -> ' + JSON.stringify(detail).slice(0, 300) : ''}`);
};

async function call(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  let data; try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

async function main() {
  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const role = (await db.query(`select id from "Role" where name='Admin'`)).rows[0].id;
  await db.query(`insert into "User"(id,email,"passwordHash","firstName","lastName","roleId","updatedAt") values($1,$2,$3,'QA','Refund',$4,now())`,
    [`${TAG}-admin`, `${TAG}-admin@example.test`, await bcrypt.hash('Qa-Refund-Pass1!', 10), role]);
  const admin = (await call('POST', '/auth/admin/signin', { body: { email: `${TAG}-admin@example.test`, password: 'Qa-Refund-Pass1!' } })).data.token;
  const buyer = (await call('POST', '/auth/register', { body: { email: `${TAG}-buyer@example.test`, password: 'Qa-Passw0rd!', firstName: 'QA', lastName: 'Buyer' } })).data.token;
  const address = (await call('POST', '/addresses', { token: buyer, body: { recipientName: 'QA', line1: '1 St', city: 'Austin', postalCode: '1', country: 'US' } })).data;

  const leaf = (await db.query(`select id from "Category" where "parentId" is not null limit 1`)).rows[0].id;
  const f = new FormData();
  Object.entries({ name: `QA Refund ${RUN}`, slug: TAG, sku: TAG.toUpperCase(), price: '10.00', categoryId: leaf, isActive: 'true' }).forEach(([k, v]) => f.append(k, v));
  const product = (await call('POST', '/products', { token: admin, form: f })).data;
  created.products.push(product.id);
  const inv = (await db.query(`select id from "Inventory" where "productId"=$1`, [product.id])).rows[0].id;
  await call('POST', `/inventory/${inv}/adjust`, { token: admin, body: { reason: 'RECEIPT', quantity: 10 } });
  const stock = async () => (await db.query(`select quantity from "Inventory" where id=$1`, [inv])).rows[0].quantity;
  const state = async (id) => (await db.query(`select o.status, p.status ps from "Order" o join "Payment" p on p."orderId"=o.id where o.id=$1`, [id])).rows[0];
  const place = async (qty) => {
    const r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: qty }], shippingAddressId: address.id, paymentMethod: 'cod' } });
    if (r.data?.id) created.orders.push(r.data.id);
    return r.data;
  };

  // 1. Paid but not shipped: refunding the payment cancels the order and restocks.
  const a = await place(3);
  await call('PATCH', `/payments/${a.payment.id}`, { token: admin, body: { status: 'PAID' } });
  check('setup: paid order is PROCESSING, stock 10 -> 7', (await state(a.id)).status === 'PROCESSING' && (await stock()) === 7);
  let r = await call('PATCH', `/payments/${a.payment.id}`, { token: admin, body: { status: 'REFUNDED' } });
  let st = await state(a.id);
  check('refund before shipping: payment REFUNDED, order CANCELLED', r.status === 200 && st.ps === 'REFUNDED' && st.status === 'CANCELLED', st);
  check('refund before shipping: stock restored to 10', (await stock()) === 10, await stock());

  // 2. Delivered: refunding the payment marks the order REFUNDED (goods come back via Returns).
  const b = await place(2);
  await call('PATCH', `/payments/${b.payment.id}`, { token: admin, body: { status: 'PAID' } });
  await call('PATCH', `/orders/${b.id}`, { token: admin, body: { status: 'SHIPPED' } });
  await call('PATCH', `/orders/${b.id}`, { token: admin, body: { status: 'DELIVERED' } });
  r = await call('PATCH', `/payments/${b.payment.id}`, { token: admin, body: { status: 'REFUNDED' } });
  st = await state(b.id);
  check('refund after delivery: payment and order both REFUNDED', st.ps === 'REFUNDED' && st.status === 'REFUNDED', st);
  check('refund after delivery: no automatic restock (8 left)', (await stock()) === 8, await stock());

  // 3. Refunding from the order screen closes out the payment too.
  const c = await place(1);
  await call('PATCH', `/payments/${c.payment.id}`, { token: admin, body: { status: 'PAID' } });
  await call('PATCH', `/orders/${c.id}`, { token: admin, body: { status: 'SHIPPED' } });
  await call('PATCH', `/orders/${c.id}`, { token: admin, body: { status: 'DELIVERED' } });
  r = await call('PATCH', `/orders/${c.id}`, { token: admin, body: { status: 'REFUNDED' } });
  st = await state(c.id);
  check('order refunded from the order screen: payment REFUNDED too', r.status === 200 && st.status === 'REFUNDED' && st.ps === 'REFUNDED', st);

  // 4. Nested validation errors are reported, not an empty object.
  r = await call('POST', '/orders/quote', { token: buyer, body: { items: [{ productId: product.id, quantity: 0 }] } });
  check('nested validation: item error reported as items.0.quantity', r.status === 400 && /at least 1/.test(r.data?.errors?.['items.0.quantity'] ?? ''), r.data);
}

async function cleanup() {
  if (!db) return;
  try {
    for (const id of created.orders) await db.query(`delete from "Order" where id=$1`, [id]);
    for (const id of created.products) await db.query(`delete from "Product" where id=$1`, [id]);
    await db.query(`delete from "Customer" where email like $1`, [`${TAG}%`]);
    await db.query(`delete from "User" where email like $1`, [`${TAG}%`]);
  } finally { await db.end(); }
}

main()
  .catch((e) => { console.error('CRASH', e); results.push(false); })
  .finally(async () => {
    await cleanup();
    const failed = results.filter((ok) => !ok).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    process.exit(failed ? 1 : 0);
  });
