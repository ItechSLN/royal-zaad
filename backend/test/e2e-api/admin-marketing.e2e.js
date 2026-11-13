// End-to-end API checks for the marketing & catalogue-support admin area:
// coupons, promotions, campaigns, CMS, reviews, contact messages, brands,
// categories and variants — plus their storefront touch points (coupon at
// checkout, promotion pricing, public reviews, contact form).
// Run: NODE_PATH=backend/node_modules node backend/test/e2e-api/admin-marketing.e2e.js backend/.env
require('dotenv').config({ path: process.argv[2] });
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const API = process.env.API_URL ?? 'http://localhost:8080/api/v1';
const RUN = Date.now().toString(36);
const P = `qa-marketing-${RUN}`; // prefix for every record this suite creates
const results = [];
const created = { orders: [], products: [], users: [] };
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
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  -> ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 300)}` : ''}`);
}

async function registerCustomer(tag) {
  const email = `${P}-${tag}@example.test`;
  const r = await call('POST', '/auth/register', {
    body: { email, password: 'Qa-Passw0rd!', firstName: 'QA', lastName: tag },
  });
  if (r.data?.user?.id) created.users.push(r.data.user.id);
  return { ...r, email };
}

/** 401 anonymously and 403 for a customer — the staff-only contract. */
async function staffOnly(label, method, path, body, customer) {
  const anon = await call(method, path, { body });
  const cust = await call(method, path, { token: customer, body });
  check(`${label}: anonymous rejected (401)`, anon.status === 401, anon);
  check(`${label}: customer rejected (403)`, cust.status === 403, cust);
}

const iso = (offsetDays) => new Date(Date.now() + offsetDays * 86_400_000).toISOString();
const is400 = (r, field) => r.status === 400 && (!field || (r.data.errors && r.data.errors[field]));

