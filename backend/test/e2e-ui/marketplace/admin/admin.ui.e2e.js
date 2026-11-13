// Browser E2E for the marketplace administration screens.
// Run: NODE_PATH=<pw>/node_modules:<backend>/node_modules node mkt-admin.ui.js <backend/.env>
require('dotenv').config({ path: process.argv[2], quiet: true });
const { chromium } = require('playwright');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const WEB = 'http://localhost:3000';
const API = 'http://localhost:8080/api/v1';
const TS = Date.now().toString(36);
const RUN = `qa-adm-${TS}`;          // emails, slugs
const RID = `qa_adm_${TS}`;          // row ids
const SKU = `QA-ADM-${TS}`.toUpperCase();
const PASS = 'Qa-Passw0rd!';
const SHOTS = path.join(__dirname, 'shots', 'mkt-admin');
fs.mkdirSync(SHOTS, { recursive: true });
const SETTING_KEYS = ['marketplace_commission_rate', 'marketplace_require_product_approval'];

const results = [];
const created = { orders: [], users: [] };
let db, browser, settingsBefore = [];

const check = (name, ok, detail = '') => {
  results.push({ ok: !!ok, name });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? '  -> ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 400) : ''}`);
  return !!ok;
};
const q1 = async (sql, params) => (await db.query(sql, params)).rows[0];

