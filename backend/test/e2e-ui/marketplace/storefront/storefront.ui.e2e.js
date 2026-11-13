// Storefront marketplace UI walkthrough. Reads ./state.json written by qa/setup.js.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:3000';
const state = JSON.parse(fs.readFileSync(path.join(__dirname, 'state.json'), 'utf8'));
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const [A, B] = state.vendors; // A = Riyadh, B = Jeddah
const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok: !!ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  — ${extra}` : ''}`);
};
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `sfui-${name}.png`), fullPage: true });

async function setLocationByText(page, text) {
  await page.locator('header button[aria-haspopup="dialog"]').first().click();
  await page.getByPlaceholder('Postcode, city or area').fill(text);
  await page.getByRole('button', { name: 'SET', exact: true }).click();
  await page.waitForFunction((t) => {
    try { return (JSON.parse(localStorage.getItem('rz.location')) || {}).source === 'lookup' && document.querySelector('header')?.innerText.toLowerCase().includes(t); } catch { return false; }
  }, text.toLowerCase(), { timeout: 15000 });
}

async function firstCardShops(page) {
  await page.waitForSelector('a[href^="/shops/"]', { timeout: 30000 });
  // Seller links within the results grid, in display order.
  return page.$$eval('main .grid a[href^="/shops/"]', (els) => els.map((e) => e.textContent.trim()));
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  // No geolocation permission granted → the browser denies it.
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

  const q = encodeURIComponent(state.productName);
  try {
    // 1. Location by typed city, then search.
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await setLocationByText(page, 'Riyadh');
    check('location set by typing "Riyadh"', true);
    await page.goto(`${BASE}/search?q=${q}`, { waitUntil: 'networkidle' });
    let shops = await firstCardShops(page);
    check('Riyadh shop ranks first near Riyadh', shops[0] === A.shopName, shops.join(' | '));
    const bodyText = await page.locator('main').innerText();
    check('distances shown', /Under 50 m away|km away/.test(bodyText) && /846 km away/.test(bodyText));
    check('"Delivers to you" shown', bodyText.includes('Delivers to you'));
    await shot(page, '01-search-riyadh');

    // Nearest sort + radius on the products listing.
    await page.goto(`${BASE}/products?search=${q}&sort=nearest&radiusKm=100`, { waitUntil: 'networkidle' });
    shops = await firstCardShops(page);
    check('radius 100 km near Riyadh keeps only the Riyadh shop', shops.length === 1 && shops[0] === A.shopName, shops.join(' | '));
    await shot(page, '02-products-nearest-radius');

    // 2. Switch to Jeddah — order flips.
    await setLocationByText(page, 'Jeddah');
    await page.goto(`${BASE}/search?q=${q}`, { waitUntil: 'networkidle' });
    shops = await firstCardShops(page);
    check('Jeddah shop ranks first near Jeddah', shops[0] === B.shopName, shops.join(' | '));
    await shot(page, '03-search-jeddah');

    // 3. Geolocation denied, and search without any location.
    await page.locator('header button[aria-haspopup="dialog"]').first().click();
    await page.getByRole('button', { name: 'Clear location' }).click();
    await page.locator('header button[aria-haspopup="dialog"]').first().click();
    await page.getByRole('button', { name: 'Use my location' }).click();
    const alert = page.locator('header [role="alert"]');
    await alert.waitFor({ timeout: 15000 });
    const alertText = await alert.innerText();
    check('geolocation denial handled with a message', /denied|couldn't|took too long/i.test(alertText), alertText);
    await shot(page, '04-geolocation-denied');
    await page.keyboard.press('Escape');
    await page.goto(`${BASE}/search?q=${q}`, { waitUntil: 'networkidle' });
    shops = await firstCardShops(page);
    const noLocText = await page.locator('main').innerText();
    check('search works with no location (both shops, no distances)', shops.length === 2 && !/km away/.test(noLocText), shops.join(' | '));
    const nearestDisabled = await page.$eval('select[aria-label="Sort by"] option[value="nearest"]', (o) => o.disabled);
    const radiusDisabled = await page.locator('select[aria-label="Distance"]').isDisabled();
    check('Nearest sort and radius disabled without a location', nearestDisabled && radiusDisabled);

    // Back to Riyadh for the rest.
    await setLocationByText(page, 'Riyadh');

    // Shop page.
    await page.goto(`${BASE}/shops/${B.slug}`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: B.shopName }).waitFor();
    const shopText = await page.locator('main').innerText();
    check('shop page: hours, radius, distance, map link', /Monday/.test(shopText) && /Delivers within 50 km/.test(shopText) && /846 km away/.test(shopText) && (await page.locator('a[href*="openstreetmap.org"]').count()) === 1);
    check('shop page lists its product', shopText.includes(state.productName));
    await shot(page, '05-shop-page');

    // Home: shops near you.
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Shops Near You' }).waitFor({ timeout: 15000 });
    await page.locator('section[aria-label="Shops near you"]').getByText(A.shopName).waitFor({ timeout: 15000 });
    check('home shows Shops Near You with the Riyadh shop', true);
    await page.locator('section[aria-label="Shops near you"]').screenshot({ path: path.join(SHOTS, 'sfui-06-home-shops-near-you.png') });

    // Report dialog prompts sign-in when signed out.
    await page.goto(`${BASE}/products/${A.productId}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Report this product' }).click();
    check('report prompts sign-in when signed out', await page.getByRole('link', { name: 'Sign in to report' }).isVisible());
    await page.keyboard.press('Escape');

    // 4. Sign in as the customer.
    await page.goto(`${BASE}/auth/login?redirect=/products/${A.productId}`, { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').fill(state.customer.email);
    await page.locator('input[type="password"]').fill(state.customer.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(`**/products/${A.productId}`, { timeout: 20000 });
    await page.waitForLoadState('networkidle');

    // Product page: seller card + also sold by.
    await page.getByText('SOLD BY', { exact: true }).waitFor();
    const pText = await page.locator('main').innerText();
    check('product page seller card with distance', pText.includes(A.shopName) && /Under 50 m away/.test(pText));
    await page.locator('#also-sold-by').waitFor();
    await page.getByRole('button', { name: `Add to cart from ${B.shopName}` }).waitFor({ timeout: 15000 });
    check('"Also sold by" lists the Jeddah shop', true);
    await page.getByRole('button', { name: 'ADD TO CART', exact: true }).click();
    await page.getByRole('button', { name: `Add to cart from ${B.shopName}` }).click();
    await shot(page, '07-product-page');

    // Report (signed in).
    await page.getByRole('button', { name: 'Report this product' }).click();
    await page.getByLabel('Misleading listing').check();
    await page.locator('dialog textarea').fill('QA test report — please ignore');
    await page.getByRole('button', { name: 'Send report' }).click();
    await page.getByText('Your report has been sent').waitFor({ timeout: 15000 });
    check('report submitted while signed in', true);
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();

    // 5. Cart grouped by shop.
    await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' });
    const cartText = await page.locator('main').innerText();
    check('cart groups both shops under headers', cartText.includes(A.shopName.toUpperCase()) && cartText.includes(B.shopName.toUpperCase()));
    await shot(page, '08-cart-grouped');

    // 6. Checkout: Jeddah's default delivery is outside its 50 km radius.
    await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
    const groupB = page.locator('[data-testid="shop-group"]', { hasText: B.shopName });
    await groupB.locator('[role="alert"]').waitFor({ timeout: 20000 });
    const errText = await groupB.locator('[role="alert"]').innerText();
    check('out-of-radius error shown next to the Jeddah shop', /only delivers within 50 km/.test(errText), errText.split('\n')[0]);
    const placeDisabledWhileError = await page.getByRole('button', { name: /Place Order|Continue to Payment/ }).isDisabled();
    check('place-order disabled while a shop choice is invalid', placeDisabledWhileError);
    await shot(page, '09-checkout-radius-error');
    await groupB.getByRole('button', { name: /Switch to pickup/ }).click();
    await groupB.locator('dl').waitFor({ timeout: 20000 });
    const groupA = page.locator('[data-testid="shop-group"]', { hasText: A.shopName });
    check('Riyadh shop on Delivery, Jeddah on Pickup', (await groupA.locator('input[value="DELIVERY"]').isChecked()) && (await groupB.locator('input[value="PICKUP"]').isChecked()));
    const pickupDisabledA = await groupA.locator('input[value="PICKUP"]').isDisabled();
    check('Riyadh pickup option disabled (not offered)', pickupDisabledA);
    await page.getByText('Cash on Delivery').click();
    await shot(page, '10-checkout-ready');

    // Double-click the place-order button: must create one order.
    const orderPosts = [];
    page.on('request', (r) => { if (r.method() === 'POST' && /\/orders$/.test(r.url())) orderPosts.push(JSON.parse(r.postData() || '{}')); });
    const btn = page.getByRole('button', { name: 'Place Order' });
    await btn.dblclick();
    await page.waitForURL('**/checkout/confirmation/**', { timeout: 30000 });
    check('double-click sent one POST /orders with an idempotencyKey + fulfillment', orderPosts.length === 1 && !!orderPosts[0].idempotencyKey && orderPosts[0].fulfillment?.length === 2, JSON.stringify(orderPosts.map((p) => ({ key: p.idempotencyKey, f: p.fulfillment }))));
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="vendor-orders"]').waitFor({ timeout: 20000 });
    const confText = await page.locator('main').innerText();
    check('confirmation shows two shops with delivery/pickup', confText.includes('From 2 shops') && confText.includes(A.shopName) && confText.includes(B.shopName) && confText.includes('Pickup from the shop') && /\bDelivery\b/.test(confText));
    await shot(page, '11-confirmation');
    const orderNumber = (confText.match(/#([A-Z0-9-]+)/) || [])[1];
    state.orderNumber = orderNumber;

    await page.goto(`${BASE}/account/orders`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="vendor-orders"]').first().waitFor({ timeout: 20000 });
    const ordersText = await page.locator('main').innerText();
    check('order history shows both shops', ordersText.includes(A.shopName) && ordersText.includes(B.shopName));
    await shot(page, '12-order-history');

    if (orderNumber) {
      await page.goto(`${BASE}/track/${orderNumber}`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="vendor-orders"]').waitFor({ timeout: 20000 });
      const trackText = await page.locator('main').innerText();
      check('tracking page shows both shops', trackText.includes(A.shopName) && trackText.includes(B.shopName));
      await shot(page, '13-tracking');
    }

    // Verify-email with a bad token.
    await page.goto(`${BASE}/auth/verify-email?token=not-a-real-token`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Link invalid or expired' }).waitFor({ timeout: 15000 });
    check('verify-email shows "link invalid or expired" for a bad token', true);
    await shot(page, '14-verify-email-invalid');

    // Old cart format (no shop info) still loads, under "Other".
    await page.evaluate((pid) => localStorage.setItem('cart', JSON.stringify([{ productId: pid, name: 'Legacy line', price: 12, image: null, quantity: 1, stock: 5 }])), A.productId);
    await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' });
    const legacy = await page.locator('main').innerText();
    check('legacy cart lines load under "Other"', legacy.includes('OTHER') && legacy.includes('Legacy line'));
    await shot(page, '15-legacy-cart');
    await page.evaluate(() => localStorage.removeItem('cart'));

    // Mobile width: header and search render without horizontal scroll.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/search?q=${q}`, { waitUntil: 'networkidle' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('no horizontal overflow at 390px', overflow <= 1, `overflow=${overflow}`);
    await shot(page, '16-mobile-search');
  } catch (e) {
    check('walkthrough completed without exceptions', false, e.message.split('\n')[0]);
    await shot(page, 'zz-failure').catch(() => {});
  } finally {
    fs.writeFileSync(path.join(__dirname, 'state.json'), JSON.stringify(state, null, 2));
    const relevant = errors.filter((e) => !/Download the React DevTools|\[HMR\]|\[Fast Refresh\]/.test(e));
    check('no page errors / console errors', relevant.length === 0, relevant.slice(0, 5).join(' || '));
    console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
    await browser.close();
  }
})();