async function main() {
  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  // ---- setup: dedicated QA admin + two customers ----
  const adminRole = (await db.query(`select id from "Role" where name='Admin'`)).rows[0];
  const adminEmail = `${P}-admin@example.test`;
  const adminId = `qa_marketing_admin_${RUN}`;
  await db.query(
    `insert into "User"(id,email,"passwordHash","firstName","lastName","roleId","updatedAt") values($1,$2,$3,'QA','Admin',$4,now())`,
    [adminId, adminEmail, await bcrypt.hash('Qa-Admin-Passw0rd!', 10), adminRole.id],
  );
  created.users.push(adminId);

  let r = await call('POST', '/auth/admin/signin', { body: { email: adminEmail, password: 'Qa-Admin-Passw0rd!' } });
  check('setup: QA admin signs in', r.status === 201 && r.data.token, r);
  const admin = r.data.token;

  const c1 = await registerCustomer('buyer');
  const buyer = c1.data.token;
  const c2 = await registerCustomer('other');
  const other = c2.data.token;
  check('setup: customers registered', buyer && other, { c1: c1.status, c2: c2.status });

  // ================= BRANDS =================
  await staffOnly('brands create', 'POST', '/brands', { name: `${P} brand`, slug: `${P}-brand` }, buyer);
  r = await call('POST', '/brands', { token: admin, body: { name: '', slug: '' } });
  check('brands: missing name/slug -> 400 with field errors', is400(r, 'name') && r.data.errors.slug, r);
  r = await call('POST', '/brands', { token: admin, body: { name: `${P} brand`, slug: `${P}-brand`, description: 'QA brand' } });
  check('brands: create', r.status === 201 && r.data.id, r);
  const brand = r.data;
  r = await call('POST', '/brands', { token: admin, body: { name: `${P} brand 2`, slug: `${P}-brand` } });
  check('brands: duplicate slug -> 400 (not 500)', is400(r, 'slug'), r);
  r = await call('GET', '/brands?page=1&limit=100');
  check('brands: public list has data/meta shape', r.status === 200 && Array.isArray(r.data.data) && r.data.meta?.total >= 1, r.status);
  r = await call('PATCH', `/brands/${brand.id}`, { token: admin, body: { name: `${P} brand renamed`, slug: `${P}-brand`, description: 'edited' } });
  check('brands: edit', r.status === 200 && r.data.name === `${P} brand renamed`, r);
  await staffOnly('brands update', 'PATCH', `/brands/${brand.id}`, { name: 'x' }, buyer);
  await staffOnly('brands delete', 'DELETE', `/brands/${brand.id}`, undefined, buyer);
  r = await call('PATCH', `/brands/does-not-exist`, { token: admin, body: { name: 'x' } });
  check('brands: edit unknown id -> 404', r.status === 404, r);

  // ================= CATEGORIES =================
  await staffOnly('categories create', 'POST', '/categories', { name: 'x', slug: `${P}-x` }, buyer);
  r = await call('POST', '/categories', { token: admin, body: { name: '', slug: '' } });
  check('categories: missing name/slug -> 400 with field errors', is400(r, 'name'), r);
  r = await call('POST', '/categories', { token: admin, body: { name: `${P} top`, slug: `${P}-top`, sortOrder: 99, isVisible: true, showInNav: true, isFeatured: false, description: 'QA top' } });
  check('categories: create top-level', r.status === 201 && r.data.id && r.data.parentId === null, r);
  const topCat = r.data;
  r = await call('POST', '/categories', { token: admin, body: { name: `${P} sub`, slug: `${P}-sub`, parentId: topCat.id, sortOrder: 1 } });
  check('categories: create sub-category', r.status === 201 && r.data.parentId === topCat.id, r);
  const subCat = r.data;
  r = await call('POST', '/categories', { token: admin, body: { name: `${P} hidden`, slug: `${P}-hidden`, parentId: topCat.id, sortOrder: 2, isVisible: false } });
  check('categories: create hidden sub-category', r.status === 201 && r.data.isVisible === false, r);
  const hiddenCat = r.data;
  r = await call('POST', '/categories', { token: admin, body: { name: `${P} deep`, slug: `${P}-deep`, parentId: subCat.id } });
  check('categories: third nesting level rejected (400)', r.status === 400, r);
  r = await call('POST', '/categories', { token: admin, body: { name: `${P} dup`, slug: `${P}-top` } });
  check('categories: duplicate slug -> 400 (not 500)', is400(r, 'slug'), r);
  r = await call('POST', '/categories', { token: admin, body: { name: `${P} orphan`, slug: `${P}-orphan`, parentId: 'nope' } });
  check('categories: unknown parent -> 4xx (not 500)', r.status >= 400 && r.status < 500, r);
  r = await call('PATCH', `/categories/${topCat.id}`, { token: admin, body: { parentId: topCat.id } });
  check('categories: own parent rejected (400)', r.status === 400, r);
  r = await call('PATCH', `/categories/${topCat.id}`, { token: admin, body: { isFeatured: true, description: 'QA edited' } });
  check('categories: edit (feature on homepage, description)', r.status === 200 && r.data.isFeatured === true && r.data.description === 'QA edited', r);
  r = await call('GET', '/categories/tree');
  let topNode = r.data.find?.((c) => c.id === topCat.id);
  check('categories: admin tree lists both children', topNode?.children?.length === 2, topNode);
  r = await call('GET', '/categories/tree?visible=true');
  topNode = r.data.find?.((c) => c.id === topCat.id);
  check('categories: storefront tree (visible=true) hides hidden sub-categories',
    topNode && !topNode.children.some((c) => c.id === hiddenCat.id), topNode?.children?.map((c) => c.name));
  r = await call('GET', `/categories?scope=${topCat.id}&limit=50`);
  check('categories: list by parent scope', r.status === 200 && r.data.data.length === 2, r.data);
  r = await call('GET', `/categories?scope=${topCat.id}&visible=true&limit=50`);
  check('categories: list visible=true hides hidden', r.status === 200 && r.data.data.length === 1, r.data?.data?.map?.((c) => c.name));
  r = await call('PATCH', `/categories/${hiddenCat.id}`, { token: admin, body: { parentId: null } });
  check('categories: sub-category can be moved back to top level (parentId null)', r.status === 200 && r.data.parentId === null, r);
  await staffOnly('categories update', 'PATCH', `/categories/${topCat.id}`, { name: 'x' }, buyer);
  await staffOnly('categories delete', 'DELETE', `/categories/${hiddenCat.id}`, undefined, buyer);
  await staffOnly('categories image upload', 'POST', `/categories/${topCat.id}/image`, undefined, buyer);
  r = await call('DELETE', `/categories/${topCat.id}`, { token: admin });
  check('categories: delete with sub-categories refused (400)', r.status === 400, r);
  r = await call('DELETE', `/categories/${hiddenCat.id}`, { token: admin });
  check('categories: delete empty category', r.status === 200, r);

  // ---- product used by the storefront-side checks ----
  const f = new FormData();
  for (const [k, v] of Object.entries({
    name: `${P} product`, slug: `${P}-product`, sku: `QA-MKT-${RUN}`, price: '100.00', costPrice: '40.00',
    categoryId: subCat.id, brandId: brand.id, isActive: 'true',
  })) f.append(k, v);
  r = await call('POST', '/products', { token: admin, form: f });
  check('setup: QA product created under QA brand/category', r.status === 201 && r.data.id, r);
  const product = r.data;
  created.products.push(product.id);
  const inv = (await db.query(`select id from "Inventory" where "productId"=$1`, [product.id])).rows[0];
  r = await call('POST', `/inventory/${inv.id}/adjust`, { token: admin, body: { reason: 'RECEIPT', quantity: 20, note: 'QA stock' } });
  check('setup: stock 20', r.status === 201 && r.data.quantity === 20, r);

  r = await call('DELETE', `/brands/${brand.id}`, { token: admin });
  check('brands: delete while a product references it refused (400)', r.status === 400, r);
  r = await call('DELETE', `/categories/${subCat.id}`, { token: admin });
  check('categories: delete while products are mapped refused (400)', r.status === 400, r);
  r = await call('GET', `/categories?scope=top&limit=200`);
  const topRow = r.data.data?.find((c) => c.id === topCat.id);
  check('categories: top-level product count rolls up sub-categories', topRow?._count?.products === 1, topRow?._count);

  // ================= VARIANTS =================
  await staffOnly('variants create', 'POST', `/products/${product.id}/variants`, { name: 'x', sku: 'x', price: 1 }, buyer);
  r = await call('POST', `/products/${product.id}/variants`, { token: admin, body: { name: '', price: -1 } });
  check('variants: invalid payload -> 400 with field errors', is400(r, 'name') && r.data.errors.sku && r.data.errors.price, r);
  r = await call('POST', `/products/${product.id}/variants`, { token: admin, body: { name: '500g', sku: `QA-MKT-${RUN}-500`, price: 120, costPrice: 50, quantity: 4 } });
  check('variants: create', r.status === 201 && r.data.id && r.data.productId === product.id, r);
  const variant = r.data;
  r = await call('POST', `/products/${product.id}/variants`, { token: admin, body: { name: '1kg', sku: `QA-MKT-${RUN}-1KG`, price: 200, costPrice: 90, isActive: false } });
  check('variants: create inactive variant', r.status === 201 && r.data.isActive === false, r);
  const inactiveVariant = r.data;
  r = await call('POST', `/products/${product.id}/variants`, { token: admin, body: { name: 'dup', sku: `QA-MKT-${RUN}-500`, price: 1 } });
  check('variants: duplicate SKU -> 400 (not 500)', is400(r, 'sku'), r);
  r = await call('POST', `/products/does-not-exist/variants`, { token: admin, body: { name: 'x', sku: `QA-MKT-${RUN}-X`, price: 1 } });
  check('variants: unknown product -> 404', r.status === 404, r);
  r = await call('GET', `/products/${product.id}/variants`, { token: admin });
  check('variants: staff list includes cost price and inactive variants', r.status === 200 && r.data.length === 2 && Number(r.data[0].costPrice) === 50, r.data);
  r = await call('GET', `/products/${product.id}/variants`);
  check('variants: public list hides cost price', r.status === 200 && r.data.every((v) => v.costPrice === undefined), r.data);
  check('variants: public list hides inactive variants', r.status === 200 && !r.data.some((v) => v.id === inactiveVariant.id), r.data?.map?.((v) => v.name));
  r = await call('GET', `/variants/${variant.id}`);
  check('variants: public single variant hides cost price', r.status === 200 && r.data.costPrice === undefined, r.data);
  r = await call('GET', `/variants/${inactiveVariant.id}`);
  check('variants: inactive variant not reachable publicly (404)', r.status === 404, r.status);
  r = await call('PATCH', `/variants/${variant.id}`, { token: admin, body: { price: 125, quantity: 6 } });
  check('variants: edit', r.status === 200 && Number(r.data.price) === 125 && r.data.quantity === 6, r);
  await staffOnly('variants update', 'PATCH', `/variants/${variant.id}`, { price: 1 }, buyer);
  await staffOnly('variants delete', 'DELETE', `/variants/${variant.id}`, undefined, buyer);
  r = await call('DELETE', `/variants/${inactiveVariant.id}`, { token: admin });
  check('variants: delete', r.status === 200, r);

  // ================= COUPONS =================
  const coupon = (over = {}) => ({ code: `${P}-c`, discountType: 'PERCENTAGE', discountValue: 10, startsAt: iso(-1), isActive: true, ...over });
  await staffOnly('coupons create', 'POST', '/coupons', coupon(), buyer);
  await staffOnly('coupons list', 'GET', '/coupons', undefined, buyer);
  r = await call('POST', '/coupons', { token: admin, body: { code: '', discountType: 'BOGUS', discountValue: 0 } });
  check('coupons: invalid payload -> 400 with field errors', is400(r, 'code') && r.data.errors.discountType && r.data.errors.discountValue && r.data.errors.startsAt, r);
  r = await call('POST', '/coupons', { token: admin, body: coupon({ discountValue: 150 }) });
  check('coupons: percentage over 100 rejected (400)', is400(r, 'discountValue'), r);
  r = await call('POST', '/coupons', { token: admin, body: coupon({ code: `${P}-badwin`, startsAt: iso(5), expiresAt: iso(1) }) });
  check('coupons: expiry before start rejected (400)', is400(r, 'expiresAt'), r);

  // The admin page sends dates as yyyy-mm-dd and numbers as numbers.
  const today = new Date().toISOString().slice(0, 10);
  r = await call('POST', '/coupons', { token: admin, body: { code: `${P}-pct`.toLowerCase(), description: 'QA 10%', discountType: 'PERCENTAGE', discountValue: 10, startsAt: today, isActive: true } });
  check('coupons: create (as the admin page sends it, code upper-cased)', r.status === 201 && r.data.code === `${P}-PCT`.toUpperCase(), r);
  const pct = r.data;
  r = await call('POST', '/coupons', { token: admin, body: coupon({ code: `${P}-PCT` }) });
  check('coupons: duplicate code (case-insensitive) -> 400', is400(r, 'code'), r);
  r = await call('POST', '/coupons', { token: admin, body: coupon({ code: `${P}-fixed`, discountType: 'FIXED_AMOUNT', discountValue: 15, minimumPurchase: 150 }) });
  const fixed = r.data;
  r = await call('POST', '/coupons', { token: admin, body: coupon({ code: `${P}-once`, discountValue: 5, usageLimit: 1 }) });
  const once = r.data;
  r = await call('POST', '/coupons', { token: admin, body: coupon({ code: `${P}-expired`, startsAt: iso(-10), expiresAt: iso(-1) }) });
  const expired = r.data;
  r = await call('POST', '/coupons', { token: admin, body: coupon({ code: `${P}-future`, startsAt: iso(3) }) });
  const future = r.data;
  r = await call('POST', '/coupons', { token: admin, body: coupon({ code: `${P}-off`, isActive: false }) });
  const off = r.data;
  check('coupons: fixture coupons created', [fixed, once, expired, future, off].every((c) => c?.id), [fixed, once, expired, future, off].map((c) => c?.id ?? c));

  r = await call('PATCH', `/coupons/${once.id}`, { token: admin, body: { code: pct.code } });
  check('coupons: renaming onto an existing code -> 400 (not 500)', is400(r, 'code'), r);
  r = await call('PATCH', `/coupons/${pct.id}`, { token: admin, body: { description: 'QA 10% edited', expiresAt: iso(30) } });
  check('coupons: edit', r.status === 200 && r.data.description === 'QA 10% edited' && r.data.expiresAt, r);
  r = await call('PATCH', `/coupons/${pct.id}`, { token: admin, body: { expiresAt: iso(-30) } });
  check('coupons: edit expiry to before start rejected (400)', is400(r, 'expiresAt'), r);
  await staffOnly('coupons update', 'PATCH', `/coupons/${pct.id}`, { description: 'x' }, buyer);
  await staffOnly('coupons delete', 'DELETE', `/coupons/${pct.id}`, undefined, buyer);
  r = await call('GET', '/coupons?page=1&limit=50', { token: admin });
  check('coupons: admin list shape (data/meta, usageCount)', r.status === 200 && r.data.data.some((c) => c.id === pct.id && c.usageCount === 0), r.status);

  r = await call('GET', `/coupons/validate?code=${pct.code.toLowerCase()}&subtotal=100`);
  check('coupons: public preview applies 10%', r.status === 200 && r.data.discount === 10 && r.data.total === 90, r);
  check('coupons: public preview does not leak usage/limits', r.data.usageLimit === undefined && r.data.usageCount === undefined, r.data);
  for (const [c, why] of [[expired, 'expired'], [future, 'not yet active'], [off, 'inactive']]) {
    r = await call('GET', `/coupons/validate?code=${c.code}&subtotal=100`);
    check(`coupons: ${why} coupon refused (400 couponCode)`, is400(r, 'couponCode'), r);
  }
  r = await call('GET', `/coupons/validate?code=${fixed.code}&subtotal=100`);
  check('coupons: below minimum purchase refused (400)', is400(r, 'couponCode'), r);
  r = await call('GET', `/coupons/validate?code=${P}-NOPE&subtotal=100`);
  check('coupons: unknown code refused (400)', is400(r, 'couponCode'), r);

  // Checkout: quote + order
  r = await call('POST', '/addresses', { token: buyer, body: { recipientName: 'QA Buyer', line1: '1 Test St', city: 'Austin', postalCode: '73301', country: 'US' } });
  const address = r.data;
  r = await call('POST', '/addresses', { token: other, body: { recipientName: 'QA Other', line1: '2 Test St', city: 'Austin', postalCode: '73301', country: 'US' } });
  const otherAddress = r.data;
  check('setup: addresses saved', address?.id && otherAddress?.id, { address, otherAddress });

  r = await call('POST', '/orders/quote', { token: buyer, body: { items: [{ productId: product.id, quantity: 2 }], couponCode: fixed.code } });
  check('checkout: quote with fixed coupon over minimum (200 >= 150) -> 15 off', r.status === 201 && r.data.subtotal === 200 && r.data.discountTotal === 15, r.data);
  r = await call('POST', '/orders/quote', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }], couponCode: fixed.code } });
  check('checkout: quote below coupon minimum refused (400 couponCode)', is400(r, 'couponCode'), r);
  r = await call('POST', '/orders/quote', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }], couponCode: expired.code } });
  check('checkout: quote with expired coupon refused (400)', is400(r, 'couponCode'), r);

  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddressId: address.id, paymentMethod: 'card', couponCode: once.code } });
  check('checkout: order with single-use coupon placed, 5% off charged', r.status === 201 && Number(r.data.discountTotal) === 5, r.data?.discountTotal ?? r);
  const order1 = r.data;
  if (order1?.id) created.orders.push(order1.id);
  r = await call('GET', `/coupons/${once.id}`, { token: admin });
  check('coupons: redemption counted (usageCount 1)', r.data.usageCount === 1, r.data);
  r = await call('POST', '/orders', { token: other, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddressId: otherAddress.id, paymentMethod: 'card', couponCode: once.code } });
  check('checkout: usage limit reached -> order refused (400)', is400(r, 'couponCode'), r);
  if (r.data?.id) created.orders.push(r.data.id);

  r = await call('DELETE', `/coupons/${once.id}`, { token: admin });
  check('coupons: deleting a coupon used by an order fails cleanly (4xx, not 500)', r.status >= 400 && r.status < 500, r);

  r = await call('PATCH', `/orders/${order1.id}`, { token: admin, body: { status: 'CANCELLED' } });
  r = await call('GET', `/coupons/${once.id}`, { token: admin });
  check('coupons: cancelling the order releases the redemption', r.data.usageCount === 0, r.data);

  // Concurrency: two orders racing for the last redemption must not both succeed.
  r = await call('POST', '/coupons', { token: admin, body: coupon({ code: `${P}-race`, discountValue: 5, usageLimit: 1 }) });
  const race = r.data;
  const [ra, rb] = await Promise.all([
    call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddressId: address.id, paymentMethod: 'card', couponCode: race.code } }),
    call('POST', '/orders', { token: other, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddressId: otherAddress.id, paymentMethod: 'card', couponCode: race.code } }),
  ]);
  for (const x of [ra, rb]) if (x.data?.id) created.orders.push(x.data.id);
  const raceUsage = (await db.query(`select "usageCount" from "Coupon" where id=$1`, [race.id])).rows[0].usageCount;
  check('coupons: concurrent redemptions cannot exceed usage limit', [ra, rb].filter((x) => x.status === 201).length === 1 && raceUsage === 1,
    { a: ra.status, b: rb.status, usage: raceUsage, ea: ra.data?.errors ?? ra.data?.message, eb: rb.data?.errors ?? rb.data?.message });

  r = await call('DELETE', `/coupons/${off.id}`, { token: admin });
  check('coupons: delete unused coupon', r.status === 200, r);

  // ================= PROMOTIONS =================
  const promo = (over = {}) => ({ name: `${P} promo`, discountType: 'PERCENTAGE', discountValue: 20, startsAt: iso(-1), endsAt: iso(5), isActive: true, productIds: [product.id], ...over });
  await staffOnly('promotions create', 'POST', '/promotions', promo(), buyer);
  r = await call('POST', '/promotions', { token: admin, body: { name: '', discountType: 'X', discountValue: -1 } });
  check('promotions: invalid payload -> 400 with field errors', is400(r, 'name') && r.data.errors.discountType && r.data.errors.startsAt && r.data.errors.endsAt, r);
  r = await call('POST', '/promotions', { token: admin, body: promo({ endsAt: iso(-3) }) });
  check('promotions: end before start rejected (400)', is400(r, 'endsAt'), r);
  r = await call('POST', '/promotions', { token: admin, body: promo({ discountValue: 101 }) });
  check('promotions: percentage over 100 rejected (400)', is400(r, 'discountValue'), r);
  r = await call('POST', '/promotions', { token: admin, body: promo({ productIds: ['does-not-exist'] }) });
  check('promotions: unknown product id -> 400 (not 404/500)', is400(r, 'productIds'), r);

  r = await call('POST', '/promotions', { token: admin, body: promo({ isActive: false, name: `${P} draft promo` }) });
  check('promotions: create inactive promotion', r.status === 201 && r.data.products.length === 1, r);
  const draftPromo = r.data;
  r = await call('POST', '/orders/quote', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }] } });
  check('promotions: inactive promotion does not change the price', r.data.lines?.[0]?.unitPrice === 100, r.data);
  r = await call('POST', '/promotions', { token: admin, body: promo({ name: `${P} future promo`, startsAt: iso(2), endsAt: iso(9) }) });
  const futurePromo = r.data;
  r = await call('POST', '/orders/quote', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }] } });
  check('promotions: future promotion does not change the price yet', r.data.lines?.[0]?.unitPrice === 100, r.data);

  r = await call('GET', '/promotions?page=1&limit=100');
  check('promotions: public list hides inactive and not-yet-started promotions',
    r.status === 200 && !r.data.data.some((p) => p.id === draftPromo.id || p.id === futurePromo.id), r.data?.data?.map?.((p) => p.name));
  r = await call('GET', '/promotions?page=1&limit=100', { token: admin });
  check('promotions: admin list shows every promotion with products', r.status === 200 && [draftPromo.id, futurePromo.id].every((id) => r.data.data.some((p) => p.id === id && p.products.length === 1)), r.status);

  // Admin page sends yyyy-mm-dd; an end date of today must still cover today.
  r = await call('POST', '/promotions', { token: admin, body: promo({ name: `${P} live promo`, startsAt: today, endsAt: today }) });
  check('promotions: create live promotion (date-only window ending today)', r.status === 201, r);
  const livePromo = r.data;
  r = await call('POST', '/orders/quote', { token: buyer, body: { items: [{ productId: product.id, quantity: 2 }] } });
  check('promotions: live 20% promotion lowers the checkout unit price (100 -> 80)', r.data.lines?.[0]?.unitPrice === 80 && r.data.subtotal === 160, r.data);
  r = await call('GET', '/promotions?page=1&limit=100');
  check('promotions: public list shows the live promotion', r.data.data?.some((p) => p.id === livePromo.id), r.status);

  r = await call('POST', '/orders/quote', { token: buyer, body: { items: [{ productId: product.id, quantity: 2 }], couponCode: pct.code } });
  check('promotions + coupon: coupon applies to the promoted subtotal (160 - 16)', r.data.subtotal === 160 && r.data.discountTotal === 16, r.data);

  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddressId: address.id, paymentMethod: 'card' } });
  check('promotions: order is charged the promoted price', r.status === 201 && Number(r.data.subtotal) === 80, r.data?.subtotal ?? r);
  const order2 = r.data;
  if (order2?.id) created.orders.push(order2.id);

  r = await call('PATCH', `/promotions/${livePromo.id}`, { token: admin, body: { isActive: false } });
  check('promotions: deactivate (status toggle) keeps its products', r.status === 200 && r.data.isActive === false && r.data.products.length === 1, r.data);
  r = await call('POST', '/orders/quote', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }] } });
  check('promotions: deactivated promotion no longer lowers the price', r.data.lines?.[0]?.unitPrice === 100, r.data);
  r = await call('PATCH', `/promotions/${livePromo.id}`, { token: admin, body: { endsAt: iso(-5) } });
  check('promotions: edit end before start rejected (400)', is400(r, 'endsAt'), r);
  await staffOnly('promotions update', 'PATCH', `/promotions/${livePromo.id}`, { name: 'x' }, buyer);
  await staffOnly('promotions delete', 'DELETE', `/promotions/${livePromo.id}`, undefined, buyer);
  for (const p of [draftPromo, futurePromo, livePromo]) {
    r = await call('DELETE', `/promotions/${p.id}`, { token: admin });
    check(`promotions: delete ${p.name.replace(`${P} `, '')}`, r.status === 200, r);
  }

  // ================= REVIEWS =================
  r = await call('POST', '/reviews', { body: { productId: product.id, rating: 5 } });
  check('reviews: anonymous create rejected (401)', r.status === 401, r);
  r = await call('POST', '/reviews', { token: other, body: { productId: product.id, rating: 5, content: 'never bought it' } });
  check('reviews: customer without a purchase rejected (400)', is400(r, 'productId'), r);
  r = await call('POST', '/reviews', { token: buyer, body: { productId: product.id, rating: 5, content: 'unpaid order' } });
  check('reviews: unpaid/pending order does not count as a purchase (400)', is400(r, 'productId'), r);
  await call('PATCH', `/orders/${order2.id}`, { token: admin, body: { status: 'PROCESSING' } });
  r = await call('POST', '/reviews', { token: buyer, body: { productId: product.id, rating: 6 } });
  check('reviews: rating out of range -> 400', is400(r, 'rating'), r);
  r = await call('POST', '/reviews', { token: buyer, body: { productId: product.id, rating: 5, title: `${P} title`, content: 'Wonderful honey, QA.' } });
  check('reviews: verified buyer creates review (pending)', r.status === 201 && r.data.isApproved === false, r);
  const review = r.data;
  r = await call('POST', '/reviews', { token: buyer, body: { productId: product.id, rating: 4 } });
  check('reviews: second review of same product rejected (400)', is400(r, 'productId'), r);

  r = await call('GET', `/reviews?productId=${product.id}`);
  check('reviews: pending review hidden from storefront list', r.status === 200 && r.data.data.length === 0 && r.data.averageRating === 0, r.data);
  r = await call('GET', `/reviews/${review.id}`);
  check('reviews: pending review not reachable by direct id (404)', r.status === 404, r.status);
  r = await call('GET', '/reviews/featured?limit=50');
  check('reviews: pending review not featured', r.status === 200 && !r.data.some((x) => x.id === review.id), r.status);
  r = await call('GET', `/reviews`);
  check('reviews: storefront list requires productId (400)', r.status === 400, r);
  r = await call('GET', '/reviews/featured?limit=abc');
  check('reviews: featured with bad limit is not a 500', r.status < 500, r.status);

  await staffOnly('reviews admin list', 'GET', '/reviews/admin', undefined, buyer);
  await staffOnly('reviews approve', 'PATCH', `/reviews/admin/${review.id}/approval`, { isApproved: true }, buyer);
  await staffOnly('reviews admin delete', 'DELETE', `/reviews/admin/${review.id}`, undefined, buyer);
  r = await call('GET', `/reviews/admin?page=1&limit=20&productId=${product.id}`, { token: admin });
  check('reviews: admin queue lists it with customer email and product', r.status === 200 && r.data.data[0]?.id === review.id && r.data.data[0].customer.email === c1.email && r.data.data[0].product.sku && typeof r.data.meta.pendingCount === 'number', r.data);
  r = await call('PATCH', `/reviews/admin/${review.id}/approval`, { token: admin, body: { isApproved: 'yes' } });
  check('reviews: approval with non-boolean -> 400', r.status === 400, r);
  r = await call('PATCH', `/reviews/admin/${review.id}/approval`, { token: admin, body: { isApproved: true } });
  check('reviews: admin approves', r.status === 200 && r.data.isApproved === true, r);
  r = await call('GET', `/reviews?productId=${product.id}`);
  check('reviews: approved review visible on product page (avg 5)', r.data.data.length === 1 && r.data.averageRating === 5, r.data);
  check('reviews: public review does not leak customer email', r.data.data[0] && r.data.data[0].customer.email === undefined, r.data.data[0]?.customer);
  r = await call('GET', '/reviews/featured?limit=50');
  check('reviews: approved 5-star review featured', r.data.some((x) => x.id === review.id), r.status);

  r = await call('PATCH', `/reviews/${review.id}`, { token: other, body: { rating: 1 } });
  check("reviews: another customer cannot edit someone's review (403)", r.status === 403, r);
  r = await call('DELETE', `/reviews/${review.id}`, { token: other });
  check("reviews: another customer cannot delete someone's review (403)", r.status === 403, r);
  r = await call('PATCH', `/reviews/${review.id}`, { token: buyer, body: { content: 'Edited after approval' } });
  check('reviews: edited review goes back to moderation', r.status === 200 && r.data.isApproved === false, r.data);
  r = await call('GET', `/reviews?productId=${product.id}`);
  check('reviews: edited (unmoderated) text not shown publicly', r.data.data.length === 0, r.data);
  r = await call('PATCH', `/reviews/${review.id}`, { token: buyer, body: { isApproved: true } });
  check('reviews: customer cannot self-approve (400)', r.status === 400, r);
  r = await call('DELETE', `/reviews/admin/${review.id}`, { token: admin });
  check('reviews: admin deletes review', r.status === 200, r);

  // ================= CONTACT / MESSAGES =================
  r = await call('POST', '/contact', { body: { name: '', email: 'nope', message: 'short' } });
  check('contact: invalid form -> 400 with field errors', is400(r, 'name') && r.data.errors.email && r.data.errors.message, r);
  r = await call('POST', '/contact', { body: { name: `${P} visitor`, email: `${P}-v@example.test`, message: 'I would like to know more about wholesale.', status: 'RESOLVED' } });
  check('contact: public cannot set admin-only fields (400)', r.status === 400, r);
  r = await call('POST', '/contact', { body: { name: `${P} visitor`, email: `${P}-v@example.test`, topic: 'WHOLESALE', subject: 'Wholesale', message: 'I would like to know more about wholesale.' } });
  check('contact: storefront form submits (201, status NEW)', r.status === 201 && r.data.status === 'NEW', r);
  const msg = r.data;
  check('contact: public response does not expose internal note/handler', !msg.internalNote && !msg.handledById, msg);
  await staffOnly('contact inbox', 'GET', '/contact', undefined, buyer);
  await staffOnly('contact update', 'PATCH', `/contact/${msg.id}`, { status: 'RESOLVED' }, buyer);
  await staffOnly('contact delete', 'DELETE', `/contact/${msg.id}`, undefined, buyer);
  r = await call('GET', `/contact?limit=100&search=${encodeURIComponent(P)}`, { token: admin });
  check('contact: inbox lists it with status counts', r.status === 200 && r.data.data.some((m) => m.id === msg.id) && typeof r.data.meta.byStatus === 'object', r.data);
  r = await call('GET', '/contact?status=BOGUS', { token: admin });
  check('contact: unknown status filter -> 400 (not 500)', r.status === 400, r.status);
  r = await call('PATCH', `/contact/${msg.id}`, { token: admin, body: { status: 'IN_PROGRESS' } });
  check('contact: mark in progress stamps respondedAt', r.status === 200 && r.data.status === 'IN_PROGRESS' && r.data.respondedAt, r);
  r = await call('PATCH', `/contact/${msg.id}`, { token: admin, body: { status: 'DONE' } });
  check('contact: invalid status -> 400', is400(r, 'status'), r);
  r = await call('DELETE', `/contact/${msg.id}`, { token: admin });
  check('contact: delete message', r.status === 200, r);

  // ================= CAMPAIGNS =================
  await staffOnly('campaigns list', 'GET', '/campaigns', undefined, buyer);
  await staffOnly('campaigns create', 'POST', '/campaigns', { name: 'x' }, buyer);
  r = await call('POST', '/campaigns', { token: admin, body: { name: '', channel: 'FAX' } });
  check('campaigns: invalid payload -> 400 with field errors', is400(r, 'name') && r.data.errors.channel, r);
  // Exactly what toCampaign() produces from the admin form.
  r = await call('POST', '/campaigns', { token: admin, body: { name: `${P} campaign`, channel: 'EMAIL', audience: 'all', subject: 'QA subject', preview: 'QA preview', sendAt: new Date(today).toISOString(), alwaysOn: false, status: 'SCHEDULED' } });
  check('campaigns: create', r.status === 201 && r.data.status === 'SCHEDULED' && r.data.subject === 'QA subject', r);
  const campaign = r.data;
  r = await call('GET', '/campaigns?channel=EMAIL&limit=100', { token: admin });
  check('campaigns: list filtered by channel', r.status === 200 && r.data.data.some((c) => c.id === campaign.id), r.status);
  r = await call('GET', '/campaigns?channel=FAX', { token: admin });
  check('campaigns: unknown channel filter -> 400 (not 500)', r.status === 400, r.status);
  r = await call('PATCH', `/campaigns/${campaign.id}`, { token: admin, body: { status: 'LIVE', alwaysOn: true } });
  check('campaigns: edit status', r.status === 200 && r.data.status === 'LIVE' && r.data.alwaysOn === true && r.data.subject === 'QA subject', r);
  await staffOnly('campaigns delete', 'DELETE', `/campaigns/${campaign.id}`, undefined, buyer);
  r = await call('DELETE', `/campaigns/${campaign.id}`, { token: admin });
  check('campaigns: delete', r.status === 200, r);

  // ================= CMS =================
  await staffOnly('cms list', 'GET', '/cms', undefined, buyer);
  await staffOnly('cms create', 'POST', '/cms', { title: 'x' }, buyer);
  r = await call('POST', '/cms', { token: admin, body: { title: '' } });
  check('cms: missing title -> 400', is400(r, 'title'), r);
  r = await call('POST', '/cms', { token: admin, body: { title: `${P} post`, slug: `${P}-post`, author: 'Mariam Zayed', category: 'Journal', body: 'QA body', excerpt: 'QA excerpt', shoppable: true, status: 'DRAFT' } });
  check('cms: create post', r.status === 201 && r.data.slug === `${P}-post`, r);
  const post = r.data;
  r = await call('POST', '/cms', { token: admin, body: { title: `${P} post`, slug: `${P}-post` } });
  check('cms: duplicate slug -> 400 (not 500)', is400(r, 'slug'), r);
  r = await call('POST', '/cms', { token: admin, body: { title: `${P} no slug` } });
  check('cms: post without slug gets one generated (not 500)', r.status === 201 && r.data.slug === `${P}-no-slug`, r);
  const post2 = r.data;
  r = await call('GET', '/cms?status=PUBLISHED&limit=100', { token: admin });
  check('cms: list filtered by status', r.status === 200 && !r.data.data.some((p) => p.id === post.id), r.status);
  r = await call('GET', '/cms?status=LIVE', { token: admin });
  check('cms: unknown status filter -> 400 (not 500)', r.status === 400, r.status);
  r = await call('PATCH', `/cms/${post.id}`, { token: admin, body: { status: 'PUBLISHED', publishAt: new Date().toISOString() } });
  check('cms: publish post', r.status === 200 && r.data.status === 'PUBLISHED' && r.data.body === 'QA body', r);
  r = await call('PATCH', `/cms/${post.id}`, { token: admin, body: { status: 'ARCHIVED' } });
  check('cms: invalid status -> 400', is400(r, 'status'), r);
  await staffOnly('cms delete', 'DELETE', `/cms/${post.id}`, undefined, buyer);
  for (const p of [post, post2]) {
    if (!p?.id) continue;
    r = await call('DELETE', `/cms/${p.id}`, { token: admin });
    check(`cms: delete ${p.slug}`, r.status === 200, r);
  }

  // ---- tear-down of catalogue fixtures through the API ----
  for (const id of created.orders) await db.query(`delete from "Order" where id=$1`, [id]);
  created.orders = [];
  r = await call('DELETE', `/products/${product.id}`, { token: admin });
  if (r.status === 200) created.products = [];
  r = await call('DELETE', `/categories/${subCat.id}`, { token: admin });
  check('categories: delete sub-category once empty', r.status === 200, r);
  r = await call('DELETE', `/categories/${topCat.id}`, { token: admin });
  check('categories: delete top-level once empty', r.status === 200, r);
  r = await call('DELETE', `/brands/${brand.id}`, { token: admin });
  check('brands: delete once unreferenced', r.status === 200, r);
}

