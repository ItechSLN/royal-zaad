// Creates two QA vendors (Riyadh, Jeddah) selling the same product, plus a customer.
const fs = require('fs');
const path = require('path');
const BACKEND = path.join(__dirname, '../../../..');
const { Client } = require(path.join(BACKEND, 'node_modules/pg'));
const env = fs.readFileSync(path.join(BACKEND, '.env'), 'utf8');
const DATABASE_URL = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m)[1];
const API = 'http://localhost:8080/api/v1';
const ts = Date.now();
const out = path.join(__dirname, 'state.json');

async function call(method, url, body, token, isForm) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + url, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${text}`);
  return data;
}

(async () => {
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  const state = { ts, vendors: [], productIds: [], userIds: [] };
  try {
    const cats = await call('GET', '/categories?limit=50');
    const category = cats.data.find((c) => c.isVisible) ?? cats.data[0];
    const barcode = `99${String(ts).slice(-10)}`;
    const productName = `QA Marketplace Saffron ${ts}`;
    const vendorsDef = [
      { key: 'a', shopName: `QA Riyadh Spice ${ts}`, city: 'Riyadh', postalCode: '12345', price: '40' },
      { key: 'b', shopName: `QA Jeddah Spice ${ts}`, city: 'Jeddah', postalCode: '21442', price: '35' },
    ];
    for (const v of vendorsDef) {
      const email = `qa-sfui-${ts}-${v.key}@example.test`;
      const reg = await call('POST', '/auth/register-vendor', {
        email, password: 'QaPassw0rd!', firstName: 'QA', lastName: `Vendor ${v.key.toUpperCase()}`,
        shopName: v.shopName, addressLine1: '1 Test Street', city: v.city, postalCode: v.postalCode, country: 'SA',
      });
      state.userIds.push(reg.user.id);
      if (reg.verifyUrl) {
        const token = new URL(reg.verifyUrl, 'http://x').searchParams.get('token');
        await call('POST', '/auth/verify-email', { token });
      }
      await db.query(`update "Vendor" set status='ACTIVE' where "userId" = $1`, [reg.user.id]);
      if (v.key === 'b') await call('PATCH', '/vendor/shop', { offersPickup: true, deliveryRadiusKm: 50, openingHours: { mon: [{ open: '09:00', close: '18:00' }] } }, reg.token);
      const form = new FormData();
      form.append('name', productName);
      form.append('slug', `qa-saffron-${ts}-${v.key}`);
      form.append('sku', `QA-SAF-${ts}-${v.key}`);
      form.append('price', v.price);
      form.append('categoryId', category.id);
      form.append('barcode', barcode);
      form.append('shortDescription', 'QA test listing');
      form.append('isActive', 'true');
      const product = await call('POST', '/vendor/products', form, reg.token, true);
      state.productIds.push(product.id);
      if (product.moderationStatus && product.moderationStatus !== 'APPROVED') {
        await db.query(`update "Product" set "moderationStatus"='APPROVED' where id=$1`, [product.id]);
      }
      await call('POST', `/vendor/inventory/${product.id}/adjust`, { reason: 'RECEIPT', quantity: 10 }, reg.token);
      const shop = await call('GET', '/vendor/shop', null, reg.token);
      state.vendors.push({ key: v.key, email, userId: reg.user.id, token: reg.token, shopId: shop.id, slug: shop.slug,
        shopName: shop.name, lat: shop.latitude, lng: shop.longitude, verified: shop.locationVerifiedAt,
        offersDelivery: shop.offersDelivery, offersPickup: shop.offersPickup, radius: shop.deliveryRadiusKm, productId: product.id });
    }
    // Customer with a Riyadh address.
    const cEmail = `qa-sfui-${ts}-c@example.test`;
    const c = await call('POST', '/auth/register', { email: cEmail, password: 'QaPassw0rd!', firstName: 'QA', lastName: 'Customer' });
    state.userIds.push(c.user.id);
    const addr = await call('POST', '/addresses', { recipientName: 'QA Customer', line1: '5 Olaya Street', line2: '', city: 'Riyadh',
      state: '', postalCode: '11564', country: 'SA', phone: '+966500000000', isDefault: true }, c.token);
    state.customer = { email: cEmail, password: 'QaPassw0rd!', token: c.token, userId: c.user.id, addressId: addr.id, addrLat: addr.latitude, addrLng: addr.longitude };
    state.productName = productName; state.barcode = barcode;
  } finally {
    fs.writeFileSync(out, JSON.stringify(state, null, 2));
    await db.end();
  }
  console.log(JSON.stringify({ ...state, vendors: state.vendors.map(({ token, ...v }) => v), customer: { ...state.customer, token: undefined } }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
