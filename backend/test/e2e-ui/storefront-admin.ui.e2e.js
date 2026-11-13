// Browser-level E2E: drives the real storefront + admin UI in Chromium —
// admin creates/edits/stocks/publishes a product (with image), a customer
// registers, buys it (COD), sees the confirmation and history, admin settles
// and ships it, and the card path degrades cleanly when Stripe isn't set up.
//
// Needs both dev servers running (API :8080, web :3000) and Playwright:
//   npm i -g playwright && npx playwright install chromium   (or install in any folder)
//   NODE_PATH=<playwright folder>/node_modules:backend/node_modules \
//     node backend/test/e2e-ui/storefront-admin.ui.e2e.js backend/.env
// Test data is prefixed qa-ui- and removed afterwards. Failure screenshots go to ./shots.
require('dotenv').config({ path: process.argv[2], quiet: true });
const { chromium } = require('playwright');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const WEB = 'http://localhost:3000';
const API = 'http://localhost:8080/api/v1';
const RUN = Date.now().toString(36);
const SHOTS = path.join(process.cwd(), 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const created = { users: [], products: [], orders: [] };
let db, browser;

const check = (name, ok, detail = '') => {
  results.push({ ok: !!ok, name });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? '  -> ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 300) : ''}`);
  return !!ok;
};

async function api(method, p, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + p, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  let data; try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

/** Runs a UI step; on failure records it, screenshots, and continues. */
async function step(page, name, fn) {
  try {
    await fn();
    return true;
  } catch (e) {
    const file = path.join(SHOTS, `${name.replace(/[^a-z0-9]+/gi, '-')}.png`);
    await page.screenshot({ path: file, fullPage: true }).catch(() => {});
    check(name, false, `${e.message.split('\n')[0]} (screenshot: ${file})`);
    return false;
  }
}

function watch(page, label) {
  const problems = [];
  page.on('pageerror', (e) => problems.push(`[${label}] pageerror: ${e.message}`));
  page.on('response', (r) => {
    // 503 from the card-payment endpoint is the expected answer when Stripe isn't configured.
    const expected = r.status() === 503 && r.url().includes('/payments/stripe/') && !process.env.STRIPE_SECRET_KEY;
    if (r.url().startsWith(API) && r.status() >= 500 && !expected) problems.push(`[${label}] ${r.status()} ${r.request().method()} ${r.url()}`);
  });
  return problems;
}

async function main() {
  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  browser = await chromium.launch();

  // ---------- setup: QA admin (DB) ----------
  const adminRole = (await db.query(`select id from "Role" where name='Admin'`)).rows[0];
  const adminEmail = `qa-ui-admin-${RUN}@example.test`;
  const adminPass = 'Qa-Admin-Passw0rd!';
  const adminId = `qa_ui_admin_${RUN}`;
  await db.query(`insert into "User"(id,email,"passwordHash","firstName","lastName","roleId","updatedAt") values($1,$2,$3,'QA','Admin',$4,now())`,
    [adminId, adminEmail, await bcrypt.hash(adminPass, 10), adminRole.id]);
  created.users.push(adminId);
  const leaf = (await db.query(`select id, name from "Category" where "parentId" is not null order by "sortOrder" limit 1`)).rows[0];

  // =============== ADMIN UI: create, edit, stock, publish ===============
  const adminCtx = await browser.newContext();
  const ap = await adminCtx.newPage();
  const adminProblems = watch(ap, 'admin');
  const productName = `QA UI Saffron ${RUN}`;
  const sku = `QA-UI-${RUN}`.toUpperCase();
  let productId;

  await step(ap, 'admin ui: sign in', async () => {
    await ap.goto(`${WEB}/admin/login`);
    await ap.fill('input[name=email]', adminEmail);
    await ap.fill('input[name=password]', adminPass);
    await ap.getByRole('button', { name: /sign in to the suite/i }).click();
    await ap.waitForURL((u) => u.pathname.startsWith('/admin') && !u.pathname.startsWith('/admin/login'), { timeout: 30000 });
    check('admin ui: sign in lands on the dashboard', true);
  });

  await step(ap, 'admin ui: create product with image', async () => {
    await ap.goto(`${WEB}/admin/products/create`, { waitUntil: 'networkidle' });
    const byLabel = (re) => ap.getByLabel(re).first();
    await byLabel(/product title/i).fill(productName);
    await byLabel(/url handle/i).fill(`qa-ui-saffron-${RUN}`);
    await byLabel(/^sku$/i).fill(sku);
    await byLabel(/retail price/i).fill('39.50');
    await byLabel(/^description$/i).fill('QA UI description');
    const cat = ap.locator('label:has(span:text-is("CATEGORY")) select');
    await cat.locator(`option[value="${leaf.id}"]`).waitFor({ state: 'attached', timeout: 20000 });
    await cat.selectOption(leaf.id);
    await ap.setInputFiles('input[type=file]', { name: 'qa.png', mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
    const [resp] = await Promise.all([
      ap.waitForResponse((r) => r.url().endsWith('/products') && r.request().method() === 'POST', { timeout: 60000 }),
      ap.getByRole('button', { name: /save draft/i }).first().click(),
    ]);
    const body = await resp.json().catch(() => ({}));
    if (body?.id) { productId = body.id; created.products.push(productId); }
    check('admin ui: product form submits and is saved (201)', resp.status() === 201, { status: resp.status(), body });
    check('admin ui: image uploaded through the form', body?.images?.length === 1, body?.images);
  });

  if (productId) {
    await step(ap, 'admin ui: edit price', async () => {
      await ap.goto(`${WEB}/admin/products/${productId}/edit`, { waitUntil: 'networkidle' });
      const price = ap.getByLabel(/retail price/i).first();
      await price.fill('42.00');
      const [resp] = await Promise.all([
        ap.waitForResponse((r) => r.url().endsWith(`/products/${productId}`) && r.request().method() === 'PATCH', { timeout: 60000 }),
        ap.getByRole('button', { name: /save draft/i }).first().click(),
      ]);
      const body = await resp.json().catch(() => ({}));
      check('admin ui: edit form saves new price', resp.status() === 200 && Number(body.price) === 42, { status: resp.status(), price: body?.price });
    });

    await step(ap, 'admin ui: set stock in inventory', async () => {
      const inv = (await db.query(`select id from "Inventory" where "productId"=$1`, [productId])).rows[0];
      await ap.goto(`${WEB}/admin/inventory/${inv.id}/edit`, { waitUntil: 'networkidle' });
      const qty = ap.getByLabel(/on hand|quantity|stock/i).first();
      await qty.fill('6');
      const reason = ap.getByLabel(/reason/i).first();
      if (await reason.count()) await reason.selectOption({ index: 1 }).catch(() => {});
      const [resp] = await Promise.all([
        ap.waitForResponse((r) => r.url().includes(`/inventory/${inv.id}`) && ['PATCH', 'POST'].includes(r.request().method()), { timeout: 60000 }),
        ap.getByRole('button', { name: /save|update|adjust/i }).last().click(),
      ]);
      const after = (await db.query(`select quantity from "Inventory" where id=$1`, [inv.id])).rows[0].quantity;
      check('admin ui: inventory form saves stock = 6', resp.ok() && after === 6, { status: resp.status(), after });
    });

    await step(ap, 'admin ui: publish product', async () => {
      const isActive = (await db.query(`select "isActive" from "Product" where id=$1`, [productId])).rows[0].isActive;
      if (!isActive) {
        await ap.goto(`${WEB}/admin/products/${productId}/edit`, { waitUntil: 'networkidle' });
        await Promise.all([
          ap.waitForResponse((r) => r.url().endsWith(`/products/${productId}`) && r.request().method() === 'PATCH', { timeout: 60000 }),
          ap.getByRole('button', { name: /publish changes/i }).first().click(),
        ]);
      }
      const now = (await db.query(`select "isActive" from "Product" where id=$1`, [productId])).rows[0].isActive;
      check('admin ui: product is published', now === true, { wasActive: isActive, now });
    });
  }

  // =============== STOREFRONT UI: browse → cart → checkout (COD) ===============
  const shopCtx = await browser.newContext();
  const sp = await shopCtx.newPage();
  const shopProblems = watch(sp, 'storefront');
  const buyerEmail = `qa-ui-buyer-${RUN}@example.test`;
  let orderId;

  await step(sp, 'storefront ui: register', async () => {
    await sp.goto(`${WEB}/auth/register`, { waitUntil: 'networkidle' });
    await sp.getByLabel(/full name/i).fill('QA Shopper');
    await sp.getByLabel(/email/i).fill(buyerEmail);
    const phone = sp.getByLabel(/mobile/i);
    if (await phone.count()) await phone.fill('+966500000001');
    await sp.getByLabel(/^password/i).fill('Qa-Shopper-Passw0rd!');
    await sp.getByRole('checkbox', { name: /I agree to the Terms/i }).click();
    await Promise.all([
      sp.waitForResponse((r) => r.url().endsWith('/auth/register'), { timeout: 30000 }),
      sp.getByRole('button', { name: /create account/i }).click(),
    ]);
    await sp.waitForTimeout(1000);
    const u = (await db.query(`select id from "User" where email=$1`, [buyerEmail])).rows[0];
    if (u) created.users.push(u.id);
    check('storefront ui: registration creates the account', !!u);
  });

  if (productId) {
    await step(sp, 'storefront ui: product page shows admin data', async () => {
      await sp.goto(`${WEB}/products/${productId}`, { waitUntil: 'networkidle' });
      await sp.getByText(productName).first().waitFor({ timeout: 30000 });
      const html = await sp.content();
      check('storefront ui: product page shows the edited price $42.00', /\$42\.00/.test(html));
      check('storefront ui: product page shows the uploaded image', /res\.cloudinary\.com/.test(html));
      check('storefront ui: product page shows the description', html.includes('QA UI description'));
    });

    await step(sp, 'storefront ui: add to cart', async () => {
      await sp.getByRole('button', { name: /add to (cart|bag|basket)/i }).first().click();
      await sp.waitForTimeout(800);
      await sp.goto(`${WEB}/cart`, { waitUntil: 'networkidle' });
      await sp.getByText(productName).first().waitFor({ timeout: 15000 });
      check('storefront ui: product is in the cart', true);
    });

    await step(sp, 'storefront ui: checkout with new address + COD', async () => {
      await sp.goto(`${WEB}/checkout`, { waitUntil: 'networkidle' });
      await sp.getByLabel(/full name/i).fill('QA Shopper');
      await sp.getByLabel(/address line 1/i).fill('1 QA Street');
      await sp.getByLabel(/^city/i).fill('Riyadh');
      await sp.getByLabel(/postal/i).fill('12345');
      await sp.getByLabel(/country/i).fill('SA');
      await sp.getByRole('button', { name: /save address/i }).click();
      await sp.getByText('1 QA Street').first().waitFor({ timeout: 15000 });

      // Summary should come from the server quote: 42.00 + 25.00 shipping, 15% KSA tax = 77.05
      await sp.getByText(/Tax \(15%\)/).waitFor({ timeout: 15000 });
      const summary = await sp.locator('text=Total').last().locator('..').innerText();
      check('storefront ui: checkout total = server quote ($77.05)', summary.includes('$77.05'), summary);

      await sp.getByText('Cash on Delivery').click();
      const [resp] = await Promise.all([
        sp.waitForResponse((r) => r.url().endsWith('/orders') && r.request().method() === 'POST', { timeout: 30000 }),
        sp.getByRole('button', { name: /place order/i }).click(),
      ]);
      const body = await resp.json().catch(() => ({}));
      orderId = body?.id;
      if (orderId) created.orders.push(orderId);
      check('storefront ui: order placed from the checkout page', resp.status() === 201, { status: resp.status(), body });
      await sp.waitForURL(/\/checkout\/confirmation\//, { timeout: 30000 });
    });

    if (orderId) {
      await step(sp, 'storefront ui: confirmation page', async () => {
        await sp.getByText(/Thank you, QA/).first().waitFor({ timeout: 20000 });
        const html = await sp.content();
        const order = (await db.query(`select "orderNumber" from "Order" where id=$1`, [orderId])).rows[0];
        check('storefront ui: confirmation greets the real customer', true);
        check('storefront ui: confirmation shows the real order number', html.includes(order.orderNumber), order.orderNumber);
        check('storefront ui: confirmation shows the real address', html.includes('1 QA Street'));
        check('storefront ui: confirmation shows no sample data', !/Noor|AM-2026-04871|Villa 22/.test(html));
      });

      await step(sp, 'storefront ui: cart emptied after order', async () => {
        await sp.goto(`${WEB}/cart`, { waitUntil: 'networkidle' });
        const html = await sp.content();
        check('storefront ui: cart is empty after ordering', !html.includes(productName));
      });

      await step(sp, 'storefront ui: order history', async () => {
        await sp.goto(`${WEB}/account/orders`, { waitUntil: 'networkidle' });
        const order = (await db.query(`select "orderNumber" from "Order" where id=$1`, [orderId])).rows[0];
        await sp.getByText(order.orderNumber).first().waitFor({ timeout: 20000 });
        check('storefront ui: order appears in account order history', true);
      });

      // =============== ADMIN UI: the order arrives; fulfil it ===============
      await step(ap, 'admin ui: order list shows the new order', async () => {
        const order = (await db.query(`select "orderNumber" from "Order" where id=$1`, [orderId])).rows[0];
        await ap.goto(`${WEB}/admin/orders`, { waitUntil: 'networkidle' });
        await ap.getByText(order.orderNumber).first().waitFor({ timeout: 20000 });
        check('admin ui: new order visible in the dashboard order list', true);
      });

      await step(ap, 'admin ui: order detail and fulfilment', async () => {
        await ap.goto(`${WEB}/admin/orders/${orderId}`, { waitUntil: 'networkidle' });
        const html = await ap.content();
        check('admin ui: order detail shows total $77.05', html.includes('77.05'));
        check('admin ui: order detail shows the customer', html.includes(buyerEmail) || html.includes('QA Shopper'));
      });

      await step(ap, 'admin ui: fulfil order with the detail-page buttons', async () => {
        const dbStatus = async () => (await db.query(`select o.status, p.status ps from "Order" o join "Payment" p on p."orderId"=o.id where o.id=$1`, [orderId])).rows[0];
        await Promise.all([
          ap.waitForResponse((r) => r.url().includes('/payments/') && r.request().method() === 'PATCH', { timeout: 30000 }),
          ap.getByRole('button', { name: /mark payment paid/i }).click(),
        ]);
        await ap.waitForTimeout(800);
        let st = await dbStatus();
        check('admin ui: "Mark Payment Paid" settles payment and moves order to PROCESSING', st.ps === 'PAID' && st.status === 'PROCESSING', st);
        await ap.getByRole('button', { name: /mark as shipped/i }).waitFor({ timeout: 15000 });
        await Promise.all([
          ap.waitForResponse((r) => r.url().endsWith(`/orders/${orderId}`) && r.request().method() === 'PATCH', { timeout: 30000 }),
          ap.getByRole('button', { name: /mark as shipped/i }).click(),
        ]);
        await ap.waitForTimeout(800);
        st = await dbStatus();
        check('admin ui: "Mark as SHIPPED" ships the order', st.status === 'SHIPPED', st);
      });

      await step(sp, 'storefront ui: customer sees the shipped order', async () => {
        const order = (await db.query(`select "orderNumber" from "Order" where id=$1`, [orderId])).rows[0];
        await sp.goto(`${WEB}/track/${order.orderNumber}`, { waitUntil: 'networkidle' });
        const html = await sp.content();
        check('storefront ui: tracking page shows the order as shipped', /shipped|on its way|in transit/i.test(html));
        check('storefront ui: tracking page hides the street address', !html.includes('1 QA Street'));
      });

      await step(sp, 'storefront ui: card checkout without Stripe degrades gracefully', async () => {
        await sp.goto(`${WEB}/products/${productId}`, { waitUntil: 'networkidle' });
        await sp.getByRole('button', { name: /add to (cart|bag|basket)/i }).first().click();
        await sp.waitForTimeout(800);
        await sp.goto(`${WEB}/checkout`, { waitUntil: 'networkidle' });
        await sp.getByText(/Tax \(15%\)/).waitFor({ timeout: 15000 });
        await sp.getByText('Credit / Debit Card').click();
        const [resp] = await Promise.all([
          sp.waitForResponse((r) => r.url().endsWith('/orders') && r.request().method() === 'POST', { timeout: 30000 }),
          sp.getByRole('button', { name: /continue to payment/i }).click(),
        ]);
        const body = await resp.json().catch(() => ({}));
        if (body?.id) created.orders.push(body.id);
        await sp.waitForURL(/\/checkout\/payment\?orderId=/, { timeout: 30000 });
        await sp.getByText(/card payments are not available|unavailable/i).first().waitFor({ timeout: 20000 });
        check('storefront ui: card order reaches payment page and shows a clear "unavailable" message', true);
        check('storefront ui: payment page shows no fake card details', !/4242|NOOR AL AMIN/.test(await sp.content()));
      });
    }
  }

  check('no uncaught page errors or 5xx API responses (admin)', adminProblems.length === 0, adminProblems);
  check('no uncaught page errors or 5xx API responses (storefront)', shopProblems.length === 0, shopProblems);
}

async function cleanup() {
  try { await browser?.close(); } catch {}
  if (!db) return;
  try {
    for (const id of created.orders) await db.query(`delete from "Order" where id=$1`, [id]);
    const admin = (await api('POST', '/auth/admin/signin', { body: { email: `qa-ui-admin-${RUN}@example.test`, password: 'Qa-Admin-Passw0rd!' } })).data?.token;
    for (const id of created.products) {
      const r = await api('DELETE', `/products/${id}`, { token: admin });
      if (r.status !== 200) await db.query(`delete from "Product" where id=$1`, [id]);
    }
    await db.query(`delete from "Customer" where email like $1`, [`qa-ui-%-${RUN}@example.test`]);
    for (const id of created.users) await db.query(`delete from "User" where id=$1`, [id]);
    await db.query(`delete from "User" where email like $1`, [`qa-ui-%-${RUN}@example.test`]);
  } finally { await db.end(); }
}

main()
  .catch((e) => { console.error('CRASH', e); results.push({ ok: false, name: 'suite crashed' }); })
  .finally(async () => {
    await cleanup();
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} passed`);
    process.exit(failed.length ? 1 : 0);
  });