async function cleanup() {
  if (!db) return;
  const like = `${P}%`;
  try {
    for (const id of created.orders) await db.query(`delete from "Order" where id=$1`, [id]);
    await db.query(`delete from "Order" where "customerId" in (select id from "Customer" where email like $1)`, [like]);
    await db.query(`delete from "Review" where "productId" in (select id from "Product" where sku like $1)`, [`QA-MKT-${RUN}%`]);
    await db.query(`delete from "ProductVariant" where sku like $1`, [`QA-MKT-${RUN}%`]);
    await db.query(`delete from "Product" where sku like $1`, [`QA-MKT-${RUN}%`]);
    await db.query(`delete from "Promotion" where name like $1`, [like]);
    await db.query(`delete from "Coupon" where code like $1`, [like.toUpperCase()]);
    await db.query(`delete from "Campaign" where name like $1`, [like]);
    await db.query(`delete from "CmsPost" where slug like $1`, [like]);
    await db.query(`delete from "ContactMessage" where name like $1`, [like]);
    await db.query(`delete from "Notification" where title like $1`, [`New enquiry from ${like}`]);
    await db.query(`delete from "Category" where slug like $1 and "parentId" is not null`, [like]);
    await db.query(`delete from "Category" where slug like $1`, [like]);
    await db.query(`delete from "Brand" where slug like $1`, [like]);
    await db.query(`delete from "Customer" where email like $1`, [like]);
    for (const id of created.users) await db.query(`delete from "User" where id=$1`, [id]);
    await db.query(`delete from "User" where email like $1`, [like]);

    const leftovers = (await db.query(`
      select (select count(*) from "Coupon" where code ilike 'qa-marketing-%')
           + (select count(*) from "Promotion" where name like 'qa-marketing-%')
           + (select count(*) from "Campaign" where name like 'qa-marketing-%')
           + (select count(*) from "CmsPost" where slug like 'qa-marketing-%')
           + (select count(*) from "ContactMessage" where name like 'qa-marketing-%')
           + (select count(*) from "Notification" where title like 'New enquiry from qa-marketing-%')
           + (select count(*) from "Category" where slug like 'qa-marketing-%')
           + (select count(*) from "Brand" where slug like 'qa-marketing-%')
           + (select count(*) from "Product" where sku like 'QA-MKT-%')
           + (select count(*) from "Customer" where email like 'qa-marketing-%')
           + (select count(*) from "User" where email like 'qa-marketing-%') as n`)).rows[0].n;
    check('cleanup: no qa-marketing-* rows left behind', Number(leftovers) === 0, `${leftovers} left`);
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
