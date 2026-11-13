// End-to-end API test for the operations & finance admin area:
// returns, shipments (+ public tracking), invoices, purchase orders, suppliers,
// warehouses & transfers, tax, reports and the dashboard home.
// Run: NODE_PATH=backend/node_modules node backend/test/e2e-api/admin-operations.e2e.js backend/.env
// All test data is prefixed "qa-ops-" and removed at the end.
require('dotenv').config({ path: process.argv[2] });
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const API = process.env.API_URL ?? 'http://localhost:8080/api/v1';
const RUN = Date.now().toString(36);
const TAG = `qa-ops-${RUN}`;
const round2 = (n) => Math.round(n * 100) / 100;
const results = [];
const created = {
  orders: [], products: [], users: [], returns: [], shipments: [], invoices: [],
  pos: [], suppliers: [], warehouses: [], transfers: [], taxRates: [], taxFilings: [],
};
let db;

async function call(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(API + path, { method, headers, body: payload });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function check(name, ok, detail = '') {
  results.push({ ok: !!ok, name, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail !== '' ? `  -> ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 400)}` : ''}`);
}

const is400 = (r, field) => r.status === 400 && (!field || r.data?.errors?.[field] !== undefined);
const stockOf = async (productId) =>
  (await db.query(`select quantity from "Inventory" where "productId"=$1`, [productId])).rows[0]?.quantity;

/** Revenue as the dashboard defines it, optionally leaving some orders out. */
const dbRevenue = async (exclude = []) =>
  Number((await db.query(
    `select coalesce(sum(total),0) s from "Order" where status not in ('CANCELLED','REFUNDED') and not (id = any($1))`,
    [exclude],
  )).rows[0].s);

async function registerCustomer(tag) {
  const email = `${TAG}-${tag}@example.test`;
  const r = await call('POST', '/auth/register', {
    body: { email, password: 'Qa-Passw0rd!', firstName: 'QA', lastName: tag },
  });
  if (r.data?.user?.id) created.users.push(r.data.user.id);
  return { ...r, email };
}

async function main() {
  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  // ---- setup: QA admin, customers, product with stock ----
  const adminRole = (await db.query(`select id from "Role" where name='Admin'`)).rows[0];
  const adminEmail = `${TAG}-admin@example.test`;
  const adminId = `qa_ops_admin_${RUN}`;
  await db.query(
    `insert into "User"(id,email,"passwordHash","firstName","lastName","roleId","updatedAt") values($1,$2,$3,'QA','Ops',$4,now())`,
    [adminId, adminEmail, await bcrypt.hash('Qa-Admin-Passw0rd!', 10), adminRole.id],
  );
  created.users.push(adminId);

  let r = await call('POST', '/auth/admin/signin', { body: { email: adminEmail, password: 'Qa-Admin-Passw0rd!' } });
  check('setup: QA admin signs in', r.status === 201 && r.data.token, r);
  const admin = r.data.token;

  const c1 = await registerCustomer('buyer');
  const buyer = c1.data.token;
  const c2 = await registerCustomer('other');
  check('setup: customers registered', c1.status === 201 && c2.status === 201, [c1.status, c2.status]);
  const buyerCustomer = (await db.query(`select id from "Customer" where email=$1`, [c1.email])).rows[0];
  const otherCustomer = (await db.query(`select id from "Customer" where email=$1`, [c2.email])).rows[0];

  const cats = (await call('GET', '/categories?limit=100')).data;
  const leaf = (cats.data ?? cats).find((c) => c.parentId);
  const form = new FormData();
  for (const [k, v] of Object.entries({
    name: `QA Ops Product ${RUN}`, slug: `${TAG}-product`, sku: `QA-OPS-${RUN}`,
    price: '40.00', costPrice: '10.00', description: 'QA ops', categoryId: leaf.id, isActive: 'true',
  })) form.append(k, v);
  r = await call('POST', '/products', { token: admin, form });
  check('setup: product created', r.status === 201 && r.data.id, r);
  const product = r.data;
  created.products.push(product.id);
  const inv = (await db.query(`select id from "Inventory" where "productId"=$1`, [product.id])).rows[0];
  r = await call('POST', `/inventory/${inv.id}/adjust`, { token: admin, body: { reason: 'RECEIPT', quantity: 20 } });
  check('setup: stock set to 20', r.status === 201 && r.data.quantity === 20, r);

  r = await call('POST', '/addresses', { token: buyer, body: { recipientName: 'QA Buyer', line1: '1 Test St', city: 'Riyadh', postalCode: '12345', country: 'SA' } });
  const address = r.data;
  check('setup: buyer address', r.status === 201, r);

  // ================= 1. ACCESS CONTROL =================
  const lists = ['/returns', '/shipments', '/invoices', '/purchase-orders', '/suppliers', '/warehouses',
    '/warehouses/transfers', '/tax/rates', '/tax/filings', '/reports', '/dashboard'];
  for (const p of lists) {
    const anon = await call('GET', p);
    const cust = await call('GET', p, { token: buyer });
    check(`auth: GET ${p} -> 401 anonymous, 403 customer`, anon.status === 401 && cust.status === 403, [anon.status, cust.status]);
  }
  const writes = [['POST', '/returns'], ['PATCH', '/returns/x'], ['DELETE', '/returns/x'], ['POST', '/shipments'],
    ['PATCH', '/shipments/x'], ['POST', '/invoices'], ['DELETE', '/invoices/x'], ['POST', '/purchase-orders'],
    ['PATCH', '/purchase-orders/x'], ['POST', '/suppliers'], ['POST', '/warehouses'], ['POST', '/warehouses/transfers'],
    ['POST', '/tax/rates'], ['POST', '/tax/filings'], ['POST', '/tax/filings/x/file']];
  for (const [m, p] of writes) {
    const anon = await call(m, p, { body: {} });
    const cust = await call(m, p, { token: buyer, body: {} });
    check(`auth: ${m} ${p} -> 401 anonymous, 403 customer`, anon.status === 401 && cust.status === 403, [anon.status, cust.status]);
  }

  for (const p of ['/returns?stage=BOGUS', '/shipments?status=BOGUS', '/purchase-orders?status=x', '/suppliers?status=x', '/invoices?status=x', '/warehouses?status=x']) {
    r = await call('GET', p, { token: admin });
    check(`validation: bad list filter ${p} -> 400 (not 500)`, r.status === 400, r);
  }
  r = await call('GET', '/returns?stage=APPROVED', { token: admin });
  check('list: valid filter still works', r.status === 200 && r.data.data.every((x) => x.stage === 'APPROVED'), r.status);

  // ================= 2. DASHBOARD / REPORTS BASELINE =================
  const dashBefore = (await call('GET', '/dashboard', { token: admin })).data;
  const repBefore = (await call('GET', '/reports', { token: admin })).data;
  const revBefore = await dbRevenue();
  const statusCount = (rep, s) => rep.ordersByStatus.find((x) => x.status === s)?.count ?? 0;

  // Order A: paid (counts), order B: cancelled (excluded)
  const place = async (qty) => {
    const res = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: qty }], shippingAddressId: address.id, paymentMethod: 'card' } });
    if (res.data?.id) created.orders.push(res.data.id);
    return res;
  };
  r = await place(2);
  check('orders: QA order A placed', r.status === 201, r);
  const orderA = r.data;
  r = await call('PATCH', `/payments/${orderA.payment.id}`, { token: admin, body: { status: 'PAID' } });
  check('orders: order A paid -> PROCESSING', r.status === 200, r);
  r = await place(1);
  const orderB = r.data;
  r = await call('PATCH', `/orders/${orderB.id}`, { token: admin, body: { status: 'CANCELLED' } });
  check('orders: QA order B cancelled', r.status === 200 && r.data.status === 'CANCELLED', r);
  check('orders: stock 20 -> 18 after A, B restored', (await stockOf(product.id)) === 18, await stockOf(product.id));

  const mine = [orderA.id, orderB.id];
  const dashAfter = (await call('GET', '/dashboard', { token: admin })).data;
  const repAfter = (await call('GET', '/reports', { token: admin })).data;
  const others = (await dbRevenue(mine)) - revBefore; // concurrent activity by anyone else
  const totalA = Number(orderA.total);
  check('dashboard: total revenue rises by order A only (cancelled B excluded)',
    round2(dashAfter.totalRevenue - dashBefore.totalRevenue) === round2(totalA + others),
    { before: dashBefore.totalRevenue, after: dashAfter.totalRevenue, totalA, others });
  check('dashboard: total revenue equals live orders (non-cancelled, non-refunded)', round2(dashAfter.totalRevenue) === round2(await dbRevenue()), { api: dashAfter.totalRevenue, db: await dbRevenue() });
  const nonCancelled = Number((await db.query(`select count(*) c from "Order" where status <> 'CANCELLED'`)).rows[0].c);
  check('dashboard: total orders excludes cancelled', dashAfter.totalOrders === nonCancelled, { api: dashAfter.totalOrders, db: nonCancelled });
  const ym = new Date().toISOString().slice(0, 7);
  const monthBefore = dashBefore.revenueByMonth.find((m) => m.month === ym)?.total ?? 0;
  const monthAfter = dashAfter.revenueByMonth.find((m) => m.month === ym)?.total ?? 0;
  check('dashboard: this month revenue rises by order A', round2(monthAfter - monthBefore) === round2(totalA + others), { monthBefore, monthAfter });
  check('dashboard: recent orders lists the QA order', dashAfter.recentOrders.some((o) => o.id === orderA.id || o.id === orderB.id), dashAfter.recentOrders.map((o) => o.orderNumber));

  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayB = repBefore.salesOverTime.find((x) => x.date === today);
  const dayA = repAfter.salesOverTime.find((x) => x.date === today);
  check('reports: 30 daily buckets ending today (local day)', repAfter.salesOverTime.length === 30 && repAfter.salesOverTime.at(-1).date === today, repAfter.salesOverTime.at(-1));
  check("reports: today's revenue rises by order A, cancelled B excluded",
    dayA && dayB && round2(dayA.revenue - dayB.revenue) === round2(totalA + others), { dayB, dayA, others });
  check('reports: orders-by-status counts move (PROCESSING +1, CANCELLED +1)',
    statusCount(repAfter, 'PROCESSING') >= statusCount(repBefore, 'PROCESSING') + 1 && statusCount(repAfter, 'CANCELLED') >= statusCount(repBefore, 'CANCELLED') + 1,
    { before: repBefore.ordersByStatus, after: repAfter.ordersByStatus });
  const catName = (await db.query(`select name from "Category" where id=$1`, [leaf.id])).rows[0].name;
  const catRevDb = Number((await db.query(
    `select coalesce(sum(oi.total),0) s from "OrderItem" oi join "Order" o on o.id=oi."orderId" join "Product" p on p.id=oi."productId" where p."categoryId"=$1 and o.status not in ('CANCELLED','REFUNDED')`, [leaf.id])).rows[0].s);
  check('reports: revenue by category matches order items (cancelled excluded)',
    round2(repAfter.revenueByCategory.find((c) => c.category === catName)?.revenue ?? 0) === round2(catRevDb), { catName, db: catRevDb });

  // ================= 3. SHIPMENTS =================
  r = await call('POST', '/shipments', { token: admin, body: { awb: `${TAG}-AWB0`, orderId: orderB.id, carrier: 'dhl' } });
  check('shipments: cancelled order cannot be shipped (400)', is400(r, 'orderId'), r);
  r = await call('POST', '/shipments', { token: admin, body: { awb: `${TAG}-AWB0`, orderId: 'nope', carrier: 'dhl' } });
  check('shipments: unknown order rejected (400)', is400(r, 'orderId'), r);
  r = await call('POST', '/shipments', { token: admin, body: { orderId: orderA.id } });
  check('shipments: missing awb/carrier rejected (400 with field errors)', is400(r, 'awb') && r.data.errors.carrier, r);
  r = await call('POST', '/shipments', { token: admin, body: { awb: `${TAG}-AWB1`, orderId: orderA.id, carrier: 'aramex', service: 'express', eta: new Date(Date.now() + 2 * 864e5).toISOString() } });
  check('shipments: create for order in fulfilment', r.status === 201 && r.data.status === 'AWAITING_DISPATCH', r);
  const ship = r.data;
  if (ship?.id) created.shipments.push(ship.id);
  check('shipments: destination defaults to the shipping city', ship.city === 'Riyadh', ship.city);
  r = await call('POST', '/shipments', { token: admin, body: { awb: `${TAG}-AWB1`, orderId: orderA.id, carrier: 'dhl' } });
  check('shipments: duplicate AWB rejected (400)', r.status === 400, r);
  r = await call('GET', '/shipments?limit=100', { token: admin });
  const listedShip = r.data.data?.find((s) => s.id === ship.id);
  check('shipments: list carries order number for the table', listedShip?.order?.orderNumber === orderA.orderNumber, listedShip);
  r = await call('PATCH', `/shipments/${ship.id}`, { token: admin, body: { status: 'IN_TRANSIT' } });
  check('shipments: move to IN_TRANSIT stamps dispatch time', r.status === 200 && r.data.status === 'IN_TRANSIT' && r.data.dispatchedAt, r);
  r = await call('GET', `/orders/${orderA.id}`, { token: admin });
  check('shipments: order follows to SHIPPED', r.data.status === 'SHIPPED', r.data.status);
  r = await call('PATCH', `/shipments/${ship.id}`, { token: admin, body: { status: 'FAILED' } });
  check('shipments: failed attempt counted', r.status === 200 && r.data.attempts === 1, r.data);
  r = await call('PATCH', `/shipments/${ship.id}`, { token: admin, body: { status: 'BOGUS' } });
  check('shipments: invalid status rejected (400)', is400(r, 'status'), r);

  r = await call('GET', `/orders/track/${orderA.orderNumber}`);
  const tracked = r.data?.shipments?.find((s) => s.awb === `${TAG}-AWB1`);
  check('tracking: public page shows the shipment', r.status === 200 && tracked && tracked.carrier === 'aramex' && tracked.status === 'FAILED', r.data?.shipments);
  check('tracking: no customer email / street address leaked', !JSON.stringify(r.data).includes(c1.email) && !JSON.stringify(r.data).includes('1 Test St'), r.data);

  r = await call('PATCH', `/shipments/${ship.id}`, { token: admin, body: { status: 'DELIVERED' } });
  check('shipments: delivered stamps delivery time', r.status === 200 && r.data.deliveredAt, r);
  r = await call('GET', `/orders/${orderA.id}`, { token: admin });
  check('shipments: order follows to DELIVERED', r.data.status === 'DELIVERED', r.data.status);
  r = await call('PATCH', `/shipments/${ship.id}`, { token: admin, body: { status: 'IN_TRANSIT' } });
  check('shipments: delivered shipment cannot go back (400)', is400(r, 'status'), r);
  r = await call('DELETE', `/shipments/${ship.id}`, { token: admin });
  check('shipments: delivered shipment cannot be deleted (400)', r.status === 400, r);
  r = await call('GET', `/orders/track/${orderA.orderNumber}`);
  check('tracking: shows DELIVERED', r.data?.status === 'DELIVERED' && r.data.shipments?.some((s) => s.status === 'DELIVERED'), r.data);

  // ================= 4. RETURNS =================
  r = await call('POST', '/returns', { token: admin, body: { orderId: orderB.id, reason: 'QA' } });
  check('returns: undelivered order cannot be returned (400)', is400(r, 'orderId'), r);
  r = await call('POST', '/returns', { token: admin, body: { reason: 'QA' } });
  check('returns: missing order rejected (400 with field errors)', is400(r, 'orderId'), r);
  r = await call('POST', '/returns', { token: admin, body: { orderId: orderA.id, customerId: otherCustomer.id, reason: 'QA' } });
  check("returns: another customer's id rejected (400)", is400(r, 'customerId'), r);
  r = await call('POST', '/returns', { token: admin, body: { orderId: orderA.id, reason: 'QA', refundAmount: totalA + 1 } });
  check('returns: refund above order total rejected (400)', is400(r, 'refundAmount'), r);
  r = await call('POST', '/returns', { token: admin, body: { orderId: orderA.id, reason: 'QA', refundAmount: -5 } });
  check('returns: negative refund rejected (400)', is400(r, 'refundAmount'), r);

  const itemA = (await call('GET', `/orders/${orderA.id}`, { token: admin })).data.items[0];
  r = await call('POST', '/returns', { token: admin, body: { orderId: orderA.id, orderItemId: itemA.id, reason: `${TAG} damaged jar`, refundAmount: totalA } });
  check('returns: open RMA (customer derived from order)', r.status === 201 && r.data.customerId === buyerCustomer.id && r.data.stage === 'AWAITING_INSPECTION' && /^RMA-\d{4}-\d{4}$/.test(r.data.rmaNumber), r);
  const rma = r.data;
  if (rma?.id) created.returns.push(rma.id);
  r = await call('POST', '/returns', { token: admin, body: { orderId: orderA.id, reason: `${TAG} second`, refundAmount: 1 } });
  check('returns: second RMA cannot over-commit the order total (400)', is400(r, 'refundAmount'), r);
  r = await call('POST', '/returns', { token: admin, body: { orderId: orderA.id, reason: `${TAG} reject me` } });
  const rmaReject = r.data;
  if (rmaReject?.id) created.returns.push(rmaReject.id);
  check('returns: numbers are unique per RMA', r.status === 201 && rmaReject.rmaNumber !== rma.rmaNumber, r);

  r = await call('GET', '/returns?limit=100', { token: admin });
  const listedRma = r.data.data?.find((x) => x.id === rma.id);
  check('returns: list carries customer, order number and item product', listedRma?.customer?.email === c1.email && listedRma?.order?.orderNumber === orderA.orderNumber && listedRma?.order?.items?.some((i) => i.id === itemA.id && i.product?.name), listedRma);

  r = await call('PATCH', `/returns/${rma.id}`, { token: admin, body: { stage: 'REFUNDED' } });
  check('returns: cannot refund before inspection (400)', is400(r, 'stage'), r);

  // The page's "Record decision" payload (toReturnDecision): approve, sellable restock
  r = await call('PATCH', `/returns/${rma.id}`, { token: admin, body: { stage: 'APPROVED', refundMethod: 'ORIGINAL', restock: 'SELLABLE', refundAmount: totalA, note: 'QA ok' } });
  check('returns: approve with sellable restock', r.status === 200 && r.data.stage === 'APPROVED', r);
  check('returns: approval puts 2 units back (18 -> 20)', (await stockOf(product.id)) === 20, await stockOf(product.id));
  const adj = (await db.query(`select delta from "InventoryAdjustment" where "inventoryId"=$1 and reason='RETURN'`, [inv.id])).rows;
  check('returns: restock recorded in the inventory audit trail', adj.length === 1 && adj[0].delta === 2, adj);
  r = await call('PATCH', `/returns/${rma.id}`, { token: admin, body: { stage: 'APPROVED', restock: 'SELLABLE' } });
  check('returns: approving again does not restock twice', (await stockOf(product.id)) === 20, { status: r.status, stock: await stockOf(product.id) });
  r = await call('DELETE', `/returns/${rma.id}`, { token: admin });
  check('returns: approved RMA cannot be deleted (400)', r.status === 400, r);

  const revBeforeRefund = (await call('GET', '/dashboard', { token: admin })).data.totalRevenue;
  const othersBeforeRefund = await dbRevenue(mine);
  r = await call('PATCH', `/returns/${rma.id}`, { token: admin, body: { stage: 'REFUNDED' } });
  check('returns: settle refund', r.status === 200 && r.data.stage === 'REFUNDED' && r.data.resolvedAt, r);
  r = await call('GET', `/orders/${orderA.id}`, { token: admin });
  check('returns: full refund marks order REFUNDED and payment REFUNDED', r.data.status === 'REFUNDED' && r.data.payment.status === 'REFUNDED', { s: r.data.status, p: r.data.payment?.status });
  check('returns: refund does not touch stock again', (await stockOf(product.id)) === 20, await stockOf(product.id));
  const revAfterRefund = (await call('GET', '/dashboard', { token: admin })).data.totalRevenue;
  check('dashboard: refunded order leaves revenue', round2(revBeforeRefund - revAfterRefund) === round2(totalA - ((await dbRevenue(mine)) - othersBeforeRefund)), { revBeforeRefund, revAfterRefund, totalA });
  r = await call('PATCH', `/returns/${rma.id}`, { token: admin, body: { note: 'late edit' } });
  check('returns: refunded RMA is closed (400)', is400(r, 'stage'), r);

  r = await call('PATCH', `/returns/${rmaReject.id}`, { token: admin, body: { stage: 'REJECTED', refundMethod: 'NONE', restock: 'QUARANTINE' } });
  check('returns: reject decision', r.status === 200 && r.data.stage === 'REJECTED' && (await stockOf(product.id)) === 20, r);
  r = await call('PATCH', `/returns/${rmaReject.id}`, { token: admin, body: { orderId: orderB.id } });
  check('returns: order cannot be swapped on an RMA (400)', r.status === 400, r);
  r = await call('DELETE', `/returns/${rmaReject.id}`, { token: admin });
  check('returns: rejected RMA can be deleted', r.status === 200, r);
  r = await call('GET', `/returns/${rmaReject.id}`, { token: admin });
  check('returns: deleted RMA is gone (404)', r.status === 404, r.status);

  // ================= 5. SUPPLIERS =================
  r = await call('POST', '/suppliers', { token: admin, body: { name: '' } });
  check('suppliers: missing name rejected (400)', is400(r, 'name'), r);
  r = await call('POST', '/suppliers', { token: admin, body: { name: `${TAG} supplier`, email: 'not-an-email' } });
  check('suppliers: invalid email rejected (400)', is400(r, 'email'), r);
  // payload exactly as toSupplier() builds it
  r = await call('POST', '/suppliers', { token: admin, body: { name: `${TAG} supplier`, category: 'honey', country: 'Yemen', leadTimeDays: 18, contactName: 'QA', email: 'qa@example.test', paymentTerms: 'net30' } });
  check('suppliers: create', r.status === 201 && r.data.id, r);
  const supplier = r.data;
  created.suppliers.push(supplier.id);
  r = await call('PATCH', `/suppliers/${supplier.id}`, { token: admin, body: { leadTimeDays: 21, status: 'ON_HOLD' } });
  check('suppliers: edit lead time & status', r.status === 200 && r.data.leadTimeDays === 21 && r.data.status === 'ON_HOLD', r);
  r = await call('GET', `/suppliers?search=${encodeURIComponent(TAG)}`, { token: admin });
  check('suppliers: search finds the supplier with open PO count', r.data.data?.[0]?.id === supplier.id && r.data.data[0]._count?.purchaseOrders === 0, r.data);

  // ================= 6. PURCHASE ORDERS =================
  r = await call('POST', '/purchase-orders', { token: admin, body: { supplierId: 'nope' } });
  check('purchase orders: unknown supplier rejected (400)', r.status === 400, r);
  r = await call('POST', '/purchase-orders', { token: admin, body: { supplierId: supplier.id, items: [{ productId: 'nope', quantity: 1, unitCost: 1 }] } });
  check('purchase orders: unknown product rejected (400)', is400(r, 'items'), r);
  r = await call('POST', '/purchase-orders', { token: admin, body: { supplierId: supplier.id, items: [{ productId: product.id, quantity: 0, unitCost: 1 }] } });
  check('purchase orders: zero quantity line rejected (400)', r.status === 400, r);
  r = await call('POST', '/purchase-orders', { token: admin, body: { supplierId: supplier.id, units: -3 } });
  check('purchase orders: negative units rejected (400)', is400(r, 'units'), r);

  r = await call('POST', '/purchase-orders', { token: admin, body: { supplierId: supplier.id, reference: `${TAG}-po`, expectedAt: new Date(Date.now() + 7 * 864e5).toISOString(), items: [{ productId: product.id, quantity: 10, unitCost: 5.5 }] } });
  check('purchase orders: raise PO with a line (units/total derived)', r.status === 201 && r.data.units === 10 && Number(r.data.total) === 55 && r.data.status === 'DRAFT' && /^PO-\d+$/.test(r.data.number), r);
  const po = r.data;
  if (po?.id) created.pos.push(po.id);
  r = await call('PATCH', `/purchase-orders/${po.id}`, { token: admin, body: { status: 'RECEIVED' } });
  check('purchase orders: draft cannot be received (400)', is400(r, 'status'), r);
  r = await call('PATCH', `/purchase-orders/${po.id}`, { token: admin, body: { status: 'APPROVED' } });
  check('purchase orders: approve', r.status === 200 && r.data.status === 'APPROVED', r);
  const spendBefore = Number((await db.query(`select "ytdSpend" from "Supplier" where id=$1`, [supplier.id])).rows[0].ytdSpend);
  const stockBeforePo = await stockOf(product.id);
  // two clicks at once must book the stock once
  const [rc1, rc2] = await Promise.all([
    call('PATCH', `/purchase-orders/${po.id}`, { token: admin, body: { status: 'RECEIVED' } }),
    call('PATCH', `/purchase-orders/${po.id}`, { token: admin, body: { status: 'RECEIVED' } }),
  ]);
  check('purchase orders: concurrent receive -> one succeeds, one refused', [rc1.status, rc2.status].sort().join() === '200,400' || [rc1.status, rc2.status].sort().join() === '200,409', [rc1.status, rc2.status]);
  check('purchase orders: receiving adds 10 units exactly once', (await stockOf(product.id)) === stockBeforePo + 10, { before: stockBeforePo, after: await stockOf(product.id) });
  r = await call('GET', `/purchase-orders/${po.id}`, { token: admin });
  check('purchase orders: received PO stamped and lists its line', r.data.status === 'RECEIVED' && r.data.receivedAt && r.data.items?.[0]?.product?.id === product.id, r.data);
  r = await call('PATCH', `/purchase-orders/${po.id}`, { token: admin, body: { status: 'RECEIVED' } });
  check('purchase orders: receiving again rejected, stock unchanged', r.status === 400 && (await stockOf(product.id)) === stockBeforePo + 10, r);
  const spendAfter = Number((await db.query(`select "ytdSpend" from "Supplier" where id=$1`, [supplier.id])).rows[0].ytdSpend);
  check('purchase orders: supplier YTD spend grows by PO total', round2(spendAfter - spendBefore) === 55, { spendBefore, spendAfter });
  const receipt = (await db.query(`select delta from "InventoryAdjustment" where "inventoryId"=$1 and reason='RECEIPT' and note like 'Purchase order%'`, [inv.id])).rows;
  check('purchase orders: receipt in inventory audit trail once', receipt.length === 1 && receipt[0].delta === 10, receipt);
  r = await call('DELETE', `/purchase-orders/${po.id}`, { token: admin });
  check('purchase orders: received PO cannot be deleted (400)', r.status === 400, r);

  // The page's form payload (toPurchaseOrder) without lines
  r = await call('POST', '/purchase-orders', { token: admin, body: { supplierId: supplier.id, units: 5, total: 20, notes: 'QA header only' } });
  const po2 = r.data;
  if (po2?.id) created.pos.push(po2.id);
  check('purchase orders: header-only PO (page form) can be raised', r.status === 201, r);
  await call('PATCH', `/purchase-orders/${po2.id}`, { token: admin, body: { status: 'APPROVED' } });
  r = await call('PATCH', `/purchase-orders/${po2.id}`, { token: admin, body: { status: 'RECEIVED' } });
  check('purchase orders: PO without lines cannot be received (400)', is400(r, 'items'), r);
  r = await call('PATCH', `/purchase-orders/${po2.id}`, { token: admin, body: { status: 'CANCELLED' } });
  check('purchase orders: cancel', r.status === 200 && r.data.status === 'CANCELLED', r);
  r = await call('DELETE', `/purchase-orders/${po2.id}`, { token: admin });
  check('purchase orders: cancelled PO can be deleted', r.status === 200, r);

  r = await call('DELETE', `/suppliers/${supplier.id}`, { token: admin });
  check('suppliers: supplier with POs cannot be deleted (400, not 500)', r.status === 400, r);

  // ================= 7. WAREHOUSES & TRANSFERS =================
  r = await call('POST', '/warehouses', { token: admin, body: { name: '', code: '', city: '' } });
  check('warehouses: missing fields rejected (400)', is400(r, 'code') && r.data.errors.name && r.data.errors.city, r);
  r = await call('POST', '/warehouses', { token: admin, body: { code: `${TAG}-A`, name: `${TAG} A`, city: 'Riyadh', capacity: 1000, status: 'OPERATIONAL', isDefault: false } });
  check('warehouses: create', r.status === 201, r);
  const whA = r.data; created.warehouses.push(whA.id);
  r = await call('POST', '/warehouses', { token: admin, body: { code: `${TAG}-B`, name: `${TAG} B`, city: 'Jeddah', capacity: 500, isDefault: false } });
  const whB = r.data; created.warehouses.push(whB.id);
  r = await call('POST', '/warehouses', { token: admin, body: { code: `${TAG}-A`, name: 'dupe', city: 'x' } });
  check('warehouses: duplicate code rejected (400)', is400(r, 'code'), r);
  r = await call('POST', '/warehouses', { token: admin, body: { code: `${TAG}-C`, name: 'neg', city: 'x', capacity: -1 } });
  check('warehouses: negative capacity rejected (400)', is400(r, 'capacity'), r);
  r = await call('PATCH', `/warehouses/${whA.id}`, { token: admin, body: { status: 'MAINTENANCE', manager: 'QA' } });
  check('warehouses: edit status & manager', r.status === 200 && r.data.status === 'MAINTENANCE', r);
  r = await call('GET', '/warehouses?status=MAINTENANCE&limit=100', { token: admin });
  check('warehouses: status filter applied', r.data.data?.some((w) => w.id === whA.id) && r.data.data.every((w) => w.status === 'MAINTENANCE'), r.data?.data?.map((w) => w.status));

  r = await call('POST', '/warehouses/transfers', { token: admin, body: { fromId: whA.id, toId: whB.id, units: 1 } });
  check('transfers: cannot move stock a site does not hold (400)', is400(r, 'units'), r);
  // Hold our product's 30 units at warehouse A
  await call('POST', `/inventory/${inv.id}/adjust`, { token: admin, body: { reason: 'COUNT', quantity: await stockOf(product.id), warehouseId: whA.id } });
  r = await call('GET', '/warehouses?limit=100', { token: admin });
  const heldA = r.data.data.find((w) => w.id === whA.id);
  check('warehouses: units & utilisation derived from inventory', heldA.units === 30 && heldA.utilisation === 3, heldA);
  r = await call('POST', '/warehouses/transfers', { token: admin, body: { fromId: whA.id, toId: whB.id, units: -5 } });
  check('transfers: negative units rejected (400)', is400(r, 'units'), r);
  r = await call('POST', '/warehouses/transfers', { token: admin, body: { fromId: whA.id, toId: whA.id, units: 1 } });
  check('transfers: same source and destination rejected (400)', r.status === 400, r);
  r = await call('POST', '/warehouses/transfers', { token: admin, body: { fromId: whA.id, toId: 'nope', units: 1 } });
  check('transfers: unknown warehouse rejected (400)', is400(r, 'toId'), r);
  r = await call('POST', '/warehouses/transfers', { token: admin, body: { reference: `${TAG}-T1`, fromId: whA.id, toId: whB.id, units: 25 } });
  check('transfers: create draft', r.status === 201 && r.data.status === 'DRAFT', r);
  const t1 = r.data; if (t1?.id) created.transfers.push(t1.id);
  r = await call('POST', '/warehouses/transfers', { token: admin, body: { reference: `${TAG}-T2`, fromId: whA.id, toId: whB.id, units: 6 } });
  if (r.data?.id) created.transfers.push(r.data.id);
  check('transfers: cannot over-commit the source (25 + 6 > 30) (400)', is400(r, 'units'), r);
  r = await call('PATCH', `/warehouses/transfers/${t1.id}`, { token: admin, body: { units: 31 } });
  check('transfers: editing units above stock rejected (400)', is400(r, 'units'), r);
  r = await call('PATCH', `/warehouses/transfers/${t1.id}`, { token: admin, body: { status: 'RECEIVED' } });
  check('transfers: draft cannot jump to received (400)', is400(r, 'status'), r);
  r = await call('PATCH', `/warehouses/transfers/${t1.id}`, { token: admin, body: { status: 'IN_TRANSIT' } });
  check('transfers: dispatch', r.status === 200 && r.data.status === 'IN_TRANSIT', r);
  r = await call('DELETE', `/warehouses/transfers/${t1.id}`, { token: admin });
  check('transfers: in-transit transfer cannot be deleted (400)', r.status === 400, r);
  r = await call('PATCH', `/warehouses/transfers/${t1.id}`, { token: admin, body: { status: 'RECEIVED' } });
  check('transfers: receive stamps receivedAt', r.status === 200 && r.data.receivedAt, r);
  r = await call('PATCH', `/warehouses/transfers/${t1.id}`, { token: admin, body: { status: 'IN_TRANSIT' } });
  check('transfers: received transfer is closed (400)', r.status === 400, r);
  r = await call('GET', '/warehouses/transfers?limit=100', { token: admin });
  const lt = r.data.data?.find((t) => t.id === t1.id);
  check('transfers: list carries route for the table', lt?.from?.id === whA.id && lt?.to?.id === whB.id, lt);
  r = await call('DELETE', `/warehouses/${whA.id}`, { token: admin });
  check('warehouses: site holding stock cannot be deleted (400)', r.status === 400, r);

  // ================= 8. INVOICES =================
  const due = new Date(Date.now() + 30 * 864e5).toISOString();
  r = await call('POST', '/invoices', { token: admin, body: { customerId: 'nope', dueAt: due, amount: 5 } });
  check('invoices: unknown customer rejected (400, not 500)', is400(r, 'customerId'), r);
  r = await call('POST', '/invoices', { token: admin, body: { customerId: buyerCustomer.id, amount: -1, dueAt: due } });
  check('invoices: negative amount rejected (400)', is400(r, 'amount'), r);
  r = await call('POST', '/invoices', { token: admin, body: { customerId: buyerCustomer.id } });
  check('invoices: missing due date / amount rejected (400)', is400(r, 'dueAt') && r.data.errors.amount, r);
  r = await call('POST', '/invoices', { token: admin, body: { customerId: otherCustomer.id, orderId: orderA.id, dueAt: due, amount: 10 } });
  check("invoices: another customer's order rejected (400)", is400(r, 'orderId'), r);
  r = await call('POST', '/invoices', { token: admin, body: { customerId: buyerCustomer.id, dueAt: new Date(Date.now() - 864e5).toISOString(), issuedAt: new Date().toISOString(), amount: 10 } });
  check('invoices: due before issue rejected (400)', is400(r, 'dueAt'), r);
  // payload as toInvoice() builds it
  r = await call('POST', '/invoices', { token: admin, body: { customerId: buyerCustomer.id, orderId: orderA.id, issuedAt: new Date().toISOString(), dueAt: due, amount: 100, terms: 'net30', notes: TAG } });
  check('invoices: create starts OPEN with full balance', r.status === 201 && r.data.status === 'OPEN' && Number(r.data.balance) === 100 && /^INV-\d{4}-\d{5}$/.test(r.data.number), r);
  const invoice = r.data; if (invoice?.id) created.invoices.push(invoice.id);
  r = await call('POST', '/invoices', { token: admin, body: { customerId: buyerCustomer.id, orderId: orderA.id, dueAt: due, amount: 1 } });
  if (r.data?.id) created.invoices.push(r.data.id);
  check('invoices: second invoice for the same order rejected (400)', r.status === 400, r);
  r = await call('PATCH', `/invoices/${invoice.id}`, { token: admin, body: { balance: 60 } });
  check('invoices: part payment lowers balance', r.status === 200 && Number(r.data.balance) === 60 && r.data.status === 'OPEN', r);
  r = await call('PATCH', `/invoices/${invoice.id}`, { token: admin, body: { amount: 120 } });
  check('invoices: raising the amount keeps what was collected (balance 60 -> 80)', r.status === 200 && Number(r.data.balance) === 80, r);
  r = await call('PATCH', `/invoices/${invoice.id}`, { token: admin, body: { balance: 500 } });
  check('invoices: balance above amount rejected (400)', is400(r, 'balance'), r);
  r = await call('PATCH', `/invoices/${invoice.id}`, { token: admin, body: { status: 'PAID' } });
  check('invoices: mark paid clears the balance', r.status === 200 && r.data.status === 'PAID' && Number(r.data.balance) === 0, r);
  r = await call('GET', `/invoices?status=PAID&limit=100`, { token: admin });
  const li = r.data.data?.find((x) => x.id === invoice.id);
  check('invoices: list (paid tab) carries customer name for the table', li?.customer?.firstName === 'QA', li);
  r = await call('DELETE', `/invoices/${invoice.id}`, { token: admin });
  check('invoices: delete', r.status === 200, r);

  // ================= 9. TAX =================
  r = await call('POST', '/tax/rates', { token: admin, body: { jurisdiction: `${TAG} rate`, countryCode: 'ZZ', rate: 150 } });
  check('tax: rate above 100% rejected (400)', is400(r, 'rate'), r);
  r = await call('POST', '/tax/rates', { token: admin, body: { jurisdiction: `${TAG} rate`, countryCode: 'zz', rate: 10 } });
  check('tax: lower-case country code rejected (400)', is400(r, 'countryCode'), r);
  // payload as toTaxRate() builds it
  r = await call('POST', '/tax/rates', { token: admin, body: { jurisdiction: `${TAG} rate`, countryCode: 'ZZ', registration: 'QA-1', rate: 7.5, appliesTo: 'all' } });
  check('tax: create rate', r.status === 201 && Number(r.data.rate) === 7.5, r);
  const rate = r.data; if (rate?.id) created.taxRates.push(rate.id);
  r = await call('POST', '/tax/rates', { token: admin, body: { jurisdiction: `${TAG} rate 2`, countryCode: 'ZZ', rate: 9 } });
  if (r.data?.id) created.taxRates.push(r.data.id);
  check('tax: second active rate for one country rejected (400)', is400(r, 'countryCode'), r);
  r = await call('PATCH', `/tax/rates/${rate.id}`, { token: admin, body: { isActive: false } });
  check('tax: deactivate rate', r.status === 200 && r.data.isActive === false, r);
  r = await call('DELETE', `/tax/rates/${rate.id}`, { token: admin });
  check('tax: delete rate', r.status === 200, r);

  r = await call('POST', '/tax/filings', { token: admin, body: { period: TAG, jurisdiction: `${TAG} juris`, outputTax: 1000, inputTax: 300, netPayable: 5, dueAt: due } });
  check('tax: filing net payable = output - input (client value ignored)', r.status === 201 && Number(r.data.netPayable) === 700, r);
  const filing = r.data; if (filing?.id) created.taxFilings.push(filing.id);
  r = await call('POST', '/tax/filings', { token: admin, body: { period: TAG, jurisdiction: `${TAG} juris`, dueAt: due } });
  if (r.data?.id) created.taxFilings.push(r.data.id);
  check('tax: duplicate period + jurisdiction rejected (400)', r.status === 400, r);
  r = await call('POST', '/tax/filings', { token: admin, body: { period: TAG, jurisdiction: `${TAG} neg`, outputTax: -1, dueAt: due } });
  check('tax: negative output tax rejected (400)', is400(r, 'outputTax'), r);
  r = await call('PATCH', `/tax/filings/${filing.id}`, { token: admin, body: { inputTax: 412.35 } });
  check('tax: editing input tax recomputes net (587.65)', r.status === 200 && Number(r.data.netPayable) === 587.65, r);
  r = await call('GET', `/tax/filings?jurisdiction=${encodeURIComponent(TAG)}`, { token: admin });
  check('tax: jurisdiction filter', r.data.data?.length === 1 && r.data.data[0].id === filing.id, r.data);
  r = await call('POST', `/tax/filings/${filing.id}/file`, { token: admin });
  check('tax: file return stamps filedAt', r.status === 201 && r.data.status === 'FILED' && r.data.filedAt, r);
  r = await call('POST', `/tax/filings/${filing.id}/file`, { token: admin });
  check('tax: filing twice rejected (400)', r.status === 400, r);
  r = await call('PATCH', `/tax/filings/${filing.id}`, { token: admin, body: { outputTax: 1 } });
  check('tax: filed return is locked (400)', r.status === 400, r);
  r = await call('DELETE', `/tax/filings/${filing.id}`, { token: admin });
  check('tax: filed return cannot be deleted (400)', r.status === 400, r);
  r = await call('POST', `/tax/filings/nope/file`, { token: admin });
  check('tax: unknown filing 404', r.status === 404, r.status);
}

async function cleanup() {
  if (!db) return;
  try {
    const q = (sql, args) => db.query(sql, args).catch((e) => console.log('cleanup:', e.message));
    await q(`delete from "ReturnRequest" where "orderId" = any($1) or id = any($2)`, [created.orders, created.returns]);
    await q(`delete from "Shipment" where "orderId" = any($1) or awb like $2`, [created.orders, `${TAG}%`]);
    await q(`delete from "Invoice" where "orderId" = any($1) or id = any($2) or notes = $3`, [created.orders, created.invoices, TAG]);
    await q(`delete from "PurchaseOrder" where id = any($1) or "supplierId" = any($2)`, [created.pos, created.suppliers]);
    await q(`delete from "StockTransfer" where id = any($1) or "fromId" = any($2) or "toId" = any($2)`, [created.transfers, created.warehouses]);
    await q(`update "Inventory" set "warehouseId" = null where "warehouseId" = any($1)`, [created.warehouses]);
    await q(`delete from "Warehouse" where id = any($1) or code like $2`, [created.warehouses, `${TAG}%`]);
    await q(`delete from "Supplier" where id = any($1) or name like $2`, [created.suppliers, `${TAG}%`]);
    await q(`delete from "TaxRate" where id = any($1) or jurisdiction like $2`, [created.taxRates, `${TAG}%`]);
    await q(`delete from "TaxFiling" where id = any($1) or period = $2`, [created.taxFilings, TAG]);
    await q(`delete from "Order" where id = any($1)`, [created.orders]);
    await q(`delete from "Product" where id = any($1) or sku = $2`, [created.products, `QA-OPS-${RUN}`]);
    await q(`delete from "Customer" where email like $1`, [`${TAG}-%`]);
    await q(`delete from "User" where id = any($1) or email like $2`, [created.users, `${TAG}-%`]);

    const left = (await db.query(`select
      (select count(*) from "User" where email like $1) users,
      (select count(*) from "Customer" where email like $1) customers,
      (select count(*) from "Product" where sku = $2) products,
      (select count(*) from "Order" where id = any($3)) orders,
      (select count(*) from "Warehouse" where code like $1) warehouses,
      (select count(*) from "Supplier" where name like $1) suppliers,
      (select count(*) from "TaxRate" where jurisdiction like $1) rates,
      (select count(*) from "TaxFiling" where period = $4) filings,
      (select count(*) from "Shipment" where awb like $1) shipments`, [`${TAG}%`, `QA-OPS-${RUN}`, created.orders, TAG])).rows[0];
    const leftover = Object.entries(left).filter(([, v]) => Number(v) > 0);
    check('cleanup: no qa-ops test data left behind', leftover.length === 0, left);
  } finally {
    await db.end();
  }
}

main()
  .catch((e) => { console.error('CRASH', e); results.push({ ok: false, name: 'suite crashed', detail: e.message }); })
  .finally(async () => {
    await cleanup();
    const failed = results.filter((x) => !x.ok);
    console.log(`\n${results.length - failed.length}/${results.length} passed`);
    if (failed.length) { console.log('Failures:'); failed.forEach((x) => console.log(' -', x.name)); }
    process.exit(failed.length ? 1 : 0);
  });