async function api(method, p, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data; try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

async function step(page, name, fn) {
  try {
    await fn();
    check(name, true);
    return true;
  } catch (e) {
    const file = path.join(SHOTS, `FAIL-${name.replace(/[^a-z0-9]+/gi, '-')}.png`);
    await page.screenshot({ path: file, fullPage: true }).catch(() => {});
    check(name, false, `${e.message.split('\n')[0]} (screenshot: ${file})`);
    return false;
  }
}
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

async function makeUser(tag, roleId, { verified = true } = {}) {
  const id = `${RID}_${tag}`;
  const email = `${RUN}-${tag}@example.test`;
  await db.query(
    `insert into "User"(id,email,"passwordHash","firstName","lastName","roleId","emailVerifiedAt","updatedAt") values($1,$2,$3,'QA',$4,$5,$6,now())`,
    [id, email, await bcrypt.hash(PASS, 10), tag, roleId, verified ? new Date() : null],
  );
  created.users.push(id);
  return { id, email };
}

async function makeVendor(tag, vendorRoleId, { verified = true } = {}) {
  const user = await makeUser(tag, vendorRoleId, { verified });
  const vendorId = `${RID}_vendor_${tag}`;
  const shopId = `${RID}_shop_${tag}`;
  const slug = `${RUN}-shop-${tag}`;
  const name = `QA Shop ${tag.toUpperCase()} ${RUN}`;
  await db.query(`insert into "Vendor"(id,"userId",status,"updatedAt") values($1,$2,'PENDING',now())`, [vendorId, user.id]);
  await db.query(
    `insert into "Shop"(id,"vendorId",name,slug,description,email,phone,"addressLine1",city,"postalCode",country,"openingHours","offersPickup","updatedAt")
     values($1,$2,$3,$4,'QA shop description','shop@example.test','+966500000001','1 King Fahd Rd','Riyadh','12345','SA',$5,true,now())`,
    [shopId, vendorId, name, slug, JSON.stringify({ mon: [{ open: '09:00', close: '18:00' }], fri: [] })],
  );
  return { ...user, vendorId, shopId, slug, name };
}

async function makeProduct(tag, shopId, categoryId, moderationStatus) {
  const id = `${RID}_prod_${tag}`;
  const name = `QA Product ${tag.toUpperCase()} ${RUN}`;
  await db.query(
    `insert into "Product"(id,name,slug,sku,"shopId","moderationStatus",price,"categoryId","isActive","updatedAt")
     values($1,$2,$3,$4,$5,$6,40,$7,true,now())`,
    [id, name, `${RUN}-prod-${tag}`, `${SKU}-${tag.toUpperCase()}`, shopId, moderationStatus, categoryId],
  );
  await db.query(`insert into "Inventory"(id,"productId",quantity,"updatedAt") values($1,$2,50,now())`, [`${RID}_inv_${tag}`, id]);
  return { id, name };
}

async function main() {
  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  settingsBefore = (await db.query(`select key, value from "Setting" where key = any($1) order by key`, [SETTING_KEYS])).rows;
  console.log('settings before:', JSON.stringify(settingsBefore));

  // ---------------- setup ----------------
  const adminRole = await q1(`select id from "Role" where name='Admin'`);
  const vendorRole = await q1(`select id from "Role" where name='Vendor' and kind='VENDOR'`);
  const admin = await makeUser('admin', adminRole.id);
  const A = await makeVendor('a', vendorRole.id);
  const B = await makeVendor('b', vendorRole.id, { verified: false });
  const cat = await q1(`select id from "Category" where "parentId" is not null order by "sortOrder" limit 1`) ?? await q1(`select id from "Category" limit 1`);
  const A1 = await makeProduct('a1', A.shopId, cat.id, 'PENDING_REVIEW');
  const A2 = await makeProduct('a2', A.shopId, cat.id, 'PENDING_REVIEW');
  const A3 = await makeProduct('a3', A.shopId, cat.id, 'APPROVED');

  let r = await api('POST', '/auth/admin/signin', { body: { email: admin.email, password: PASS } });
  check('setup: admin API sign-in', r.status === 201 && r.data?.token, r);
  const adminToken = r.data.token;
  const buyerEmail = `${RUN}-buyer@example.test`;
  r = await api('POST', '/auth/register', { body: { email: buyerEmail, password: PASS, firstName: 'QA', lastName: 'Buyer' } });
  check('setup: buyer registers', r.status === 201 && r.data?.token, r);
  const buyer = r.data.token;
  const buyerId = r.data.user?.id ?? (await q1(`select id from "User" where email=$1`, [buyerEmail])).id;
  created.users.push(buyerId);
  const reportId = `${RID}_report`;
  await db.query(
    `insert into "Report"(id,"reporterId","targetType","productId","shopId",reason,details,"updatedAt") values($1,$2,'PRODUCT',$3,$4,'COUNTERFEIT','QA: fake label',now())`,
    [reportId, buyerId, A3.id, A.shopId],
  );

  // ---------------- browser ----------------
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('response', (res) => { if (res.url().startsWith(API) && res.status() >= 500) problems.push(`${res.status()} ${res.request().method()} ${res.url()}`); });
  const dialog = () => page.getByRole('dialog');
  const toast = (re) => page.locator('[data-sonner-toast]').filter({ hasText: re }).first().waitFor({ timeout: 15000 });

  await step(page, 'login: admin signs in', async () => {
    await page.goto(`${WEB}/admin/login`);
    await page.fill('input[name=email]', admin.email);
    await page.fill('input[name=password]', PASS);
    await page.getByRole('button', { name: /sign in to the suite/i }).click();
    await page.waitForURL((u) => u.pathname.startsWith('/admin') && !u.pathname.startsWith('/admin/login'), { timeout: 30000 });
  });

  // ===== Vendors list =====
  await step(page, 'vendors: list shows pending QA vendors, tabs, sidebar badge', async () => {
    await page.goto(`${WEB}/admin/vendors`);
    await page.getByRole('link', { name: 'Vendors' }).first().waitFor();
    await page.getByPlaceholder('Search shop, owner or email').fill(RUN);
    await page.getByText(A.name).waitFor({ timeout: 15000 });
    await page.getByText(B.name).waitFor();
    const unverified = await page.locator('tr', { hasText: B.name }).getByText('unverified').count();
    if (!unverified) throw new Error('unverified badge missing for vendor B');
    const badge = await page.locator('aside a[href="/admin/vendors"] span[title*="pending"]').textContent({ timeout: 10000 });
    if (!(Number(badge) >= 2)) throw new Error(`pending badge = ${badge}`);
    await shot(page, '01-vendors-list');
  });

  // ===== Approval error (unverified vendor) =====
  await step(page, 'vendors: approving an unverified vendor shows the API reason', async () => {
    await page.locator('tr', { hasText: B.name }).click();
    await page.waitForURL(`**/admin/vendors/${B.vendorId}`);
    await page.getByRole('button', { name: 'Approve' }).click();
    await dialog().getByRole('button', { name: 'Approve' }).click();
    await dialog().getByText('has not verified their email').waitFor({ timeout: 15000 });
    await shot(page, '02-approve-error-dialog');
    await dialog().getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('alert').getByText('has not verified their email').waitFor();
    await shot(page, '03-approve-error-page');
    if ((await q1(`select status from "Vendor" where id=$1`, [B.vendorId])).status !== 'PENDING') throw new Error('B status changed');
  });

  // ===== Reject requires reason (B) =====
  await step(page, 'vendors: reject needs a reason, then rejects', async () => {
    await page.getByRole('button', { name: 'Reject' }).click();
    await dialog().getByRole('button', { name: 'Reject' }).click();
    await dialog().getByText('This field is required').waitFor();
    await dialog().locator('textarea').fill('QA: incomplete application');
    await dialog().getByRole('button', { name: 'Reject' }).click();
    await toast(/rejected/i);
    await page.getByText('Reason on record:').waitFor();
    if ((await q1(`select status from "Vendor" where id=$1`, [B.vendorId])).status !== 'REJECTED') throw new Error('B not rejected');
  });

  // ===== Approve A =====
  await step(page, 'vendors: approve verified vendor (geocoded Riyadh)', async () => {
    await page.goto(`${WEB}/admin/vendors/${A.vendorId}`);
    await page.getByText('1 King Fahd Rd').waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: 'Approve' }).click();
    await dialog().getByRole('button', { name: 'Approve' }).click();
    await toast(/vendor approved/i);
    await page.getByRole('link', { name: /View on OpenStreetMap/ }).waitFor();
    const row = await q1(`select v.status, s."locationVerifiedAt", s.latitude from "Vendor" v join "Shop" s on s."vendorId"=v.id where v.id=$1`, [A.vendorId]);
    if (row.status !== 'ACTIVE' || !row.locationVerifiedAt) throw new Error(JSON.stringify(row));
    await shot(page, '04-vendor-approved');
  });

  await step(page, 'vendors: set location dialog with map link', async () => {
    await page.getByRole('button', { name: /Set location/ }).click();
    const lat = dialog().getByPlaceholder('24.7136');
    await lat.fill('24.7136');
    await dialog().getByPlaceholder('46.6753').fill('46.6753');
    const href = await dialog().getByRole('link', { name: /OpenStreetMap/ }).getAttribute('href');
    if (!href.includes('mlat=24.7136&mlon=46.6753#map=15/24.7136/46.6753')) throw new Error(href);
    await shot(page, '05-set-location');
    await dialog().getByRole('button', { name: /Save & verify/ }).click();
    await toast(/location verified/i);
    const s = await q1(`select latitude, longitude from "Shop" where id=$1`, [A.shopId]);
    if (s.latitude !== 24.7136 || s.longitude !== 46.6753) throw new Error(JSON.stringify(s));
  });

  await step(page, 'vendors: commission editor (custom, then platform default)', async () => {
    const input = page.locator('input[type=number]').first();
    await input.fill('12.5');
    await page.getByRole('button', { name: 'Save rate' }).click();
    await toast(/12.5%/);
    if (Number((await q1(`select "commissionRate" from "Vendor" where id=$1`, [A.vendorId])).commissionRate) !== 12.5) throw new Error('rate not saved');
    await input.fill('');
    await page.getByRole('button', { name: 'Save rate' }).click();
    await toast(/platform default/i);
    if ((await q1(`select "commissionRate" from "Vendor" where id=$1`, [A.vendorId])).commissionRate !== null) throw new Error('rate not cleared');
  });

  // ===== Moderation =====
  await step(page, 'moderation: approve and reject products', async () => {
    await page.goto(`${WEB}/admin/moderation`);
    await page.locator('tr', { hasText: A1.name }).waitFor({ timeout: 15000 });
    await shot(page, '06-moderation-queue');
    await page.locator('tr', { hasText: A1.name }).getByRole('button', { name: 'Approve' }).click();
    await dialog().getByRole('button', { name: 'Approve' }).click();
    await toast(/approved/i);
    await page.locator('tr', { hasText: A1.name }).waitFor({ state: 'detached', timeout: 15000 });
    await page.locator('tr', { hasText: A2.name }).getByRole('button', { name: 'Reject' }).click();
    await dialog().locator('textarea').fill('QA: blurry photos');
    await dialog().getByRole('button', { name: 'Reject' }).click();
    await toast(/rejected/i);
    const rows = (await db.query(`select id, "moderationStatus" from "Product" where id = any($1) order by id`, [[A1.id, A2.id]])).rows;
    if (rows[0].moderationStatus !== 'APPROVED' || rows[1].moderationStatus !== 'REJECTED') throw new Error(JSON.stringify(rows));
    await page.getByRole('button', { name: /^Rejected/ }).click();
    await page.locator('tr', { hasText: A2.name }).waitFor({ timeout: 15000 });
    await shot(page, '07-moderation-rejected-tab');
  });

  // ===== Reports =====
  await step(page, 'reports: resolve with REMOVE_PRODUCT', async () => {
    await page.goto(`${WEB}/admin/moderation/reports`);
    await page.getByText(A3.name).waitFor({ timeout: 15000 });
    await shot(page, '08-reports-open');
    await page.locator('tr', { hasText: A3.name }).getByRole('button', { name: 'Resolve' }).click();
    await dialog().locator('select').selectOption('REMOVE_PRODUCT');
    await dialog().locator('textarea').fill('QA: confirmed counterfeit');
    await shot(page, '09-report-resolve-dialog');
    await dialog().getByRole('button', { name: 'Resolve' }).click();
    await toast(/Report resolved/i);
    const rep = await q1(`select status, resolution from "Report" where id=$1`, [reportId]);
    const prod = await q1(`select "moderationStatus" from "Product" where id=$1`, [A3.id]);
    if (rep.status !== 'RESOLVED' || prod.moderationStatus !== 'REMOVED') throw new Error(JSON.stringify({ rep, prod }));
    await page.getByRole('button', { name: /^Resolved/ }).click();
    await page.getByText('QA: confirmed counterfeit').waitFor({ timeout: 15000 });
  });

  // ===== Order for A (API), then payouts =====
  r = await api('POST', '/addresses', { token: buyer, body: { recipientName: 'QA Buyer', line1: '1 Test St', city: 'Riyadh', postalCode: '12345', country: 'SA', phone: '+966500000000' } });
  check('setup: buyer address', r.status === 201, r);
  r = await api('POST', '/orders', { token: buyer, body: { items: [{ productId: A1.id, quantity: 2 }], shippingAddressId: r.data?.id, paymentMethod: 'card' } });
  check('setup: order placed for vendor product', r.status === 201 && r.data?.id, r);
  const order = r.data;
  if (order?.id) created.orders.push(order.id);
  const p = await api('PATCH', `/payments/${order.payment.id}`, { token: adminToken, body: { status: 'PAID' } });
  const s1 = await api('PATCH', `/orders/${order.id}`, { token: adminToken, body: { status: 'SHIPPED' } });
  const s2 = await api('PATCH', `/orders/${order.id}`, { token: adminToken, body: { status: 'DELIVERED' } });
  check('setup: order paid, shipped, delivered', [p.status, s1.status, s2.status].every((x) => x === 200), [p, s1, s2].map((x) => x.data?.message ?? x.status));
  const vo = await q1(`select "vendorNet"::float8 net from "VendorOrder" where "orderId"=$1`, [order.id]);

  await step(page, 'orders: detail shows per-shop breakdown', async () => {
    await page.goto(`${WEB}/admin/orders/${order.id}`);
    await page.getByText('Per-shop breakdown').waitFor({ timeout: 15000 });
    await page.locator('tr', { hasText: A.name }).getByText(`$${vo.net.toFixed(2)}`).waitFor();
    await shot(page, '10-order-breakdown');
  });

  let payoutId;
  await step(page, 'payouts: create payout from balances', async () => {
    await page.goto(`${WEB}/admin/payouts`);
    const row = page.locator('tr', { hasText: A.name }).first();
    await row.waitFor({ timeout: 15000 });
    await shot(page, '11-payout-balances');
    await row.getByRole('button', { name: /Create payout/ }).click();
    await dialog().locator('textarea').fill('QA payout');
    await dialog().getByRole('button', { name: 'Create payout' }).click();
    await toast(/Payout of/);
    const po = await q1(`select id, status, amount::float8 amount from "VendorPayout" where "vendorId"=$1`, [A.vendorId]);
    if (!po || po.status !== 'PENDING' || po.amount !== vo.net) throw new Error(JSON.stringify({ po, vo }));
    payoutId = po.id;
  });

  await step(page, 'payouts: mark paid with reference', async () => {
    const hist = page.locator('tr', { hasText: A.name }).filter({ hasText: 'Pending' }).last();
    await hist.waitFor({ timeout: 15000 });
    await hist.getByRole('button', { name: 'Row actions' }).click();
    await page.getByText('Mark paid', { exact: true }).click();
    await dialog().getByRole('button', { name: 'Mark paid' }).click();
    await dialog().getByText('A payment reference is required').waitFor();
    await dialog().getByPlaceholder(/TRX/).fill(`QA-TRX-${TS}`);
    await dialog().getByRole('button', { name: 'Mark paid' }).click();
    await toast(/marked paid/);
    const po = await q1(`select status, reference from "VendorPayout" where id=$1`, [payoutId]);
    if (po.status !== 'PAID' || po.reference !== `QA-TRX-${TS}`) throw new Error(JSON.stringify(po));
    await shot(page, '12-payout-history');
  });

  await step(page, 'payouts: detail lists sub-orders', async () => {
    await page.goto(`${WEB}/admin/payouts/${payoutId}`);
    await page.getByText(order.orderNumber).waitFor({ timeout: 15000 });
    await page.getByText(`QA-TRX-${TS}`).waitFor();
    await shot(page, '13-payout-detail');
  });

  // ===== Suspend & reactivate A =====
  await step(page, 'vendors: suspend then reactivate', async () => {
    await page.goto(`${WEB}/admin/vendors/${A.vendorId}`);
    await page.getByRole('button', { name: 'Suspend' }).click();
    await dialog().locator('textarea').fill('QA: policy check');
    await dialog().getByRole('button', { name: 'Suspend' }).click();
    await toast(/suspended/i);
    await page.getByRole('button', { name: 'Reactivate' }).waitFor();
    if ((await q1(`select status from "Vendor" where id=$1`, [A.vendorId])).status !== 'SUSPENDED') throw new Error('not suspended');
    await shot(page, '14-vendor-suspended');
    await page.getByRole('button', { name: 'Reactivate' }).click();
    await dialog().getByRole('button', { name: 'Reactivate' }).click();
    await toast(/reactivated/i);
    await page.getByRole('button', { name: 'Suspend' }).waitFor();
    if ((await q1(`select status from "Vendor" where id=$1`, [A.vendorId])).status !== 'ACTIVE') throw new Error('not reactivated');
  });

  // ===== Marketplace settings =====
  const orig = (await api('GET', '/admin/marketplace/settings', { token: adminToken })).data;
  await step(page, 'settings: change and restore via the form', async () => {
    await page.goto(`${WEB}/admin/marketplace`);
    const rate = page.locator('input[type=number]');
    await rate.waitFor({ timeout: 15000 });
    if (Number(await rate.inputValue()) !== orig.commissionRate) throw new Error('form does not show current rate');
    const changed = orig.commissionRate >= 99 ? orig.commissionRate - 1.5 : orig.commissionRate + 1.5;
    await rate.fill(String(changed));
    await page.getByRole('switch', { name: /Require product approval/ }).click();
    await Promise.all([
      page.waitForResponse((res) => res.url().endsWith('/admin/marketplace/settings') && res.request().method() === 'PATCH'),
      page.getByRole('button', { name: 'Save settings' }).click(),
    ]);
    await toast(/settings saved/i);
    let now = (await api('GET', '/admin/marketplace/settings', { token: adminToken })).data;
    if (now.commissionRate !== changed || now.requireProductApproval === orig.requireProductApproval) throw new Error(JSON.stringify(now));
    await shot(page, '15-settings-changed');
    await rate.fill(String(orig.commissionRate));
    await page.getByRole('switch', { name: /Require product approval/ }).click();
    await Promise.all([
      page.waitForResponse((res) => res.url().endsWith('/admin/marketplace/settings') && res.request().method() === 'PATCH'),
      page.getByRole('button', { name: 'Save settings' }).click(),
    ]);
    await toast(/settings saved/i);
    now = (await api('GET', '/admin/marketplace/settings', { token: adminToken })).data;
    if (now.commissionRate !== orig.commissionRate || now.requireProductApproval !== orig.requireProductApproval) throw new Error(JSON.stringify(now));
  });
  await restoreSettings();

  // ===== Error state with retry =====
  await step(page, 'states: error with retry when the API fails', async () => {
    await page.route('**/api/v1/admin/payouts/balances', (route) => route.fulfill({ status: 500, body: '{}' }));
    await page.goto(`${WEB}/admin/payouts`);
    await page.getByText("Couldn't load balances.").waitFor({ timeout: 15000 });
    await shot(page, '16-error-retry');
    await page.unroute('**/api/v1/admin/payouts/balances');
    await page.getByRole('button', { name: 'Retry' }).first().click();
    await page.getByText("Couldn't load balances.").waitFor({ state: 'detached', timeout: 15000 });
  });

  check('no page errors or 5xx', problems.filter((x) => !x.includes('/admin/payouts/balances')).length === 0, problems);
}

