// Vendor dashboard E2E. Run: NODE_PATH=../pw/node_modules node flow.js <stage>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const q = require('./db');

const BASE = 'http://localhost:3000';
const API = 'http://localhost:8080/api/v1';
const DIR = __dirname;
const SHOTS = path.join(DIR, 'shots');
const STATE = path.join(DIR, 'state.json');
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const save = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
const log = (...a) => console.log('•', ...a);
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); log('ok -', m); };

async function api(method, url, body, token) {
  const res = await fetch(API + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${url} ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function withPage(fn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  if (state.token) {
    await page.goto(BASE + '/vendor/login');
    await page.evaluate((t) => localStorage.setItem('authToken', t), state.token);
  }
  try {
    await fn(page);
  } catch (e) {
    await page.screenshot({ path: path.join(SHOTS, 'FAIL.png'), fullPage: true });
    throw e;
  } finally {
    if (errors.length) console.log('browser errors:', [...new Set(errors)].slice(0, 10));
    await browser.close();
  }
}
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true });

const stages = {

  async extra() {
    // Customer already exists from `order`; sign in for two more orders.
    const { token } = await api('POST', '/auth/login', { email: state.customerEmail, password: 'Passw0rd!qa' });
    const addrs = await api('GET', '/addresses', null, token);
    const addressId = (addrs.data ?? addrs)[0].id;
    const place = async (method) => {
      const o = await api('POST', '/orders', {
        items: [{ productId: state.productId, quantity: 1 }],
        shippingAddressId: addressId,
        fulfillment: [{ shopId: state.shopId, method }],
        paymentMethod: 'cod',
        idempotencyKey: require('crypto').randomUUID(),
      }, token);
      return { number: o.orderNumber, id: o.vendorOrders[0].id };
    };
    const delivery = await place('DELIVERY');
    const toCancel = await place('PICKUP');
    log('placed', delivery.number, toCancel.number);
    await withPage(async (page) => {
      await page.goto(BASE + `/vendor/orders/${delivery.id}`);
      await page.getByText('DELIVER TO').waitFor();
      await page.getByText('+966511111111').waitFor();
      assert(true, 'delivery order shows address + phone');
      await page.getByRole('button', { name: /Accept order/ }).click();
      await page.getByText('Order accepted.').waitFor();
      await page.getByRole('button', { name: /Mark shipped/ }).click();
      const dlg = page.getByRole('dialog');
      await dlg.locator('input').nth(0).fill('Aramex');
      await dlg.locator('input').nth(1).fill('QA-TRACK-123');
      await shot(page, '27-ship-dialog');
      await dlg.getByRole('button', { name: 'Mark shipped' }).click();
      await page.getByText('Marked as shipped.').waitFor();
      await page.getByText('Tracking QA-TRACK-123').waitFor();
      await page.getByRole('button', { name: /Mark delivered/ }).click();
      await page.getByText('Marked as delivered.').waitFor();
      await shot(page, '28-delivery-delivered');
      assert(true, 'delivery order: accept -> ship (Aramex/QA-TRACK-123) -> delivered');

      await page.goto(BASE + `/vendor/orders/${toCancel.id}`);
      await page.getByRole('button', { name: /Cancel order/ }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel order' }).click();
      await page.getByText('Order cancelled and items restocked.').waitFor();
      const [vo] = await q(`select status from "VendorOrder" where id=$1`, [toCancel.id]);
      assert(vo.status === 'CANCELLED', 'cancel with confirm');

      // Moderation reason display
      await q(`update "Product" set "moderationStatus"='REJECTED', "moderationReason"='Photos must show the actual product' where id=$1`, [state.productId]);
      await page.goto(BASE + '/vendor/products?status=rejected');
      await page.getByText('Photos must show the actual product').waitFor();
      await shot(page, '29-products-rejected-reason');
      await page.goto(BASE + `/vendor/products/${state.productId}`);
      await page.getByText('Reason from the marketplace:').waitFor();
      await shot(page, '30-product-rejected');
      await page.getByRole('button', { name: /Save changes/ }).click();
      await page.getByText('Changes saved.').waitFor();
      const [p] = await q(`select "moderationStatus","moderationReason" from "Product" where id=$1`, [state.productId]);
      log('after resubmitting rejected product:', JSON.stringify(p));
      await q(`update "Product" set "moderationStatus"='REMOVED', "moderationReason"='Counterfeit report upheld' where id=$1`, [state.productId]);
      await page.reload();
      await page.getByText('Counterfeit report upheld').first().waitFor();
      assert(await page.getByRole('button', { name: /Save changes/ }).isDisabled(), 'REMOVED product: save disabled, reason shown');
      await shot(page, '31-product-removed');
      await q(`update "Product" set "moderationStatus"='APPROVED', "moderationReason"=null where id=$1`, [state.productId]);
    });
  },
  async register() {
    state.ts = Date.now();
    state.email = `qa-vui-${state.ts}@example.test`;
    state.password = 'Passw0rd!qa';
    state.shopName = `QA VUI Shop ${state.ts}`;
    save();
    await withPage(async (page) => {
      await page.goto(BASE + '/vendor/register');
      // Field errors from client validation first.
      await page.getByRole('button', { name: /CREATE MY SHOP/ }).click();
      await page.getByText('Shop name is required').waitFor();
      log('client validation shows field errors');
      const fill = (n, v) => page.locator(`[name="${n}"]`).fill(v);
      await fill('firstName', 'Qa');
      await fill('lastName', 'Vendor');
      await fill('email', state.email);
      await fill('password', state.password);
      await fill('shopName', state.shopName);
      await fill('phone', '+966500000000');
      await fill('addressLine1', 'King Fahd Road');
      await fill('city', 'Riyadh');
      await fill('postalCode', '12345');
      await fill('country', 'sa');
      await shot(page, '01-register-form');
      await page.getByRole('button', { name: /CREATE MY SHOP/ }).click();
      const link = page.getByRole('link', { name: 'Confirm your email' });
      await link.waitFor({ timeout: 20000 });
      state.token = await page.evaluate(() => localStorage.getItem('authToken'));
      save();
      assert(state.token, 'token stored in localStorage authToken');
      await shot(page, '02-register-done');
      const href = await link.getAttribute('href');
      assert(href.startsWith('/vendor/verify-email?token='), 'verify link points at /vendor/verify-email: ' + href.slice(0, 40));

      // Duplicate email -> API field error is shown.
      // (checked below via a second context-free page load)
      await page.getByRole('button', { name: /Go to your dashboard/ }).click();
      await page.waitForURL(BASE + '/vendor');
      await page.getByText('Your shop is awaiting approval').waitFor();
      await page.getByText(/Confirm your email \(/).waitFor();
      await page.getByText('Gross sales').waitFor();
      await shot(page, '03-overview-pending-unverified');
      assert(true, 'pending banner + confirm-email prompt shown');

      // Resend button
      await page.getByRole('button', { name: 'Resend email' }).click();
      await page.getByRole('link', { name: 'Confirm your email' }).waitFor();
      log('resend returned a dev confirmation link');

      await page.goto(BASE + href);
      await page.getByText(/Email confirmed/).waitFor();
      await shot(page, '04-verify-email');
      assert(true, 'email confirmed via /vendor/verify-email');

      await page.goto(BASE + '/vendor');
      await page.getByText('Your shop is awaiting approval').waitFor();
      assert((await page.getByText(/Confirm your email \(/).count()) === 0, 'confirm prompt gone after verifying');
    });

    // Duplicate registration shows API field error.
    await withPage(async (page) => {
      await page.evaluate(() => localStorage.removeItem('authToken'));
      await page.goto(BASE + '/vendor/register');
      const fill = (n, v) => page.locator(`[name="${n}"]`).fill(v);
      await fill('firstName', 'Qa');
      await fill('lastName', 'Dup');
      await fill('email', state.email);
      await fill('password', state.password);
      await fill('shopName', 'Dup shop');
      await page.getByRole('button', { name: /CREATE MY SHOP/ }).click();
      await page.getByText('An account with this email already exists').waitFor();
      await shot(page, '05-register-duplicate-error');
      assert(true, 'API field error shown for duplicate email');
    });

    const [row] = await q(
      `select u.id as "userId", v.id as "vendorId", s.id as "shopId", s."locationVerifiedAt", u."emailVerifiedAt"
       from "User" u join "Vendor" v on v."userId"=u.id join "Shop" s on s."vendorId"=v.id where u.email=$1`,
      [state.email]
    );
    Object.assign(state, row);
    save();
    assert(row.emailVerifiedAt, 'DB: emailVerifiedAt set');
    log('shop located at signup:', !!row.locationVerifiedAt);
  },

  async guard() {
    await withPage(async (page) => {
      await page.evaluate(() => localStorage.removeItem('authToken'));
      await page.goto(BASE + '/vendor/products');
      await page.waitForURL(BASE + '/vendor/login');
      assert(true, 'no token -> redirected to /vendor/login');
      await page.locator('[name="email"]').fill(state.email);
      await page.locator('[name="password"]').fill('wrong-password');
      await page.getByRole('button', { name: 'SIGN IN' }).click();
      await page.locator('p[role=alert]').waitFor();
      log('bad password message:', await page.locator('p[role=alert]').innerText());
      await page.locator('[name="password"]').fill(state.password);
      await page.getByRole('button', { name: 'SIGN IN' }).click();
      await page.waitForURL(BASE + '/vendor');
      await shot(page, '06-login-ok');
      state.token = await page.evaluate(() => localStorage.getItem('authToken'));
      save();
      assert(true, 'vendor sign-in -> dashboard');
    });
    // A customer token is turned away.
    const cust = await api('POST', '/auth/register', {
      email: `qa-vui-guard-${state.ts}@example.test`, password: 'Passw0rd!qa', firstName: 'Qa', lastName: 'Guard',
    });
    state.guardCustomerEmail = `qa-vui-guard-${state.ts}@example.test`;
    save();
    await withPage(async (page) => {
      await page.evaluate((t) => localStorage.setItem('authToken', t), cust.token);
      await page.goto(BASE + '/vendor');
      await page.waitForURL(BASE + '/vendor/login');
      assert(true, 'customer token -> redirected to /vendor/login');
    });
  },

  async approve() {
    await q(`update "Vendor" set status='ACTIVE', "approvedAt"=now() where "userId"=$1`, [state.userId]);
    assert(true, 'vendor approved in DB');
  },

  async product() {
    if (state.productId) {
      await api('DELETE', `/vendor/products/${state.productId}`, null, state.token).catch((e) => log('cleanup prev:', e.message));
      delete state.productId;
    }
    await withPage(async (page) => {
      // Make a real PNG by screenshotting an element.
      await page.setContent('<div id="x" style="width:240px;height:240px;background:linear-gradient(135deg,#D4AF37,#16140F)"></div>');
      await page.locator('#x').screenshot({ path: path.join(DIR, 'qa-image.png') });

      await page.goto(BASE + '/vendor/products');
      await page.getByText(/haven.t added any products/).waitFor();
      await shot(page, '07-products-empty');
      assert(true, 'products empty state');

      await page.goto(BASE + '/vendor/products/new');
      await page.getByRole('button', { name: /Create product/ }).click();
      await page.getByText('Check the highlighted fields.').waitFor();
      assert((await page.getByText('Name is required').count()) > 0, 'product form validation');

      state.sku = `QA-VUI-${state.ts}`;
      save();
      await page.locator('[name="name"]').fill(`QA VUI Honey ${state.ts}`);
      await page.locator('[name="sku"]').fill(state.sku);
      await page.locator('[name="price"]').fill('42.50');
      await page.locator('[name="compareAtPrice"]').fill('50');
      await page.locator('[name="costPrice"]').fill('20');
      await page.locator('[name="shortDescription"]').fill('500 g · QA');
      await page.locator('textarea[name="description"]').fill('Created by the vendor dashboard QA run.');
      const cat = page.locator('select[name="categoryId"]');
      await page.waitForFunction(() => document.querySelectorAll('select[name="categoryId"] option').length > 1);
      const value = await cat.locator('option').nth(1).getAttribute('value');
      await cat.selectOption(value);
      await page.locator('input[type=file][name="images"]').setInputFiles(path.join(DIR, 'qa-image.png'));
      await page.getByText('1 queued').waitFor();
      assert(true, 'image queued after picking (files copied before input cleared)');
      await shot(page, '08-product-new');
      await page.getByRole('button', { name: /Create product/ }).click();
      await page.waitForURL(/\/vendor\/products\/(?!new)[a-z0-9]+$/, { timeout: 30000 });
      state.productId = page.url().split('/').pop();
      save();
      await page.getByText('MAIN', { exact: true }).waitFor();
      const src = await page.locator('img[src*="res.cloudinary"], img[src^="http"]').first().getAttribute('src');
      assert(src, 'uploaded image rendered: ' + src.slice(0, 60));
      await shot(page, '09-product-edit');

      // Edit: change price, unpublish/publish
      await page.locator('[name="price"]').fill('45');
      await page.getByRole('button', { name: /Save changes/ }).click();
      await page.getByText('Changes saved.').waitFor();
      const [p] = await q(`select price, "isActive", "moderationStatus", "shopId" from "Product" where id=$1`, [state.productId]);
      assert(Number(p.price) === 45 && p.isActive && p.shopId === state.shopId, 'DB: product saved in my shop, price 45, published; moderation ' + p.moderationStatus);

      // Duplicate SKU -> API field error
      await page.goto(BASE + '/vendor/products/new');
      await page.locator('[name="name"]').fill(`QA VUI Dup ${state.ts}`);
      await page.locator('[name="sku"]').fill(state.sku);
      await page.locator('[name="price"]').fill('1');
      await page.waitForFunction(() => document.querySelectorAll('select[name="categoryId"] option').length > 1);
      await page.locator('select[name="categoryId"]').selectOption(value);
      await page.getByRole('button', { name: /Create product/ }).click();
      await page.locator('p[role=alert]').waitFor();
      log('duplicate SKU error:', await page.locator('p[role=alert]').innerText());
      await shot(page, '10-product-dup-sku');

      // List: tabs + search
      await page.goto(BASE + '/vendor/products');
      await page.getByText(`QA VUI Honey ${state.ts}`).waitFor();
      await page.getByRole('button', { name: 'Drafts' }).click();
      await page.getByText('No products match this filter.').waitFor();
      await page.getByRole('button', { name: 'Published' }).click();
      await page.getByText(`QA VUI Honey ${state.ts}`).waitFor();
      await page.getByPlaceholder('Search name or SKU').fill('zzz-nothing');
      await page.getByText('No products match this filter.').waitFor();
      await page.getByPlaceholder('Search name or SKU').fill(state.sku);
      await page.getByText(`QA VUI Honey ${state.ts}`).waitFor();
      await shot(page, '11-products-list');
      assert(true, 'product list tabs + search');

      // Archive / unarchive via row menu
      await page.getByRole('button', { name: 'Row actions' }).first().click();
      await page.getByText('Archive', { exact: true }).click();
      await page.getByText(/archived\./).waitFor();
      await page.getByRole('button', { name: 'Archived' }).click();
      await page.getByText(`QA VUI Honey ${state.ts}`).waitFor();
      await page.getByRole('button', { name: 'Row actions' }).first().click();
      await page.getByText('Unarchive', { exact: true }).click();
      await page.getByText(/restored as a draft/).waitFor();
      assert(true, 'archive + unarchive');
      // Re-publish via edit form toggle
      await page.goto(BASE + `/vendor/products/${state.productId}`);
      const toggle = page.getByRole('switch', { name: 'Published' });
      await toggle.waitFor();
      if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click();
      await page.getByRole('button', { name: /Save changes/ }).click();
      await page.getByText('Changes saved.').waitFor();
      const [p2] = await q(`select "isActive","archivedAt" from "Product" where id=$1`, [state.productId]);
      assert(p2.isActive && !p2.archivedAt, 'republished after unarchive');
    });
  },

  async stock() {
    await withPage(async (page) => {
      await page.goto(BASE + '/vendor/inventory');
      await page.getByText(`QA VUI Honey ${state.ts}`).waitFor();
      await shot(page, '12-inventory-before');
      await page.getByRole('button', { name: 'Adjust' }).first().click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await dialog.locator('select').selectOption('RECEIPT');
      await dialog.locator('input[type=number]').nth(0).fill('25');
      await dialog.locator('input[type=number]').nth(1).fill('5');
      await shot(page, '13-inventory-adjust');
      await dialog.getByRole('button', { name: 'Save' }).click();
      await page.getByText(/Stock updated/).waitFor();
      await page.waitForTimeout(500);
      const [inv] = await q(`select quantity, reserved, "reorderAt" from "Inventory" where "productId"=$1`, [state.productId]);
      assert(inv.quantity === 25 && inv.reorderAt === 5, 'DB: stock 25, reorder 5');
      await page.getByText('In stock').waitFor();
      await shot(page, '14-inventory-after');
    });
  },

  async shop() {
    await withPage(async (page) => {
      await page.goto(BASE + '/vendor/shop');
      await page.getByRole('heading', { name: 'Opening hours' }).waitFor();
      await shot(page, '15-shop-before');
      // Turn on pickup, set radius, hours, fees; change address to trigger geocoding.
      const pickup = page.getByRole('switch', { name: 'Pickup' });
      if ((await pickup.getAttribute('aria-checked')) !== 'true') await pickup.click();
      await page.getByLabel('Within a radius of my shop').check();
      await page.locator('[name="deliveryRadiusKm"]').fill('25');
      await page.locator('[name="shippingFlatFee"]').fill('12');
      await page.getByRole('switch', { name: 'Publish opening hours' }).click();
      for (const d of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Sunday']) await page.getByLabel(`Open on ${d}`).check();
      await page.getByLabel('Saturday opens').count().then((c) => assert(c === 0, 'Saturday closed'));
      await page.getByLabel('Monday closes').fill('21:00');
      await page.locator('[name="addressLine1"]').fill('Olaya Street');
      // Invalid hours first -> client error
      await page.getByLabel('Tuesday opens').fill('18:00');
      await page.getByLabel('Tuesday closes').fill('09:00');
      await page.getByRole('button', { name: /Save changes/ }).click();
      await page.getByText(/Tuesday: opening time must be before/).waitFor();
      await page.getByLabel('Tuesday opens').fill('09:00');
      await page.getByLabel('Tuesday closes').fill('17:00');
      await page.getByRole('button', { name: /Save changes/ }).click();
      await page.getByText('Shop settings saved.').waitFor({ timeout: 20000 });
      const msg = await page.getByRole('status').filter({ hasText: /Location|locate/ }).first().innerText().catch(() => '(none)');
      log('locationMessage:', msg);
      await shot(page, '16-shop-saved');
      const [s] = await q(
        `select "offersPickup","offersDelivery","deliveryRadiusKm","shippingFlatFee","openingHours","addressLine1","locationVerifiedAt" from "Shop" where id=$1`,
        [state.shopId]
      );
      log('DB shop:', JSON.stringify(s));
      assert(s.offersPickup && s.deliveryRadiusKm === 25 && Number(s.shippingFlatFee) === 12, 'DB: pickup on, 25 km, fee 12');
      assert(s.openingHours.mon[0].close === '21:00' && s.openingHours.sat.length === 0, 'DB: opening hours saved');

      // Both off -> validation
      await page.getByRole('switch', { name: 'Pickup' }).click();
      await page.getByRole('switch', { name: 'Delivery' }).click();
      await page.getByRole('button', { name: /Save changes/ }).click();
      await page.getByText('Offer delivery, pickup, or both').waitFor();
      assert(true, 'must offer delivery or pickup');

      // Logo upload
      await page.reload();
      await page.locator('input[name="logo"]').setInputFiles(path.join(DIR, 'qa-image.png'));
      await page.getByText('Logo updated.').waitFor({ timeout: 20000 });
      await page.getByAltText('Shop logo').waitFor();
      assert(true, 'logo uploaded');
      await shot(page, '17-shop-logo');
    });
  },

  async overview() {
    await withPage(async (page) => {
      await page.goto(BASE + '/vendor');
      await page.getByRole('heading', { name: 'Daily sales' }).waitFor();
      assert((await page.getByText('Your shop is awaiting approval').count()) === 0, 'no pending banner once ACTIVE');
      await page.getByRole('button', { name: '7 days' }).click();
      await page.getByText('Sales and activity for the last 7 days.').waitFor();
      await page.waitForTimeout(800);
      await shot(page, '18-overview-active');
      assert(true, 'overview renders with period switch');
    });
  },

  async order() {
    const email = `qa-vui-cust-${state.ts}@example.test`;
    state.customerEmail = email;
    save();
    const reg = await api('POST', '/auth/register', { email, password: 'Passw0rd!qa', firstName: 'Qa', lastName: 'Customer' });
    const addr = await api('POST', '/addresses', {
      recipientName: 'Qa Customer', line1: 'Tahlia Street', city: 'Riyadh', postalCode: '11564', country: 'SA', phone: '+966511111111',
    }, reg.token);
    const order = await api('POST', '/orders', {
      items: [{ productId: state.productId, quantity: 2 }],
      shippingAddressId: addr.id,
      fulfillment: [{ shopId: state.shopId, method: 'PICKUP' }],
      paymentMethod: 'cod',
      idempotencyKey: require('crypto').randomUUID(),
    }, reg.token);
    state.orderId = order.id;
    state.orderNumber = order.orderNumber;
    state.vendorOrderId = order.vendorOrders.find((v) => v.shopId === state.shopId).id;
    save();
    assert(state.vendorOrderId, `order ${order.orderNumber} placed with sub-order ${state.vendorOrderId}`);
  },

  async fulfil() {
    await withPage(async (page) => {
      await page.goto(BASE + '/vendor/orders');
      await page.getByText(state.orderNumber).waitFor();
      await shot(page, '19-orders-list');
      await page.getByRole('button', { name: 'Delivered' }).click();
      await page.getByText('No orders with this status.').waitFor();
      await page.getByRole('button', { name: 'New' }).click();
      await page.getByText(state.orderNumber).click();
      await page.waitForURL(/\/vendor\/orders\/.+/);
      await page.getByText('Pickup from your shop').waitFor();
      assert((await page.getByText('DELIVER TO').count()) === 0, 'pickup order hides address');
      assert((await page.getByRole('button', { name: /Mark shipped/ }).count()) === 0, 'no ship button while PENDING');
      await shot(page, '20-order-pending');
      await page.getByRole('button', { name: /Accept order/ }).click();
      await page.getByText('Order accepted.').waitFor();
      await page.getByRole('button', { name: /Ready for collection/ }).click();
      await page.getByText('Marked ready for collection.').waitFor();
      await page.getByText('Ready for collection').first().waitFor();
      assert((await page.getByRole('button', { name: /Cancel order/ }).count()) === 0, 'cancel hidden after SHIPPED');
      await shot(page, '21-order-ready');
      await page.getByRole('button', { name: /Mark collected/ }).click();
      await page.getByText('Marked as collected.').waitFor();
      await shot(page, '22-order-collected');
      const [vo] = await q(`select status from "VendorOrder" where id=$1`, [state.vendorOrderId]);
      assert(vo.status === 'DELIVERED', 'DB: sub-order DELIVERED');

      // Delete a product that has orders -> API 400 message shown
      await page.goto(BASE + `/vendor/products/${state.productId}`);
      await page.getByRole('button', { name: /Delete/ }).click();
      await page.getByRole('button', { name: 'Confirm' }).click();
      await page.getByText(/has orders/).first().waitFor();
      await shot(page, '23-delete-blocked');
      assert(true, 'delete blocked with API message');

      await page.goto(BASE + '/vendor/inventory');
      await page.getByText(`QA VUI Honey ${state.ts}`).waitFor();
      const [inv] = await q(`select quantity, reserved from "Inventory" where "productId"=$1`, [state.productId]);
      log('stock after collection:', JSON.stringify(inv));

      await page.goto(BASE + '/vendor/payouts');
      await page.getByText('Payout history').waitFor();
      await shot(page, '24-payouts');
      await page.goto(BASE + '/vendor');
      await page.getByRole('heading', { name: 'Daily sales' }).waitFor();
      await page.waitForTimeout(800);
      await shot(page, '25-overview-with-sale');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(BASE + '/vendor/orders');
      await page.getByText(state.orderNumber).waitFor();
      await shot(page, '26-mobile-orders');
    });
  },
};

(async () => {
  const which = process.argv.slice(2);
  for (const s of which) {
    console.log(`\n=== ${s}`);
    await stages[s]();
  }
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
