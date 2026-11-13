// End-to-end API test: marketplace administration — vendors, shop location,
// moderation, reports, payouts, platform settings, public shop pages.
// Run: NODE_PATH=backend/node_modules node backend/test/e2e-api/marketplace-admin.e2e.js backend/.env
require('dotenv').config({ path: process.argv[2] });
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');

const API = process.env.API_URL ?? 'http://localhost:8080/api/v1';
const BACKEND_LOG = process.env.BACKEND_LOG;
const RUN = Date.now().toString(36);
const PASS = 'Qa-Passw0rd!';
const round2 = (n) => Math.round(n * 100) / 100;
const results = [];
const created = { orders: [], users: [], roles: [] };
let db;
let settingsBefore = [];

const mailLogged = (to, subject) =>
  !!BACKEND_LOG && fs.readFileSync(BACKEND_LOG, 'utf8').split('\n').some((l) => l.includes(`[mail:dev] to=${to}`) && l.includes(subject));
const waitFor = async (fn, ms = 3000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 150)); } return false; };

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(API + path, { method, headers, body: payload });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function check(name, ok, detail = '') {
  results.push({ ok: !!ok, name, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  -> ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 400)}` : ''}`);
}
const mailCheck = async (name, to, subject) => {
  if (!BACKEND_LOG) return; // only checkable when the backend log is available
  check(name, await waitFor(() => mailLogged(to, subject)), 'not in log');
};
const q1 = async (sql, params) => (await db.query(sql, params)).rows[0];

async function makeUser(tag, roleId, { verified = true } = {}) {
  const id = `qa_${tag}_${RUN}`;
  const email = `qa-${tag}-${RUN}@example.test`;
  await db.query(
    `insert into "User"(id,email,"passwordHash","firstName","lastName","roleId","emailVerifiedAt","updatedAt") values($1,$2,$3,'QA',$4,$5,$6,now())`,
    [id, email, await bcrypt.hash(PASS, 10), tag, roleId, verified ? new Date() : null],
  );
  created.users.push(id);
  return { id, email };
}

async function makeVendor(tag, vendorRoleId, { verified = true, city = 'Riyadh', postalCode = '12345' } = {}) {
  const user = await makeUser(tag, vendorRoleId, { verified });
  const vendorId = `qa_vendor_${tag}_${RUN}`;
  const shopId = `qa_shop_${tag}_${RUN}`;
  const slug = `qa-shop-${tag}-${RUN}`;
  await db.query(`insert into "Vendor"(id,"userId",status,"updatedAt") values($1,$2,'PENDING',now())`, [vendorId, user.id]);
  await db.query(
    `insert into "Shop"(id,"vendorId",name,slug,description,email,phone,"addressLine1",city,"postalCode",country,"openingHours","offersPickup","updatedAt")
     values($1,$2,$3,$4,'QA shop description','shop@example.test','+966500000001','1 King Fahd Rd',$5,$6,'SA',$7,true,now())`,
    [shopId, vendorId, `QA Shop ${tag} ${RUN}`, slug, city, postalCode, JSON.stringify({ mon: '09:00-18:00' })],
  );
  return { ...user, vendorId, shopId, slug };
}

async function makeProduct(tag, shopId, categoryId, { moderationStatus = 'APPROVED', price = 40 } = {}) {
  const id = `qa_prod_${tag}_${RUN}`;
  await db.query(
    `insert into "Product"(id,name,slug,sku,"shopId","moderationStatus",price,"categoryId","isActive","updatedAt")
     values($1,$2,$3,$4,$5,$6,$7,$8,true,now())`,
    [id, `QA Product ${tag} ${RUN}`, `qa-prod-${tag}-${RUN}`, `QA-${tag}-${RUN}`, shopId, moderationStatus, price, categoryId],
  );
  await db.query(`insert into "Inventory"(id,"productId",quantity,"updatedAt") values($1,$2,50,now())`, [`qa_inv_${tag}_${RUN}`, id]);
  return id;
}

const visible = async (shopId, productId) => {
  const r = await call('GET', `/products?shopId=${shopId}&limit=100`);
  return r.status === 200 && r.data.data.some((p) => p.id === productId);
};