async function restoreSettings() {
  for (const key of SETTING_KEYS) {
    const before = settingsBefore.find((s) => s.key === key);
    if (before) await db.query(`update "Setting" set value=$2 where key=$1`, [key, before.value]);
    else await db.query(`delete from "Setting" where key=$1`, [key]);
  }
}

async function cleanup() {
  if (!db) return;
  const like = `%${TS}%`;
  try {
    await restoreSettings();
    for (const id of created.orders) await db.query(`delete from "Order" where id=$1`, [id]);
    await db.query(`delete from "Report" where id like $1 or "reporterId" = any($2)`, [like, created.users]);
    await db.query(`delete from "Product" where sku like $1`, [`${SKU}-%`]);
    await db.query(`delete from "Shop" where slug like $1`, [`${RUN}-shop-%`]);
    await db.query(`delete from "Vendor" where id like $1`, [`${RID}_vendor_%`]);
    await db.query(`delete from "Customer" where email like $1`, [`${RUN}-%`]);
    for (const id of created.users) await db.query(`delete from "User" where id=$1`, [id]);
    await db.query(`delete from "User" where email like $1`, [`${RUN}-%`]);
    await db.query(`delete from "AuditEvent" where actor like $1 or "entityId" like $1`, [like]);
    const left = await q1(
      `select
        (select count(*) from "User" where email like $1)::int users,
        (select count(*) from "Customer" where email like $1)::int customers,
        (select count(*) from "Vendor" where id like $1)::int vendors,
        (select count(*) from "Shop" where slug like $1)::int shops,
        (select count(*) from "Product" where sku ilike $1)::int products,
        (select count(*) from "Report" where id like $1)::int reports,
        (select count(*) from "AuditEvent" where actor like $1 or "entityId" like $1)::int audit,
        (select count(*) from "Order" where id = any($2))::int orders,
        (select count(*) from "VendorOrder" where "orderId" = any($2))::int "vendorOrders",
        (select count(*) from "VendorPayout" where note = 'QA payout' or reference like $1)::int payouts`,
      [like, created.orders],
    );
    check('cleanup: nothing remains', Object.values(left).every((n) => n === 0), left);
    const settingsNow = (await db.query(`select key, value from "Setting" where key = any($1) order by key`, [SETTING_KEYS])).rows;
    check('cleanup: marketplace settings exactly as before', JSON.stringify(settingsNow) === JSON.stringify(settingsBefore), { settingsNow, settingsBefore });
    check('cleanup: platform vendor untouched', (await q1(`select status from "Vendor" where id='vendor_platform'`))?.status === 'ACTIVE');
  } catch (e) {
    check('cleanup: completed', false, e.message);
  } finally {
    await db.end();
  }
}

main()
  .catch((e) => { console.error('CRASH', e); results.push({ ok: false, name: 'suite crashed' }); })
  .finally(async () => {
    if (browser) await browser.close();
    await cleanup();
    const failed = results.filter((x) => !x.ok);
    console.log(`\n${results.length - failed.length}/${results.length} passed`);
    if (failed.length) failed.forEach((x) => console.log(' -', x.name));
    process.exit(failed.length ? 1 : 0);
  });
