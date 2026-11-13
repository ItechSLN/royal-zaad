// Marketplace: vendor onboarding & isolation, location search & ranking,
// multi-vendor checkout, sub-order fulfilment, payouts balance.
// Run: NODE_PATH=backend/node_modules node backend/test/e2e-api/marketplace-vendor.e2e.js backend/.env
// Needs the API in development mode (GEOCODER=fixture default) on :8080.
require('dotenv').config({ path: process.argv[2], quiet: true });
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const API = process.env.API_URL ?? 'http://localhost:8080/api/v1';
const RUN = Date.now().toString(36);
const TAG = `qa-mkt-${RUN}`;
const results = [];
let db;

const check = (name, ok, detail = '') => {
  results.push(!!ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail !== '' ? '  -> ' + JSON.stringify(detail).slice(0, 350) : ''}`);
};

async function call(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  let data; try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

const RIYADH = { lat: 24.7136, lng: 46.6753 };
const JEDDAH = { lat: 21.4858, lng: 39.1925 };
const q = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();

async function main() {
  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const before = (await db.query(`select (select count(*) from "Product" where "shopId"='shop_platform')::int p, (select count(*) from "Order")::int o`)).rows[0];

  // ---------- QA admin + customer ----------
  const adminRole = (await db.query(`select id from "Role" where name='Admin'`)).rows[0].id;
  await db.query(`insert into "User"(id,email,"passwordHash","firstName","lastName","roleId","updatedAt") values($1,$2,$3,'QA','Admin',$4,now())`,
    [`${TAG}-admin`, `${TAG}-admin@example.test`, await bcrypt.hash('Qa-Admin-Pass1!', 10), adminRole]);
  const admin = (await call('POST', '/auth/admin/signin', { body: { email: `${TAG}-admin@example.test`, password: 'Qa-Admin-Pass1!' } })).data.token;
  const customer = (await call('POST', '/auth/register', { body: { email: `${TAG}-buyer@example.test`, password: 'Qa-Passw0rd!', firstName: 'QA', lastName: 'Buyer' } })).data.token;

  // ================= 1. VENDOR ONBOARDING =================
  const register = (name, city, postalCode) => call('POST', '/auth/register-vendor', { body: {
    email: `${TAG}-${name}@example.test`, password: 'Qa-Vendor-Pass1!', firstName: 'QA', lastName: name,
    shopName: `QA ${name} ${RUN}`, phone: '+966500000000', addressLine1: '1 Market St', city, postalCode, country: 'SA',
  } });
  let r = await register('alpha', 'Riyadh', '12345');
  check('onboarding: vendor A registers (pending)', r.status === 201 && r.data.token && r.data.vendorStatus === 'PENDING', r);
  const A = r.data;
  r = await register('beta', 'Jeddah', '21442');
  check('onboarding: vendor B registers', r.status === 201 && r.data.token, r);
  const B = r.data;
  r = await register('alpha', 'Riyadh', '12345');
  check('onboarding: duplicate email rejected (400)', r.status === 400, r.status);
  r = await call('POST', '/auth/register-vendor', { body: { email: 'bad', password: 'x' } });
  check('onboarding: invalid sign-up rejected with field errors', r.status === 400 && r.data.errors?.email && r.data.errors?.password, r.data);

  r = await call('GET', '/auth/me', { token: A.token });
  check('onboarding: session is a VENDOR session, email not yet confirmed', r.data.roleKind === 'VENDOR' && r.data.emailVerified === false, r.data);
  check('onboarding: vendor session lasts 12h', (() => { const p = JSON.parse(Buffer.from(A.token.split('.')[1], 'base64url')); return (p.exp - p.iat) / 3600 === 12; })());

  const tokenFrom = (url) => new URL(url).searchParams.get('token');
  check('onboarding: confirmation link issued (dev)', !!A.verifyUrl, A);
  r = await call('POST', '/auth/verify-email', { body: { token: tokenFrom(A.verifyUrl) } });
  check('onboarding: email confirmed with the link', r.status === 201, r);
  r = await call('POST', '/auth/verify-email', { body: { token: tokenFrom(A.verifyUrl) } });
  check('onboarding: confirmation link cannot be reused (400)', r.status === 400, r.status);
  await call('POST', '/auth/verify-email', { body: { token: tokenFrom(B.verifyUrl) } });

  r = await call('POST', '/auth/vendor/signin', { body: { email: `${TAG}-alpha@example.test`, password: 'Qa-Vendor-Pass1!' } });
  check('onboarding: vendor sign-in works', r.status === 201 && r.data.token, r.status);
  r = await call('POST', '/auth/vendor/signin', { body: { email: `${TAG}-buyer@example.test`, password: 'Qa-Passw0rd!' } });
  check('onboarding: a customer cannot use vendor sign-in (401)', r.status === 401, r.status);
  r = await call('POST', '/auth/admin/signin', { body: { email: `${TAG}-alpha@example.test`, password: 'Qa-Vendor-Pass1!' } });
  check('security: a vendor cannot sign in to the admin dashboard (401)', r.status === 401, r.status);
  r = await call('GET', '/orders?limit=1', { token: A.token });
  check('security: a vendor cannot read platform-wide orders (403)', r.status === 403, r.status);
  r = await call('GET', '/products?limit=1&isActive=false', { token: A.token });
  check('security: a vendor is not staff — public catalogue view only', r.status === 200 && r.data.data.every((p) => p.isActive), r.data?.data?.length);

  // ================= 2. SHOP PROFILE =================
  r = await call('GET', '/vendor/shop', { token: A.token });
  check('shop: geocoded at sign-up (Riyadh)', r.status === 200 && Math.abs(r.data.latitude - RIYADH.lat) < 0.01 && r.data.locationVerifiedAt, r.data);
  const shopA = r.data;
  const shopB = (await call('GET', '/vendor/shop', { token: B.token })).data;

  r = await call('PATCH', '/vendor/shop', { token: A.token, body: { openingHours: { mon: [{ open: '09:00', close: '18:00' }] }, offersPickup: true, deliveryRadiusKm: 30 } });
  check('shop: hours, pickup and delivery radius saved', r.status === 200 && r.data.offersPickup && r.data.deliveryRadiusKm === 30, r);
  r = await call('PATCH', '/vendor/shop', { token: A.token, body: { openingHours: { mon: [{ open: '18:00', close: '09:00' }] } } });
  check('shop: invalid hours rejected (400)', r.status === 400 && r.data.errors?.openingHours, r.data);
  r = await call('PATCH', '/vendor/shop', { token: A.token, body: { offersDelivery: false, offersPickup: false } });
  check('shop: must offer delivery or pickup (400)', r.status === 400, r.status);
  r = await call('PATCH', '/vendor/shop', { token: A.token, body: { status: 'ACTIVE' } });
  check('security: vendor cannot approve itself (400 unknown field)', r.status === 400, r.status);
  // Vendor B: delivery only within 50 km of Jeddah, plus pickup.
  await call('PATCH', '/vendor/shop', { token: B.token, body: { deliveryRadiusKm: 50, offersPickup: true, shippingFlatFee: 10 } });

  // ================= 3. PRODUCTS & ISOLATION =================
  const leaf = (await db.query(`select id from "Category" where "parentId" is not null order by "sortOrder" limit 1`)).rows[0].id;
  const product = (token, over) => {
    const f = new FormData();
    Object.entries({ name: `QA Saffron ${RUN}`, slug: `${TAG}-${Math.random().toString(36).slice(2, 8)}`, sku: 'QA-SAF-1', price: '20.00', categoryId: leaf, isActive: 'true', description: 'Premium saffron threads', ...over })
      .forEach(([k, v]) => f.append(k, v));
    return call('POST', '/vendor/products', { token, form: f });
  };
  r = await product(A.token, {});
  check('products: pending vendor can prepare products', r.status === 201 && r.data.shopId === shopA.id, r);
  const pA = r.data;
  r = await product(B.token, { price: '18.00' });
  const pB = r.data;
  check('products: same SKU allowed in a different shop', r.status === 201 && pB.sku === pA.sku, r);
  r = await product(A.token, {});
  check('products: duplicate SKU within one shop rejected (400) on the sku field', r.status === 400 && r.data.errors?.sku, r.data);
  r = await product(A.token, { shopId: shopB.id, sku: 'QA-X' });
  check('security: a vendor cannot choose another shop (400 unknown field)', r.status === 400, r.status);

  const adjust = (token, id, quantity) => call('POST', `/vendor/inventory/${id}/adjust`, { token, body: { reason: 'RECEIPT', quantity } });
  check('inventory: vendor stocks own product', (await adjust(A.token, pA.id, 10)).status === 201);
  await adjust(B.token, pB.id, 10);

  r = await call('GET', `/vendor/products/${pA.id}`, { token: B.token });
  check("isolation: vendor B cannot view A's product (404)", r.status === 404, r.status);
  const edit = new FormData(); edit.append('price', '1.00');
  r = await call('PATCH', `/vendor/products/${pA.id}`, { token: B.token, form: edit });
  check("isolation: vendor B cannot change A's price (404)", r.status === 404, r.status);
  r = await call('DELETE', `/vendor/products/${pA.id}`, { token: B.token });
  check("isolation: vendor B cannot delete A's product (404)", r.status === 404, r.status);
  r = await adjust(B.token, pA.id, 0);
  check("isolation: vendor B cannot change A's stock (404)", r.status === 404, r.status);
  r = await call('GET', '/vendor/products?limit=100', { token: B.token });
  check("isolation: B's product list contains only B's products", r.data.data.length >= 1 && r.data.data.every((p) => p.shopId === shopB.id), r.data.data.map((p) => p.shopId));
  check('isolation: price unchanged after B tried', Number((await db.query(`select price from "Product" where id=$1`, [pA.id])).rows[0].price) === 20);
  r = await call('GET', '/vendor/shop', { token: customer });
  check('isolation: a customer cannot open the vendor area (403)', r.status === 403, r.status);
  r = await call('GET', '/vendor/shop', { token: admin });
  check('isolation: platform staff are not vendors (403)', r.status === 403, r.status);
  r = await call('GET', '/vendor/shop');
  check('isolation: anonymous gets 401', r.status === 401, r.status);

  // Not visible while vendors are pending
  const search = (o) => call('GET', `/search/products?${q({ q: `QA Saffron ${RUN}`, limit: 50, ...o })}`);
  r = await search({});
  check("storefront: pending vendors' products are not listed", r.status === 200 && r.data.data.length === 0, r.data?.data?.length);
  r = await call('GET', `/products/${pA.id}`);
  check("storefront: pending vendor's product page is 404", r.status === 404, r.status);

  // Approve both (admin endpoints are covered by the marketplace-admin suite)
  await db.query(`update "Vendor" set status='ACTIVE', "approvedAt"=now() where "userId" in ($1,$2)`, [A.user.id, B.user.id]);

  // ================= 4. LOCATION SEARCH =================
  r = await search({});
  check('search: approved vendors appear in the shared storefront', r.data.data.length === 2 && r.data.data.every((p) => p.shop?.name), r.data.data.map((p) => p.shop?.name));
  check('search: works without a location (no distances)', r.data.data.every((p) => p.distanceKm === null) && r.data.meta.location === null);
  r = await search({ ...RIYADH });
  check('search: from Riyadh, the Riyadh shop ranks first', r.data.data[0]?.shop.id === shopA.id && r.data.data[0].distanceKm < 5, r.data.data.map((p) => [p.shop.name, p.distanceKm]));
  check('search: distance to the Jeddah shop ≈ 846 km', Math.abs((r.data.data.find((p) => p.shop.id === shopB.id)?.distanceKm ?? 0) - 846) < 10, r.data.data.map((p) => p.distanceKm));
  r = await search({ ...JEDDAH });
  check('search: changing location to Jeddah puts the Jeddah shop first', r.data.data[0]?.shop.id === shopB.id, r.data.data.map((p) => p.shop.name));
  r = await search({ ...RIYADH, radiusKm: 50 });
  check('search: 50 km radius from Riyadh excludes Jeddah', r.data.data.length === 1 && r.data.data[0].shop.id === shopA.id, r.data.data.map((p) => p.shop.name));
  r = await search({ radiusKm: 50 });
  check('search: radius without a location is rejected (400)', r.status === 400, r.status);
  r = await search({ ...JEDDAH, sort: 'nearest' });
  check('search: nearest sort', r.data.data.map((p) => p.shop.id).join() === [shopB.id, shopA.id].join(), r.data.data.map((p) => p.distanceKm));
  r = await search({ ...RIYADH, sort: 'price_asc' });
  check('search: price low→high (B $18 before A $20)', r.data.data[0]?.id === pB.id, r.data.data.map((p) => p.price));
  r = await search({ ...RIYADH, fulfillment: 'pickup' });
  check('search: pickup filter', r.data.data.length === 2);
  r = await search({ ...RIYADH });
  check('search: delivery to you computed (A yes within 30 km, B no outside 50 km)',
    r.data.data.find((p) => p.shop.id === shopA.id)?.deliversToYou === true && r.data.data.find((p) => p.shop.id === shopB.id)?.deliversToYou === false,
    r.data.data.map((p) => [p.shop.name, p.deliversToYou]));

  // Relevance beats proximity: a weak match next door vs a strong match far away
  const weak = (await product(A.token, { name: `QA Kitchen Spoon ${RUN}`, sku: 'QA-SPOON', description: `spoon for saffron tea QA Saffron ${RUN}` })).data;
  await adjust(A.token, weak.id, 5);
  r = await call('GET', `/search/products?${q({ q: `QA Saffron ${RUN}`, ...RIYADH, limit: 50 })}`);
  const ranked = r.data.data.map((p) => p.id);
  check('search: a strong match far away outranks a weak match next door', ranked.indexOf(pB.id) < ranked.indexOf(weak.id) && ranked.indexOf(weak.id) !== -1, r.data.data.map((p) => [p.name, p.relevance, p.distanceKm]));

  // Out of stock / unpublished / suspended
  await adjust(B.token, pB.id, 0);
  r = await search({});
  check('search: out-of-stock products hidden by default', !r.data.data.some((p) => p.id === pB.id));
  r = await search({ includeOutOfStock: true });
  check('search: out-of-stock shown when asked, with available 0', r.data.data.find((p) => p.id === pB.id)?.available === 0);
  await adjust(B.token, pB.id, 10);
  const unpub = new FormData(); unpub.append('isActive', 'false');
  await call('PATCH', `/vendor/products/${pA.id}`, { token: A.token, form: unpub });
  r = await search({});
  check('search: unpublished product hidden', !r.data.data.some((p) => p.id === pA.id));
  const pub = new FormData(); pub.append('isActive', 'true');
  await call('PATCH', `/vendor/products/${pA.id}`, { token: A.token, form: pub });
  await db.query(`update "Vendor" set status='SUSPENDED' where "userId"=$1`, [B.user.id]);
  r = await search({});
  check("search: suspended vendor's products disappear", !r.data.data.some((p) => p.shop.id === shopB.id));
  await db.query(`update "Vendor" set status='ACTIVE' where "userId"=$1`, [B.user.id]);
  r = await call('GET', `/search/shops?${q({ ...RIYADH, radiusKm: 1000 })}`);
  check('search: nearby shops ordered by distance', r.status === 200 && r.data.findIndex((s) => s.id === shopA.id) < r.data.findIndex((s) => s.id === shopB.id), r.data.map?.((s) => [s.name, s.distanceKm]));
  r = await call('GET', `/geo/lookup?q=21442`);
  check('geo: postcode lookup', r.status === 200 && Math.abs(r.data.latitude - JEDDAH.lat) < 0.01, r.data);
  r = await call('GET', `/geo/lookup?q=nowhere-${RUN}`);
  check('geo: unknown place → 400 with a helpful message', r.status === 400 && r.data.errors?.q, r.data);
  r = await call('GET', '/products?limit=100');
  check('regression: original platform catalogue still listed', r.data.data.some((p) => p.shop?.id === 'shop_platform'), r.data.data.length);

  // ================= 5. MULTI-VENDOR CHECKOUT =================
  const addr = (await call('POST', '/addresses', { token: customer, body: { recipientName: 'QA Buyer', line1: '5 Olaya St', city: 'Riyadh', postalCode: '11564', country: 'SA', phone: '+966511111111' } })).data;
  check('checkout: address geocoded on save', addr.latitude && addr.geocodedAt, addr);
  const basket = [{ productId: pA.id, quantity: 2 }, { productId: pB.id, quantity: 1 }];

  r = await call('POST', '/orders/quote', { token: customer, body: { items: basket, shippingAddressId: addr.id } });
  check('checkout: delivery from Jeddah shop refused outside its 50 km radius', r.status === 400 && /only delivers within 50 km/.test(r.data.errors?.fulfillment), r.data);
  const fulfillment = [{ shopId: shopB.id, method: 'PICKUP' }];
  r = await call('POST', '/orders/quote', { token: customer, body: { items: basket, shippingAddressId: addr.id, fulfillment } });
  const quote = r.data;
  check('checkout: quote grouped by shop', r.status === 201 && quote.groups.length === 2, r.data);
  const gA = quote.groups?.find((g) => g.shopId === shopA.id), gB = quote.groups?.find((g) => g.shopId === shopB.id);
  check('checkout: A delivers (platform default $25 shipping), B pickup free', gA?.fulfillmentMethod === 'DELIVERY' && gA.shippingTotal === 25 && gB?.fulfillmentMethod === 'PICKUP' && gB.shippingTotal === 0, { gA, gB });
  check('checkout: KSA 15% tax per shop', gA?.taxTotal === Math.round((40 + 25) * 0.15 * 100) / 100 && gB?.taxTotal === Math.round(18 * 0.15 * 100) / 100, { a: gA?.taxTotal, b: gB?.taxTotal });
  check('checkout: 10% commission on goods, vendor net = total − commission', gA?.commissionAmount === 4 && gA?.vendorNet === Math.round((gA.total - 4) * 100) / 100, gA);
  check('checkout: totals add up across shops', Math.abs(quote.total - (gA.total + gB.total)) < 0.001, quote);

  const key = `${TAG}-key-1`;
  const place = (k) => call('POST', '/orders', { token: customer, body: { items: basket, shippingAddressId: addr.id, fulfillment, paymentMethod: 'cod', idempotencyKey: k } });
  const [o1, o2] = await Promise.all([place(key), place(key)]);
  check('checkout: two simultaneous submissions with one key → one order', o1.status === 201 && o2.status === 201 && o1.data.id === o2.data.id, [o1.status, o2.status, o1.data?.id, o2.data?.id]);
  const order = o1.data;
  r = await place(key);
  check('checkout: retry with the same key returns the same order', r.data.id === order.id);
  check('checkout: exactly one order and stock taken once',
    (await db.query(`select count(*)::int n from "Order" where "idempotencyKey"=$1`, [key])).rows[0].n === 1 &&
    (await db.query(`select quantity from "Inventory" where "productId"=$1`, [pA.id])).rows[0].quantity === 8, null);
  check('checkout: one order, one sub-order per shop', order.vendorOrders?.length === 2 && Number(order.total) === quote.total, order.vendorOrders);
  const voA = order.vendorOrders.find((v) => v.shopId === shopA.id), voB = order.vendorOrders.find((v) => v.shopId === shopB.id);
  const snap = (await db.query(`select "productName", sku, "shopId" from "OrderItem" where "orderId"=$1 order by sku`, [order.id])).rows;
  check('checkout: order items carry a snapshot and their shop', snap.every((s) => s.productName && s.sku && s.shopId), snap);
  const rename = new FormData(); rename.append('name', 'Renamed later');
  await call('PATCH', `/vendor/products/${pA.id}`, { token: A.token, form: rename });
  check('checkout: renaming the product later does not rewrite the order',
    (await db.query(`select "productName" from "OrderItem" where "orderId"=$1 and "productId"=$2`, [order.id, pA.id])).rows[0].productName === `QA Saffron ${RUN}`);

  // ================= 6. VENDOR FULFILMENT & ISOLATION OF ORDERS =================
  r = await call('GET', '/vendor/orders', { token: A.token });
  const seenByA = r.data.data.find((v) => v.order.id === order.id);
  check("orders: vendor A sees its sub-order, only its own items", seenByA && seenByA.items.length === 1 && seenByA.items[0].productId === pA.id, seenByA);
  check('orders: vendor sees delivery address + phone but not customer email',
    seenByA?.order.shippingAddress?.line1 === '5 Olaya St' && !JSON.stringify(seenByA).includes(`${TAG}-buyer@example.test`), seenByA?.order);
  r = await call('GET', `/vendor/orders/${voB.id}`, { token: A.token });
  check("orders: vendor A cannot open B's sub-order (404)", r.status === 404, r.status);
  r = await call('PATCH', `/vendor/orders/${voB.id}`, { token: A.token, body: { status: 'CANCELLED' } });
  check("orders: vendor A cannot cancel B's sub-order (404)", r.status === 404, r.status);
  r = await call('GET', `/vendor/orders/${voB.id}`, { token: B.token });
  check('orders: pickup sub-order hides the home address from the shop', r.data.order.shippingAddress === null, r.data.order);

  r = await call('PATCH', `/vendor/orders/${voA.id}`, { token: A.token, body: { status: 'PROCESSING' } });
  check('fulfilment: shop accepts its cash-on-delivery order', r.status === 200 && r.data.status === 'PROCESSING', r);
  r = await call('GET', `/orders/me/${order.id}`, { token: customer });
  check('fulfilment: checkout status = least advanced shop (PENDING)', r.data.status === 'PENDING', r.data.status);
  r = await call('PATCH', `/vendor/orders/${voB.id}`, { token: B.token, body: { status: 'CANCELLED' } });
  check('fulfilment: B cancels its part', r.status === 200 && r.data.status === 'CANCELLED', r);
  check("fulfilment: cancelling B restocks B only (10)", (await db.query(`select quantity from "Inventory" where "productId"=$1`, [pB.id])).rows[0].quantity === 10 && (await db.query(`select quantity from "Inventory" where "productId"=$1`, [pA.id])).rows[0].quantity === 8);
  r = await call('GET', `/orders/me/${order.id}`, { token: customer });
  check('fulfilment: checkout now follows A (PROCESSING)', r.data.status === 'PROCESSING', r.data.status);
  r = await call('PATCH', `/vendor/orders/${voA.id}`, { token: A.token, body: { status: 'SHIPPED', carrier: 'QA Express', trackingNumber: `TRK${RUN}` } });
  check('fulfilment: shipped with tracking creates a shipment', r.data.status === 'SHIPPED' && r.data.shipments?.[0]?.awb === `TRK${RUN}`, r.data);
  r = await call('PATCH', `/vendor/orders/${voA.id}`, { token: A.token, body: { status: 'PENDING' } });
  check('fulfilment: vendor cannot move an order backwards (400)', r.status === 400, r.status);
  await call('PATCH', `/vendor/orders/${voA.id}`, { token: A.token, body: { status: 'DELIVERED' } });
  r = await call('GET', `/orders/me/${order.id}`, { token: customer });
  check('fulfilment: delivered + cancelled shops → checkout DELIVERED', r.data.status === 'DELIVERED', r.data.status);
  r = await call('GET', `/orders/${order.id}`, { token: admin });
  check('admin: sees both sub-orders with shops', r.data.vendorOrders?.length === 2 && r.data.vendorOrders.every((v) => v.shop?.name), r.data.vendorOrders);

  // Payouts: cash on delivery is settled once everything live is delivered —
  // for what was actually collected (B's cancelled share never was).
  const pay = (await db.query(`select status, amount::float8 amount from "Payment" where "orderId"=$1`, [order.id])).rows[0];
  check('cod: payment settled automatically on delivery, for the delivered share only', pay.status === 'PAID' && Math.abs(pay.amount - voA.total) < 0.001, { pay, want: voA.total });
  r = await call('GET', '/vendor/payouts', { token: A.token });
  check("payouts: A's delivered net is payable", Math.abs(r.data.balance - voA.vendorNet) < 0.001 && r.data.payableOrders === 1, { got: r.data, want: voA.vendorNet });
  r = await call('GET', '/vendor/payouts', { token: B.token });
  check('payouts: B (cancelled) has nothing payable', r.data.balance === 0, r.data);
  r = await call('GET', '/vendor/analytics?days=7', { token: A.token });
  check('analytics: sales and top product reported', r.status === 200 && r.data.grossSales > 0 && r.data.topProducts[0]?.productId === pA.id && r.data.daily.length === 7, r.data);

  // Clearing an optional field (multipart sends an empty value)
  const withCompare = new FormData(); withCompare.append('compareAtPrice', '30');
  await call('PATCH', `/vendor/products/${pA.id}`, { token: A.token, form: withCompare });
  const cleared = new FormData(); cleared.append('compareAtPrice', ''); cleared.append('barcode', '');
  r = await call('PATCH', `/vendor/products/${pA.id}`, { token: A.token, form: cleared });
  check('products: an empty value clears an optional field', r.status === 200 && r.data.compareAtPrice === null && r.data.barcode === null, { s: r.status, c: r.data?.compareAtPrice, b: r.data?.barcode });
  const emptyPrice = new FormData(); emptyPrice.append('price', '');
  r = await call('PATCH', `/vendor/products/${pA.id}`, { token: A.token, form: emptyPrice });
  check('products: required price cannot be blanked to 0', r.status === 400 || Number(r.data?.price) === 20, { s: r.status, p: r.data?.price });

  // ================= 7. CHECKOUT FAILURES =================
  r = await call('POST', '/orders', { token: customer, body: { items: [{ productId: pA.id, quantity: 999 }], shippingAddressId: addr.id, paymentMethod: 'cod' } });
  check('consistency: overselling rejected, nothing created', r.status === 400 && (await db.query(`select quantity from "Inventory" where "productId"=$1`, [pA.id])).rows[0].quantity === 8, r.data);
  r = await call('POST', '/orders', { token: customer, body: { items: basket, shippingAddressId: addr.id, paymentMethod: 'cod' } });
  check('consistency: one shop failing (radius) fails the whole checkout, no stock taken', r.status === 400 && (await db.query(`select quantity from "Inventory" where "productId"=$1`, [pA.id])).rows[0].quantity === 8, r.data);
  r = await call('POST', '/orders', { token: customer, body: { items: basket, shippingAddressId: addr.id, paymentMethod: 'cod', fulfillment: [{ shopId: shopA.id, method: 'PICKUP' }, { shopId: shopB.id, method: 'PICKUP' }] } });
  const o3 = r.data;
  check('checkout: pickup from both shops', r.status === 201 && o3.vendorOrders.every((v) => v.fulfillmentMethod === 'PICKUP' && Number(v.shippingTotal) === 0), r.data);
  r = await call('PATCH', `/orders/${o3.id}`, { token: admin, body: { status: 'CANCELLED' } });
  check('consistency: admin cancels whole checkout → both shops cancelled, stock restored',
    r.data.status === 'CANCELLED' && r.data.vendorOrders.every((v) => v.status === 'CANCELLED') &&
    (await db.query(`select quantity from "Inventory" where "productId"=$1`, [pA.id])).rows[0].quantity === 8, r.data?.vendorOrders);

  const after = (await db.query(`select (select count(*) from "Product" where "shopId"='shop_platform')::int p`)).rows[0];
  check('migration safety: platform catalogue untouched', after.p === before.p, { before, after });
}

async function cleanup() {
  if (!db) return;
  try {
    const shops = (await db.query(`select s.id from "Shop" s join "Vendor" v on v.id=s."vendorId" join "User" u on u.id=v."userId" where u.email like $1`, [`${TAG}%`])).rows.map((r) => r.id);
    const orders = (await db.query(`select distinct o.id from "Order" o join "Customer" c on c.id=o."customerId" where c.email like $1`, [`${TAG}%`])).rows.map((r) => r.id);
    await db.query(`delete from "Order" where id = any($1)`, [orders]);
    await db.query(`delete from "Product" where "shopId" = any($1)`, [shops]);
    await db.query(`delete from "Customer" where email like $1`, [`${TAG}%`]);
    await db.query(`delete from "User" where email like $1`, [`${TAG}%`]);
    await db.query(`delete from "Notification" where title like $1`, ['Refund due:%QA%']);
    const left = (await db.query(`select (select count(*) from "User" where email like $1)::int u, (select count(*) from "Shop" where name like $2)::int s`, [`${TAG}%`, `QA %${RUN}`])).rows[0];
    console.log(`cleanup: users left ${left.u}, shops left ${left.s}`);
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