async function main() {
  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  settingsBefore = (await db.query(`select key, value from "Setting" where key in ('marketplace_commission_rate','marketplace_require_product_approval')`)).rows;

  // ---------------- setup ----------------
  const adminRole = await q1(`select id from "Role" where name='Admin'`);
  const vendorRole = await q1(`select id from "Role" where name='Vendor' and kind='VENDOR'`);
  check('setup: Vendor role exists', !!vendorRole);
  const staffRoleId = `qa_role_${RUN}`;
  await db.query(`insert into "Role"(id,name,kind,"updatedAt") values($1,$2,'STAFF',now())`, [staffRoleId, `qa-staff-${RUN}`]);
  created.roles.push(staffRoleId);

  const adminU = await makeUser('admin', adminRole.id);
  const staffU = await makeUser('staff', staffRoleId);
  let r = await call('POST', '/auth/admin/signin', { body: { email: adminU.email, password: PASS } });
  check('setup: admin signs in', r.status === 201 && r.data.token, r);
  const admin = r.data.token;
  r = await call('POST', '/auth/admin/signin', { body: { email: staffU.email, password: PASS } });
  check('setup: non-admin staff signs in', r.status === 201 && r.data.token, r);
  const staff = r.data.token;

  const A = await makeVendor('va', vendorRole.id);
  const B = await makeVendor('vb', vendorRole.id, { verified: false });
  const C = await makeVendor('vc', vendorRole.id, { city: 'Nowhereville', postalCode: '00000' });
  r = await call('POST', '/auth/vendor/signin', { body: { email: A.email, password: PASS } });
  check('setup: vendor signs in', r.status === 201 && r.data.token, r);
  const vendor = r.data.token;

  const custEmail = `qa-buyer-${RUN}@example.test`;
  r = await call('POST', '/auth/register', { body: { email: custEmail, password: PASS, firstName: 'QA', lastName: 'Buyer' } });
  check('setup: customer registers', r.status === 201 && r.data.token, r);
  if (r.data?.user?.id) created.users.push(r.data.user.id);
  const buyer = r.data.token;

  const cats = (await call('GET', '/categories?limit=100')).data;
  const category = (cats.data ?? cats).find((c) => c.parentId) ?? (cats.data ?? cats)[0];
  const A1 = await makeProduct('a1', A.shopId, category.id);
  const A2 = await makeProduct('a2', A.shopId, category.id);
  const A3 = await makeProduct('a3', A.shopId, category.id, { moderationStatus: 'PENDING_REVIEW' });

  // ================= VENDORS: authz =================
  const adminWrites = [
    ['PATCH', `/admin/vendors/${A.vendorId}/status`, { status: 'ACTIVE' }],
    ['PATCH', `/admin/vendors/${A.vendorId}/commission`, { commissionRate: 5 }],
    ['PATCH', `/admin/shops/${A.shopId}/location`, { latitude: 1, longitude: 1 }],
    ['POST', '/admin/payouts', { vendorId: A.vendorId }],
    ['PATCH', '/admin/payouts/nope', { status: 'CANCELLED' }],
    ['PATCH', '/admin/marketplace/settings', { requireProductApproval: false }],
  ];
  const staffReads = ['/admin/vendors', `/admin/vendors/${A.vendorId}`, '/admin/moderation/products', '/admin/reports', '/admin/payouts', '/admin/payouts/balances', '/admin/marketplace/settings'];

  for (const path of staffReads) {
    r = await call('GET', path);
    check(`authz: GET ${path} anonymous -> 401`, r.status === 401, r.status);
    r = await call('GET', path, { token: buyer });
    check(`authz: GET ${path} customer -> 403`, r.status === 403, r.status);
    r = await call('GET', path, { token: vendor });
    check(`authz: GET ${path} vendor -> 403`, r.status === 403, r.status);
    r = await call('GET', path, { token: staff });
    check(`authz: GET ${path} non-admin staff -> 200`, r.status === 200, r);
  }
  for (const [method, path, body] of adminWrites) {
    r = await call(method, path, { body });
    check(`authz: ${method} ${path} anonymous -> 401`, r.status === 401, r.status);
    r = await call(method, path, { token: buyer, body });
    check(`authz: ${method} ${path} customer -> 403`, r.status === 403, r.status);
    r = await call(method, path, { token: vendor, body });
    check(`authz: ${method} ${path} vendor -> 403`, r.status === 403, r.status);
    r = await call(method, path, { token: staff, body });
    check(`authz: ${method} ${path} non-admin staff -> 403`, r.status === 403, r.status);
  }
  r = await call('PATCH', `/admin/moderation/products/${A3}`, { token: vendor, body: { moderationStatus: 'APPROVED' } });
  check('authz: vendor cannot moderate (403)', r.status === 403, r.status);
  r = await call('PATCH', `/admin/reports/nope`, { token: buyer, body: { status: 'DISMISSED', resolution: 'x' } });
  check('authz: customer cannot resolve reports (403)', r.status === 403, r.status);
  check('authz: nothing changed by refused calls', (await q1(`select status from "Vendor" where id=$1`, [A.vendorId])).status === 'PENDING');

  // ================= VENDORS: list & detail =================
  r = await call('GET', `/admin/vendors?q=${encodeURIComponent(`QA Shop`)}&limit=100`, { token: staff });
  const ours = r.data.data?.filter((v) => [A.vendorId, B.vendorId, C.vendorId].includes(v.id)) ?? [];
  check('vendors: search by shop name finds the QA vendors', r.status === 200 && ours.length === 3, r.data?.meta);
  check('vendors: list has {data, meta} pagination', r.data.meta && r.data.meta.page === 1 && r.data.meta.limit === 100 && typeof r.data.meta.total === 'number', r.data.meta);
  const la = ours.find((v) => v.id === A.vendorId);
  check('vendors: list item has user, shop summary and stats',
    la && la.user.email === A.email && la.user.emailVerifiedAt && la.shop.slug === A.slug && la.shop.city === 'Riyadh' && la.shop.locationVerifiedAt === null &&
    la.stats.productCount === 3 && la.stats.orderCount === 0 && la.stats.grossSales === 0, la);
  check('vendors: list never exposes password hash', !JSON.stringify(r.data).includes('passwordHash'));
  r = await call('GET', `/admin/vendors?q=${encodeURIComponent(B.email)}`, { token: staff });
  check('vendors: search by vendor email', r.data.data?.length === 1 && r.data.data[0].id === B.vendorId, r.data);
  r = await call('GET', `/admin/vendors?status=PENDING&q=${RUN}&limit=100`, { token: staff });
  check('vendors: status filter', r.status === 200 && r.data.data.length === 3 && r.data.data.every((v) => v.status === 'PENDING'), r.data?.data?.length);
  r = await call('GET', `/admin/vendors?status=BOGUS`, { token: staff });
  check('vendors: unknown status filter rejected (400)', r.status === 400, r);
  r = await call('GET', `/admin/vendors/${A.vendorId}`, { token: staff });
  check('vendors: detail with full shop and recent sub-orders',
    r.status === 200 && r.data.shop.addressLine1 === '1 King Fahd Rd' && r.data.shop.postalCode === '12345' && Array.isArray(r.data.recentSubOrders) && r.data.stats.productCount === 3, r.data);
  r = await call('GET', `/admin/vendors/qa_missing_${RUN}`, { token: staff });
  check('vendors: unknown vendor 404', r.status === 404, r.status);

  // ================= VENDORS: status validation =================
  check('storefront: pending vendor products hidden', !(await visible(A.shopId, A1)));
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/status`, { token: admin, body: { status: 'PENDING' } });
  check('status: PENDING is not a target (400)', r.status === 400, r);
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/status`, { token: admin, body: {} });
  check('status: missing status (400)', r.status === 400, r);
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/status`, { token: admin, body: { status: 'REJECTED' } });
  check('status: reject without reason (400)', r.status === 400 && r.data.errors?.reason, r);
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/status`, { token: admin, body: { status: 'REJECTED', reason: '   ' } });
  check('status: blank reason (400)', r.status === 400 && r.data.errors?.reason, r);
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/status`, { token: admin, body: { status: 'SUSPENDED', reason: 'x' } });
  check('status: PENDING -> SUSPENDED not allowed (400)', r.status === 400, r);
  r = await call('PATCH', `/admin/vendors/vendor_platform/status`, { token: admin, body: { status: 'SUSPENDED', reason: 'qa' } });
  check('status: platform vendor cannot be changed (400)', r.status === 400, r);
  check('status: platform vendor still ACTIVE', (await q1(`select status from "Vendor" where id='vendor_platform'`)).status === 'ACTIVE');
  r = await call('PATCH', `/admin/vendors/qa_missing_${RUN}/status`, { token: admin, body: { status: 'ACTIVE' } });
  check('status: unknown vendor 404', r.status === 404, r.status);

  // ================= VENDORS: approval (geocoding) =================
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/status`, { token: admin, body: { status: 'ACTIVE' } });
  check('approve: vendor A approved', r.status === 200 && r.data.vendor.status === 'ACTIVE' && /approved/i.test(r.data.message), r);
  check('approve: approvedAt set', !!r.data.vendor?.approvedAt, r.data.vendor);
  check('approve: shop geocoded (Riyadh fixture) and location verified',
    r.data.vendor?.shop.latitude === 24.7136 && r.data.vendor?.shop.longitude === 46.6753 && !!r.data.vendor?.shop.locationVerifiedAt, r.data.vendor?.shop);
  const approvedAt = r.data.vendor?.approvedAt;
  check('approve: audit event recorded', !!(await q1(`select id from "AuditEvent" where actor=$1 and action='vendor.approve' and "entityId"=$2`, [adminU.email, A.vendorId])));
  await mailCheck('approve: vendor emailed', A.email, 'is approved');
  check('storefront: approved vendor products visible', await visible(A.shopId, A1));
  check('storefront: pending-review product still hidden', !(await visible(A.shopId, A3)));
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/status`, { token: admin, body: { status: 'ACTIVE' } });
  check('approve: already ACTIVE (400)', r.status === 400, r);

  // B: email not verified, then incomplete address
  r = await call('PATCH', `/admin/vendors/${B.vendorId}/status`, { token: admin, body: { status: 'ACTIVE' } });
  check('approve: unverified email blocks approval (400)', r.status === 400 && r.data.errors?.email, r);
  await db.query(`update "User" set "emailVerifiedAt"=now() where id=$1`, [B.id]);
  await db.query(`update "Shop" set "addressLine1"=null, "postalCode"='' where id=$1`, [B.shopId]);
  r = await call('PATCH', `/admin/vendors/${B.vendorId}/status`, { token: admin, body: { status: 'ACTIVE' } });
  check('approve: missing address blocks approval (400)', r.status === 400 && /address line 1/.test(r.data.errors?.shop) && /postal code/.test(r.data.errors?.shop), r);
  check('approve: blocked vendor still PENDING', (await q1(`select status from "Vendor" where id=$1`, [B.vendorId])).status === 'PENDING');
  await db.query(`update "Shop" set "addressLine1"='2 Olaya St', "postalCode"='12345' where id=$1`, [B.shopId]);
  r = await call('PATCH', `/admin/vendors/${B.vendorId}/status`, { token: admin, body: { status: 'REJECTED', reason: 'QA: documents unclear' } });
  check('reject: PENDING -> REJECTED with reason', r.status === 200 && r.data.vendor.status === 'REJECTED' && r.data.vendor.statusReason === 'QA: documents unclear' && !r.data.vendor.approvedAt, r);
  await mailCheck('reject: vendor emailed', B.email, 'was not approved');
  r = await call('PATCH', `/admin/vendors/${B.vendorId}/status`, { token: admin, body: { status: 'ACTIVE' } });
  check('re-review: REJECTED -> ACTIVE', r.status === 200 && r.data.vendor.status === 'ACTIVE' && r.data.vendor.statusReason === null && !!r.data.vendor.approvedAt, r);

  // C: address cannot be geocoded -> manual coordinates
  r = await call('PATCH', `/admin/vendors/${C.vendorId}/status`, { token: admin, body: { status: 'ACTIVE' } });
  check('approve: ungeocodable address blocks approval (400, points to location endpoint)',
    r.status === 400 && /shops\/.+\/location/.test(r.data.errors?.location), r);
  r = await call('PATCH', `/admin/shops/${C.shopId}/location`, { token: admin, body: { latitude: 91, longitude: 46 } });
  check('location: latitude out of range (400)', r.status === 400 && r.data.errors?.latitude, r);
  r = await call('PATCH', `/admin/shops/${C.shopId}/location`, { token: admin, body: { latitude: 24, longitude: -181 } });
  check('location: longitude out of range (400)', r.status === 400 && r.data.errors?.longitude, r);
  r = await call('PATCH', `/admin/shops/${C.shopId}/location`, { token: admin, body: { latitude: '24' } });
  check('location: non-numeric / missing fields (400)', r.status === 400, r);
  r = await call('PATCH', `/admin/shops/qa_missing_${RUN}/location`, { token: admin, body: { latitude: 24, longitude: 46 } });
  check('location: unknown shop 404', r.status === 404, r.status);
  r = await call('PATCH', `/admin/shops/${C.shopId}/location`, { token: admin, body: { latitude: 24.5, longitude: 46.5 } });
  check('location: admin sets coordinates manually (verified)', r.status === 200 && r.data.latitude === 24.5 && r.data.longitude === 46.5 && !!r.data.locationVerifiedAt, r);
  r = await call('PATCH', `/admin/vendors/${C.vendorId}/status`, { token: admin, body: { status: 'ACTIVE' } });
  check('approve: after manual location, approval succeeds and keeps the manual coordinates',
    r.status === 200 && r.data.vendor.status === 'ACTIVE' && r.data.vendor.shop.latitude === 24.5, r);

  // ================= VENDORS: commission =================
  for (const [body, label] of [[{ commissionRate: 101 }, 'over 100'], [{ commissionRate: -1 }, 'negative'], [{ commissionRate: 'abc' }, 'non-numeric'], [{}, 'missing'], [{ commissionRate: 1.234 }, '3 decimals']]) {
    r = await call('PATCH', `/admin/vendors/${A.vendorId}/commission`, { token: admin, body });
    check(`commission: ${label} rejected (400)`, r.status === 400, r);
  }
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/commission`, { token: admin, body: { commissionRate: null } });
  check('commission: null = platform default', r.status === 200 && r.data.commissionRate === null, r);
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/commission`, { token: admin, body: { commissionRate: 15 } });
  check('commission: set to 15%', r.status === 200 && r.data.commissionRate === 15, r);
  r = await call('PATCH', `/admin/vendors/vendor_platform/commission`, { token: admin, body: { commissionRate: 5 } });
  check('commission: platform vendor refused (400)', r.status === 400, r);

  // ================= VENDORS: suspension =================
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/status`, { token: admin, body: { status: 'SUSPENDED' } });
  check('suspend: reason required (400)', r.status === 400 && r.data.errors?.reason, r);
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/status`, { token: admin, body: { status: 'SUSPENDED', reason: 'QA: policy check' } });
  check('suspend: ACTIVE -> SUSPENDED', r.status === 200 && r.data.vendor.status === 'SUSPENDED' && r.data.openSubOrders === 0 && /hidden/.test(r.data.message), r);
  check('suspend: products hidden from GET /products', !(await visible(A.shopId, A1)) && !(await visible(A.shopId, A2)));
  r = await call('GET', `/products/${A1}`);
  check('suspend: product detail 404 for the public', r.status === 404, r.status);
  r = await call('GET', `/shops/${A.slug}`);
  check('suspend: public shop page 404', r.status === 404, r.status);
  check('suspend: products themselves untouched', (await q1(`select count(*)::int n from "Product" where "shopId"=$1 and "isActive" and "moderationStatus"='APPROVED'`, [A.shopId])).n === 2);
  await mailCheck('suspend: vendor emailed', A.email, 'has been suspended');
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/status`, { token: admin, body: { status: 'REJECTED', reason: 'x' } });
  check('suspend: SUSPENDED -> REJECTED not allowed (400)', r.status === 400, r);
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/status`, { token: admin, body: { status: 'ACTIVE' } });
  check('reactivate: SUSPENDED -> ACTIVE', r.status === 200 && r.data.vendor.status === 'ACTIVE' && /reactivated/.test(r.data.message), r);
  check('reactivate: original approvedAt kept', r.data.vendor?.approvedAt === approvedAt, { before: approvedAt, after: r.data.vendor?.approvedAt });
  check('reactivate: products visible again', await visible(A.shopId, A1));
  check('audit: suspend + reactivate recorded', (await q1(`select count(*)::int n from "AuditEvent" where "entityId"=$1 and action in ('vendor.suspend','vendor.reactivate')`, [A.vendorId])).n === 2);

  // ================= MODERATION =================
  r = await call('GET', `/admin/moderation/products?shopId=${A.shopId}`, { token: staff });
  check('moderation: default queue is PENDING_REVIEW', r.status === 200 && r.data.data.length === 1 && r.data.data[0].id === A3 && r.data.meta.total === 1, r.data);
  const item = r.data.data?.[0];
  check('moderation: item has shop summary, category and primary image slot',
    item && item.shop.id === A.shopId && item.shop.vendor.status === 'ACTIVE' && item.category?.id === category.id && 'image' in item && typeof item.price === 'number', item);
  r = await call('GET', `/admin/moderation/products?moderationStatus=APPROVED&shopId=${A.shopId}`, { token: staff });
  check('moderation: status filter', r.data.data?.length === 2 && r.data.data.every((p) => p.moderationStatus === 'APPROVED'), r.data);
  r = await call('GET', `/admin/moderation/products?moderationStatus=NOPE`, { token: staff });
  check('moderation: unknown status filter (400)', r.status === 400, r);
  r = await call('GET', `/admin/moderation/products`);
  check('moderation: anonymous 401', r.status === 401, r.status);
  r = await call('GET', `/admin/moderation/products`, { token: buyer });
  check('moderation: customer 403', r.status === 403, r.status);

  r = await call('PATCH', `/admin/moderation/products/${A3}`, { token: staff, body: { moderationStatus: 'PENDING_REVIEW' } });
  check('moderation: PENDING_REVIEW not a decision (400)', r.status === 400, r);
  r = await call('PATCH', `/admin/moderation/products/${A3}`, { token: staff, body: { moderationStatus: 'REJECTED' } });
  check('moderation: reject without reason (400)', r.status === 400 && r.data.errors?.reason, r);
  r = await call('PATCH', `/admin/moderation/products/qa_missing_${RUN}`, { token: staff, body: { moderationStatus: 'APPROVED' } });
  check('moderation: unknown product 404', r.status === 404, r.status);
  r = await call('PATCH', `/admin/moderation/products/${A3}`, { token: staff, body: { moderationStatus: 'APPROVED' } });
  check('moderation: staff approves pending product', r.status === 200 && r.data.moderationStatus === 'APPROVED', r);
  check('moderation: approved product now on storefront', await visible(A.shopId, A3));
  r = await call('PATCH', `/admin/moderation/products/${A3}`, { token: staff, body: { moderationStatus: 'REMOVED', reason: 'QA: prohibited item' } });
  check('moderation: remove with reason', r.status === 200 && r.data.moderationStatus === 'REMOVED', r);
  check('moderation: removed product hidden', !(await visible(A.shopId, A3)));
  await mailCheck('moderation: vendor emailed on removal', A.email, 'was removed from the marketplace');
  r = await call('PATCH', `/admin/moderation/products/${A3}`, { token: staff, body: { moderationStatus: 'REJECTED', reason: 'QA: blurry photos' } });
  check('moderation: reject with reason', r.status === 200 && r.data.moderationStatus === 'REJECTED', r);
  await mailCheck('moderation: vendor emailed on rejection', A.email, 'was not approved');
  r = await call('PATCH', `/admin/moderation/products/${A3}`, { token: staff, body: { moderationStatus: 'APPROVED' } });
  check('moderation: restored product visible again', r.status === 200 && (await visible(A.shopId, A3)), r.status);
  check('audit: moderation decisions recorded', (await q1(`select count(*)::int n from "AuditEvent" where "entityId"=$1 and action like 'product.moderate.%'`, [A3])).n === 4);

  // ================= REPORTS =================
  r = await call('POST', '/reports', { body: { targetType: 'PRODUCT', productId: A2, reason: 'FRAUD' } });
  check('reports: anonymous 401', r.status === 401, r.status);
  r = await call('POST', '/reports', { token: buyer, body: { targetType: 'PRODUCT', productId: A2 } });
  check('reports: reason required (400)', r.status === 400 && r.data.errors?.reason, r);
  r = await call('POST', '/reports', { token: buyer, body: { targetType: 'PRODUCT', productId: A2, reason: 'BORING' } });
  check('reports: unknown reason (400)', r.status === 400 && r.data.errors?.reason, r);
  r = await call('POST', '/reports', { token: buyer, body: { targetType: 'PRODUCT', reason: 'FRAUD' } });
  check('reports: product report needs productId (400)', r.status === 400 && r.data.errors?.productId, r);
  r = await call('POST', '/reports', { token: buyer, body: { targetType: 'PRODUCT', productId: A2, shopId: A.shopId, reason: 'FRAUD' } });
  check('reports: both ids rejected (400)', r.status === 400 && r.data.errors?.shopId, r);
  r = await call('POST', '/reports', { token: buyer, body: { targetType: 'SHOP', reason: 'FRAUD' } });
  check('reports: shop report needs shopId (400)', r.status === 400 && r.data.errors?.shopId, r);
  r = await call('POST', '/reports', { token: buyer, body: { targetType: 'USER', reason: 'FRAUD' } });
  check('reports: unknown target type (400)', r.status === 400, r);
  r = await call('POST', '/reports', { token: buyer, body: { targetType: 'PRODUCT', productId: `qa_missing_${RUN}`, reason: 'FRAUD' } });
  check('reports: unknown product 404', r.status === 404, r.status);
  r = await call('POST', '/reports', { token: buyer, body: { targetType: 'PRODUCT', productId: A2, reason: 'COUNTERFEIT', details: 'QA: fake label', reporterId: 'x' } });
  check('reports: reporterId cannot be supplied (400)', r.status === 400, r);
  r = await call('POST', '/reports', { token: buyer, body: { targetType: 'PRODUCT', productId: A2, reason: 'COUNTERFEIT', details: 'QA: fake label' } });
  check('reports: customer reports a product (201)', r.status === 201 && r.data.id && r.data.status === 'OPEN', r);
  check('reports: response does not echo reporter data', r.data && !('reporterId' in r.data) && !('reporter' in r.data), r.data);
  const productReport = r.data.id;
  r = await call('POST', '/reports', { token: buyer, body: { targetType: 'SHOP', shopId: A.shopId, reason: 'MISLEADING' } });
  check('reports: customer reports a shop (201)', r.status === 201, r);
  const shopReport = r.data.id;
  r = await call('POST', '/reports', { token: vendor, body: { targetType: 'SHOP', shopId: B.shopId, reason: 'OTHER', details: 'QA vendor report' } });
  check('reports: any signed-in user (vendor) can report', r.status === 201, r);
  const otherReport = r.data.id;

  r = await call('GET', `/admin/reports?status=OPEN&targetType=PRODUCT&limit=100`, { token: staff });
  const pr = r.data.data?.find((x) => x.id === productReport);
  check('reports admin: filtered list includes the product report with reporter email and names',
    r.status === 200 && pr && pr.reporter.email === custEmail && pr.product.name === `QA Product a2 ${RUN}` && pr.shop.name === `QA Shop va ${RUN}` &&
    r.data.data.every((x) => x.status === 'OPEN' && x.targetType === 'PRODUCT'), pr);
  r = await call('GET', `/admin/reports?targetType=SHOP&limit=100`, { token: staff });
  check('reports admin: SHOP filter', r.data.data?.some((x) => x.id === shopReport) && !r.data.data.some((x) => x.id === productReport), r.status);
  r = await call('GET', `/admin/reports?status=WHATEVER`, { token: staff });
  check('reports admin: bad filter (400)', r.status === 400, r.status);

  r = await call('PATCH', `/admin/reports/${productReport}`, { token: staff, body: { status: 'RESOLVED' } });
  check('reports admin: resolution required (400)', r.status === 400 && r.data.errors?.resolution, r);
  r = await call('PATCH', `/admin/reports/${productReport}`, { token: staff, body: { status: 'OPEN', resolution: 'x' } });
  check('reports admin: OPEN is not a target (400)', r.status === 400, r);
  r = await call('PATCH', `/admin/reports/${productReport}`, { token: staff, body: { status: 'DISMISSED', resolution: 'x', action: 'REMOVE_PRODUCT' } });
  check('reports admin: action only with RESOLVED (400)', r.status === 400 && r.data.errors?.action, r);
  r = await call('PATCH', `/admin/reports/${productReport}`, { token: staff, body: { status: 'RESOLVED', resolution: 'x', action: 'BAN' } });
  check('reports admin: unknown action (400)', r.status === 400, r);
  r = await call('PATCH', `/admin/reports/${shopReport}`, { token: staff, body: { status: 'RESOLVED', resolution: 'x', action: 'REMOVE_PRODUCT' } });
  check('reports admin: REMOVE_PRODUCT on a shop report (400)', r.status === 400, r);
  r = await call('PATCH', `/admin/reports/${shopReport}`, { token: staff, body: { status: 'RESOLVED', resolution: 'QA: suspend', action: 'SUSPEND_VENDOR' } });
  check('reports admin: SUSPEND_VENDOR by non-admin staff (403)', r.status === 403, r);
  check('reports admin: refused action left vendor ACTIVE and report OPEN',
    (await q1(`select status from "Vendor" where id=$1`, [A.vendorId])).status === 'ACTIVE' && (await q1(`select status from "Report" where id=$1`, [shopReport])).status === 'OPEN');
  r = await call('PATCH', `/admin/reports/qa_missing_${RUN}`, { token: staff, body: { status: 'DISMISSED', resolution: 'x' } });
  check('reports admin: unknown report 404', r.status === 404, r.status);

  r = await call('PATCH', `/admin/reports/${productReport}`, { token: staff, body: { status: 'RESOLVED', resolution: 'QA: confirmed counterfeit', action: 'REMOVE_PRODUCT' } });
  check('reports admin: RESOLVED + REMOVE_PRODUCT', r.status === 200 && r.data.status === 'RESOLVED' && r.data.resolution === 'QA: confirmed counterfeit' && !!r.data.resolvedAt && r.data.product.moderationStatus === 'REMOVED', r);
  check('reports admin: removed product hidden from storefront', !(await visible(A.shopId, A2)));
  r = await call('PATCH', `/admin/reports/${productReport}`, { token: staff, body: { status: 'DISMISSED', resolution: 'again' } });
  check('reports admin: already-resolved report locked (400)', r.status === 400, r);
  r = await call('PATCH', `/admin/reports/${otherReport}`, { token: staff, body: { status: 'DISMISSED', resolution: 'QA: no issue' } });
  check('reports admin: dismiss', r.status === 200 && r.data.status === 'DISMISSED', r);
  r = await call('POST', '/reports', { token: buyer, body: { targetType: 'PRODUCT', productId: A2, reason: 'FRAUD' } });
  check('reports: hidden (removed) product cannot be reported (404)', r.status === 404, r.status);
  r = await call('PATCH', `/admin/reports/${shopReport}`, { token: admin, body: { status: 'RESOLVED', resolution: 'QA: repeated complaints', action: 'SUSPEND_VENDOR' } });
  check('reports admin: Admin resolves with SUSPEND_VENDOR', r.status === 200 && r.data.status === 'RESOLVED' && r.data.shop.vendor.status === 'SUSPENDED' && /suspended/i.test(r.data.actionResult), r);
  check('reports admin: suspension hides vendor products', !(await visible(A.shopId, A1)));
  check('audit: report resolution recorded', (await q1(`select count(*)::int n from "AuditEvent" where "entityId" in ($1,$2,$3) and action like 'report.%'`, [productReport, shopReport, otherReport])).n === 3);
  r = await call('PATCH', `/admin/vendors/${A.vendorId}/status`, { token: admin, body: { status: 'ACTIVE' } });
  check('reports: vendor reactivated after review', r.status === 200, r);
  r = await call('PATCH', `/admin/moderation/products/${A2}`, { token: staff, body: { moderationStatus: 'APPROVED' } });
  check('reports: removed product restored by moderation', r.status === 200 && (await visible(A.shopId, A2)), r.status);

  // ================= SETTINGS =================
  r = await call('GET', '/admin/marketplace/settings', { token: staff });
  check('settings: staff reads commission + approval flag', r.status === 200 && typeof r.data.commissionRate === 'number' && typeof r.data.requireProductApproval === 'boolean', r);
  const orig = r.data;
  for (const [body, label] of [[{ commissionRate: 101 }, 'commission > 100'], [{ commissionRate: -5 }, 'negative commission'], [{ commissionRate: '10' }, 'string commission'], [{ requireProductApproval: 'yes' }, 'non-boolean flag'], [{ other: 1 }, 'unknown field']]) {
    r = await call('PATCH', '/admin/marketplace/settings', { token: admin, body });
    check(`settings: ${label} rejected (400)`, r.status === 400, r);
  }
  r = await call('PATCH', '/admin/marketplace/settings', { token: admin, body: { commissionRate: 12.5, requireProductApproval: !orig.requireProductApproval } });
  check('settings: admin updates both', r.status === 200 && r.data.commissionRate === 12.5 && r.data.requireProductApproval === !orig.requireProductApproval, r);
  check('settings: stored under the marketplace keys',
    (await q1(`select value from "Setting" where key='marketplace_commission_rate'`))?.value === '12.5' &&
    (await q1(`select value from "Setting" where key='marketplace_require_product_approval'`))?.value === String(!orig.requireProductApproval));
  r = await call('PATCH', '/admin/marketplace/settings', { token: admin, body: { commissionRate: orig.commissionRate, requireProductApproval: orig.requireProductApproval } });
  check('settings: restored', r.status === 200 && r.data.commissionRate === orig.commissionRate && r.data.requireProductApproval === orig.requireProductApproval, r);
  await restoreSettings(); // put the rows back exactly as they were

  // ================= PAYOUTS =================
  r = await call('POST', '/addresses', { token: buyer, body: { recipientName: 'QA Buyer', line1: '1 Test St', city: 'Riyadh', postalCode: '12345', country: 'SA', phone: '+966500000000' } });
  check('payouts: customer saves address', r.status === 201, r);
  const addressId = r.data.id;

  const placeOrder = async (productId, qty) => {
    const o = await call('POST', '/orders', { token: buyer, body: { items: [{ productId, quantity: qty }], shippingAddressId: addressId, paymentMethod: 'card' } });
    if (o.data?.id) created.orders.push(o.data.id);
    return o;
  };
  const deliver = async (order) => {
    const p = await call('PATCH', `/payments/${order.payment.id}`, { token: admin, body: { status: 'PAID' } });
    const s = await call('PATCH', `/orders/${order.id}`, { token: admin, body: { status: 'SHIPPED' } });
    const d = await call('PATCH', `/orders/${order.id}`, { token: admin, body: { status: 'DELIVERED' } });
    return [p.status, s.status, d.status];
  };
  const balanceOf = async () => {
    const b = await call('GET', '/admin/payouts/balances', { token: staff });
    return b.data.data?.find((x) => x.vendorId === A.vendorId) ?? { payableAmount: 0, payableSubOrders: 0, pendingAmount: 0, pendingSubOrders: 0 };
  };

  r = await placeOrder(A1, 2);
  check('payouts: order for vendor product placed', r.status === 201 && r.data.id, r);
  const order1 = r.data;
  const vo1 = await q1(`select id, status, total::float8 total, "vendorNet"::float8 net, "commissionRate"::float8 rate, "commissionAmount"::float8 comm, "subtotal"::float8 sub, "discountTotal"::float8 disc from "VendorOrder" where "orderId"=$1`, [order1.id]);
  check('payouts: sub-order carries the vendor commission (15%)', vo1 && vo1.rate === 15 && vo1.comm === round2((vo1.sub - vo1.disc) * 0.15) && vo1.net === round2(vo1.total - vo1.comm), vo1);
  let bal = await balanceOf();
  check('balances: unpaid order is neither payable nor pending', bal.payableAmount === 0 && bal.pendingAmount === 0, bal);

  r = await call('PATCH', `/payments/${order1.payment.id}`, { token: admin, body: { status: 'PAID' } });
  check('payouts: admin settles payment', r.status === 200 && r.data.status === 'PAID', r);
  bal = await balanceOf();
  check('balances: paid, undelivered -> pending amount', bal.pendingAmount === vo1.net && bal.pendingSubOrders === 1 && bal.payableAmount === 0, bal);
  check('balances: platform vendor never listed', !(await call('GET', '/admin/payouts/balances', { token: staff })).data.data.some((x) => x.vendorId === 'vendor_platform'));
  r = await call('POST', '/admin/payouts', { token: admin, body: { vendorId: A.vendorId } });
  check('payouts: nothing payable before delivery (400)', r.status === 400, r);

  r = await call('PATCH', `/orders/${order1.id}`, { token: admin, body: { status: 'SHIPPED' } });
  check('payouts: order shipped', r.status === 200, r);
  r = await call('PATCH', `/orders/${order1.id}`, { token: admin, body: { status: 'DELIVERED' } });
  check('payouts: order delivered', r.status === 200, r);
  bal = await balanceOf();
  check('balances: delivered sub-order is payable', bal.payableAmount === vo1.net && bal.payableSubOrders === 1 && bal.pendingAmount === 0, bal);
  check('balances: row has shop + email', bal.shop?.slug === A.slug && bal.email === A.email, bal);

  r = await placeOrder(A3, 1);
  const order2 = r.data;
  check('payouts: second order placed', r.status === 201, r);
  check('payouts: second order paid/shipped/delivered', (await deliver(order2)).every((s) => s === 200));
  const vo2 = await q1(`select "vendorNet"::float8 net from "VendorOrder" where "orderId"=$1`, [order2.id]);
  const expected = round2(vo1.net + vo2.net);
  bal = await balanceOf();
  check('balances: both sub-orders payable', bal.payableAmount === expected && bal.payableSubOrders === 2, { bal, expected });

  // validation
  r = await call('POST', '/admin/payouts', { token: admin, body: {} });
  check('payouts: vendorId required (400)', r.status === 400 && r.data.errors?.vendorId, r);
  r = await call('POST', '/admin/payouts', { token: admin, body: { vendorId: `qa_missing_${RUN}` } });
  check('payouts: unknown vendor (400)', r.status === 400, r);
  r = await call('POST', '/admin/payouts', { token: admin, body: { vendorId: 'vendor_platform' } });
  check('payouts: platform vendor (400)', r.status === 400, r);
  r = await call('POST', '/admin/payouts', { token: admin, body: { vendorId: B.vendorId } });
  check('payouts: vendor with nothing payable (400)', r.status === 400, r);

  // concurrency: two simultaneous creates
  const [p1, p2] = await Promise.all([
    call('POST', '/admin/payouts', { token: admin, body: { vendorId: A.vendorId, note: 'QA run' } }),
    call('POST', '/admin/payouts', { token: admin, body: { vendorId: A.vendorId, note: 'QA run' } }),
  ]);
  check('payouts: concurrent creates -> exactly one succeeds', [p1.status, p2.status].sort().join() === '201,400', [p1.status, p2.status, p1.data, p2.data]);
  const payout = p1.status === 201 ? p1.data : p2.data;
  check('payouts: payout claims all payable sub-orders', payout.status === 'PENDING' && payout.amount === expected && payout.subOrders?.length === 2 && payout.subOrderCount === 2, payout);
  check('payouts: payout has vendor, period and note', payout.vendor?.id === A.vendorId && payout.vendor.shop.slug === A.slug && !!payout.periodStart && !!payout.periodEnd && payout.note === 'QA run', payout);
  check('payouts: no orphaned payout from the losing request', (await q1(`select count(*)::int n from "VendorPayout" where "vendorId"=$1`, [A.vendorId])).n === 1);
  r = await call('POST', '/admin/payouts', { token: admin, body: { vendorId: A.vendorId } });
  check('payouts: a second payout finds nothing (400)', r.status === 400, r);
  bal = await balanceOf();
  check('balances: claimed sub-orders no longer payable', bal.payableAmount === 0, bal);

  r = await call('GET', `/admin/payouts?vendorId=${A.vendorId}`, { token: staff });
  check('payouts: list filtered by vendor', r.status === 200 && r.data.data.length === 1 && r.data.data[0].id === payout.id && r.data.meta.total === 1, r.data);
  r = await call('GET', `/admin/payouts?vendorId=${A.vendorId}&status=PAID`, { token: staff });
  check('payouts: status filter', r.status === 200 && r.data.data.length === 0, r.data);
  r = await call('GET', `/admin/payouts?status=NOPE`, { token: staff });
  check('payouts: bad status filter (400)', r.status === 400, r.status);
  r = await call('GET', `/admin/payouts/${payout.id}`, { token: staff });
  check('payouts: detail lists its sub-orders', r.status === 200 && r.data.subOrders.length === 2 && r.data.subOrders.every((s) => s.status === 'DELIVERED' && s.orderNumber), r.data);
  r = await call('GET', `/admin/payouts/qa_missing_${RUN}`, { token: staff });
  check('payouts: unknown payout 404', r.status === 404, r.status);

  r = await call('PATCH', `/admin/payouts/${payout.id}`, { token: admin, body: { status: 'PAID' } });
  check('payouts: PAID needs a reference (400)', r.status === 400 && r.data.errors?.reference, r);
  r = await call('PATCH', `/admin/payouts/${payout.id}`, { token: admin, body: { status: 'PENDING' } });
  check('payouts: PENDING is not a target (400)', r.status === 400, r);
  r = await call('PATCH', `/admin/payouts/${payout.id}`, { token: admin, body: { status: 'CANCELLED' } });
  check('payouts: cancel a pending payout', r.status === 200 && r.data.status === 'CANCELLED' && r.data.subOrders.length === 0, r);
  check('payouts: cancel released the sub-orders', (await q1(`select count(*)::int n from "VendorOrder" where "payoutId"=$1`, [payout.id])).n === 0);
  bal = await balanceOf();
  check('balances: released sub-orders payable again', bal.payableAmount === expected && bal.payableSubOrders === 2, bal);
  r = await call('PATCH', `/admin/payouts/${payout.id}`, { token: admin, body: { status: 'PAID', reference: 'x' } });
  check('payouts: cancelled payout locked (400)', r.status === 400, r);

  r = await call('POST', '/admin/payouts', { token: admin, body: { vendorId: A.vendorId } });
  check('payouts: new payout re-claims the released sub-orders', r.status === 201 && r.data.amount === expected && r.data.subOrders.length === 2, r);
  const payout2 = r.data;
  r = await call('PATCH', `/admin/payouts/${payout2.id}`, { token: admin, body: { status: 'PAID', reference: `QA-TRX-${RUN}` } });
  check('payouts: mark paid', r.status === 200 && r.data.status === 'PAID' && !!r.data.paidAt && r.data.reference === `QA-TRX-${RUN}`, r);
  r = await call('PATCH', `/admin/payouts/${payout2.id}`, { token: admin, body: { status: 'CANCELLED' } });
  check('payouts: paid payout locked (400)', r.status === 400, r);
  check('payouts: paid payout keeps its sub-orders', (await q1(`select count(*)::int n from "VendorOrder" where "payoutId"=$1`, [payout2.id])).n === 2);
  check('audit: payout actions recorded', (await q1(`select count(*)::int n from "AuditEvent" where actor=$1 and action like 'payout.%'`, [adminU.email])).n === 4);

  r = await call('GET', `/admin/vendors/${A.vendorId}`, { token: staff });
  check('vendors: detail shows recent sub-orders and gross sales',
    r.data.recentSubOrders?.length === 2 && r.data.stats.orderCount === 2 && r.data.stats.grossSales === round2(vo1.total + Number(order2.total)) && r.data.recentSubOrders.every((s) => s.payoutId === payout2.id), r.data?.stats);

  // ================= PUBLIC SHOP PAGE =================
  const cust = await q1(`select id from "Customer" where email=$1`, [custEmail]);
  await db.query(`insert into "Review"(id,"productId","customerId",rating,"isApproved","updatedAt") values($1,$2,$3,4,true,now()),($4,$5,$3,2,false,now())`,
    [`qa_rev1_${RUN}`, A1, cust.id, `qa_rev2_${RUN}`, A2]);
  r = await call('GET', `/shops/${A.slug}`);
  check('shop page: public, no auth', r.status === 200 && r.data.slug === A.slug && r.data.name === `QA Shop va ${RUN}`, r);
  const shop = r.data;
  check('shop page: profile fields', shop.description === 'QA shop description' && shop.city === 'Riyadh' && shop.country === 'SA' && shop.phone === '+966500000001' && shop.email === 'shop@example.test' &&
    shop.openingHours?.mon === '09:00-18:00' && shop.offersDelivery === true && shop.offersPickup === true && 'deliveryRadiusKm' in shop, shop);
  check('shop page: verified coordinates shown', shop.latitude === 24.7136 && shop.longitude === 46.6753, shop);
  check('shop page: rating = approved reviews only', shop.rating === 4 && shop.reviewCount === 1, { rating: shop.rating, n: shop.reviewCount });
  check('shop page: product count = sellable products', shop.productCount === 3, shop.productCount);
  const leaked = ['vendor', 'vendorId', 'user', 'userId', 'commissionRate', 'locationVerifiedAt', 'addressLine1', 'postalCode', 'statusReason'].filter((k) => k in shop);
  check('shop page: no vendor/commission/private fields', leaked.length === 0, leaked);
  await db.query(`update "Shop" set latitude=1, longitude=2, "locationVerifiedAt"=null where id=$1`, [B.shopId]);
  r = await call('GET', `/shops/${B.slug}`);
  check('shop page: unverified coordinates hidden', r.status === 200 && r.data.latitude === null && r.data.longitude === null, r.data);
  await db.query(`update "Shop" set "isActive"=false where id=$1`, [B.shopId]);
  r = await call('GET', `/shops/${B.slug}`);
  check('shop page: inactive shop 404', r.status === 404, r.status);
  await db.query(`update "Vendor" set status='PENDING' where id=$1`, [C.vendorId]);
  r = await call('GET', `/shops/${C.slug}`);
  check('shop page: shop of a non-ACTIVE vendor 404', r.status === 404, r.status);
  r = await call('GET', `/shops/qa-nope-${RUN}`);
  check('shop page: unknown slug 404', r.status === 404, r.status);
}

async function restoreSettings() {
  for (const key of ['marketplace_commission_rate', 'marketplace_require_product_approval']) {
    const before = settingsBefore.find((s) => s.key === key);
    if (before) await db.query(`update "Setting" set value=$2 where key=$1`, [key, before.value]);
    else await db.query(`delete from "Setting" where key=$1`, [key]);
  }
}

async function cleanup() {
  if (!db) return;
  const like = `%${RUN}%`;
  try {
    await restoreSettings();
    for (const id of created.orders) await db.query(`delete from "Order" where id=$1`, [id]);
    await db.query(`delete from "Report" where "reporterId" in (select id from "User" where email like $1)`, [`qa-%-${RUN}@example.test`]);
    await db.query(`delete from "Product" where sku like $1`, [`QA-%-${RUN}`]);
    await db.query(`delete from "Shop" where slug like $1`, [`qa-shop-%-${RUN}`]);
    await db.query(`delete from "Vendor" where id like $1`, [`qa_vendor_%_${RUN}`]); // cascades payouts
    await db.query(`delete from "Customer" where email like $1`, [`qa-%-${RUN}@example.test`]);
    for (const id of created.users) await db.query(`delete from "User" where id=$1`, [id]);
    await db.query(`delete from "User" where email like $1`, [`qa-%-${RUN}@example.test`]);
    for (const id of created.roles) await db.query(`delete from "Role" where id=$1`, [id]);
    await db.query(`delete from "AuditEvent" where actor like $1 or "entityId" like $2`, [`qa-%-${RUN}@example.test`, like]);

    const left = await q1(
      `select
        (select count(*) from "User" where email like $1)::int users,
        (select count(*) from "Vendor" where id like $2)::int vendors,
        (select count(*) from "Shop" where slug like $2)::int shops,
        (select count(*) from "Product" where sku like $2)::int products,
        (select count(*) from "Role" where name like $2)::int roles,
        (select count(*) from "AuditEvent" where actor like $2 or "entityId" like $2)::int audit,
        (select count(*) from "Order" where id = any($3))::int orders,
        (select count(*) from "Review" where id like $2)::int reviews`,
      [`qa-%-${RUN}@example.test`, like, created.orders],
    );
    check('cleanup: no qa- rows remain', Object.values(left).every((n) => n === 0), left);
    const settingsNow = (await db.query(`select key, value from "Setting" where key in ('marketplace_commission_rate','marketplace_require_product_approval') order by key`)).rows;
    check('cleanup: marketplace settings restored', JSON.stringify(settingsNow) === JSON.stringify([...settingsBefore].sort((a, b) => a.key.localeCompare(b.key))), { settingsNow, settingsBefore });
    check('cleanup: platform vendor untouched', (await q1(`select status from "Vendor" where id='vendor_platform'`)).status === 'ACTIVE');
  } catch (e) {
    check('cleanup: completed', false, e.message);
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
