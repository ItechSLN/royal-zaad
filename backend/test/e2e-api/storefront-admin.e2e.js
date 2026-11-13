// End-to-end API integration test: admin -> catalogue -> storefront -> checkout -> admin orders.
// Run: NODE_PATH=<backend>/node_modules node e2e.js   (backend on :8080)
require('dotenv').config({ path: process.argv[2] });
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const API = process.env.API_URL ?? 'http://localhost:8080/api/v1';
const BACKEND_LOG = process.env.BACKEND_LOG;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const fs = require('fs');
const round2 = (n) => Math.round(n * 100) / 100;
const mailLogged = (to, subject) =>
  !!BACKEND_LOG && fs.readFileSync(BACKEND_LOG, 'utf8').split('\n').some((l) => l.includes(`[mail:dev] to=${to}`) && l.includes(subject));
const waitFor = async (fn, ms = 3000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 150)); } return false; };
const RUN = Date.now().toString(36);
const results = [];
const created = { orders: [], products: [], users: [] };
let db;

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

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
  const email = `qa-${tag}-${RUN}@example.test`;
  const r = await call('POST', '/auth/register', {
    body: { email, password: 'Qa-Passw0rd!', firstName: 'QA', lastName: tag },
  });
  if (r.data?.user?.id) created.users.push(r.data.user.id);
  return { ...r, email };
}

async function main() {
  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  // ---- setup: dedicated QA admin ----
  const adminRole = (await db.query(`select id from "Role" where name='Admin'`)).rows[0];
  const adminEmail = `qa-admin-${RUN}@example.test`;
  const adminId = `qa_admin_${RUN}`;
  await db.query(
    `insert into "User"(id,email,"passwordHash","firstName","lastName","roleId","updatedAt") values($1,$2,$3,'QA','Admin',$4,now())`,
    [adminId, adminEmail, await bcrypt.hash('Qa-Admin-Passw0rd!', 10), adminRole.id],
  );
  created.users.push(adminId);

  // ================= 1. AUTH =================
  let r = await call('POST', '/auth/admin/signin', { body: { email: adminEmail, password: 'Qa-Admin-Passw0rd!' } });
  check('admin: sign in with valid credentials', r.status === 201 && r.data.token, r);
  const admin = r.data.token;

  r = await call('POST', '/auth/admin/signin', { body: { email: adminEmail, password: 'wrong' } });
  check('admin: wrong password rejected (401)', r.status === 401, r);

  const c1 = await registerCustomer('buyer');
  check('storefront: customer registers', c1.status === 201 && c1.data.token, c1);
  const buyer = c1.data.token;

  const c2 = await registerCustomer('other');
  const other = c2.data.token;

  r = await call('POST', '/auth/register', { body: { email: c1.email, password: 'Qa-Passw0rd!', firstName: 'x', lastName: 'y' } });
  check('storefront: duplicate registration rejected (400)', r.status === 400, r);

  r = await call('POST', '/auth/admin/signin', { body: { email: c1.email, password: 'Qa-Passw0rd!' } });
  check('admin: customer cannot sign in to dashboard (401)', r.status === 401, r);

  r = await call('POST', '/auth/login', { body: { email: c1.email, password: 'Qa-Passw0rd!' } });
  check('storefront: customer logs in', r.status === 201 && r.data.token, r);

  // ================= 2. ADMIN PRODUCT =================
  const category = (await call('GET', '/categories?limit=100')).data;
  const leaf = (category.data ?? category).find((c) => c.parentId);
  check('admin: categories available', !!leaf, category);

  const productForm = (over = {}) => {
    const f = new FormData();
    const fields = {
      name: `QA Saffron Honey ${RUN}`,
      slug: `qa-saffron-honey-${RUN}`,
      sku: `QA-SKU-${RUN}`,
      price: '49.90',
      compareAtPrice: '59.90',
      costPrice: '20.00',
      shortDescription: 'QA short description',
      description: 'QA long description',
      categoryId: leaf.id,
      isActive: 'false',
      ...over,
    };
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) f.append(k, v);
    return f;
  };

  r = await call('POST', '/products', { form: productForm() });
  check('admin: create product without token rejected (401)', r.status === 401, r);

  r = await call('POST', '/products', { token: buyer, form: productForm() });
  check('admin: create product as customer rejected (403)', r.status === 403, r);

  r = await call('POST', '/products', { token: admin, form: productForm({ name: '', sku: undefined }) });
  check('admin: create product with missing fields rejected (400)', r.status === 400 && r.data.errors, r);

  const f = productForm();
  f.append('images', new Blob([PNG], { type: 'image/png' }), 'qa.png');
  r = await call('POST', '/products', { token: admin, form: f });
  check('admin: create product as draft with image upload', r.status === 201 && r.data.id, r);
  const product = r.data;
  if (product?.id) created.products.push(product.id);
  check('admin: uploaded image stored (Cloudinary URL, primary)',
    product.images?.length === 1 && /^https:\/\/res\.cloudinary\.com\//.test(product.images[0].url) && product.images[0].isPrimary,
    product.images);
  check('admin: product starts with an inventory record at 0', product.inventory?.quantity === 0, product.inventory);

  r = await call('POST', '/products', { token: admin, form: productForm({ slug: `qa-dupe-${RUN}` }) });
  check('admin: duplicate SKU rejected (400, not 500)', r.status === 400, r);

  const bad = productForm({ slug: `qa-bad-${RUN}`, sku: `QA-BAD-${RUN}` });
  bad.append('images', new Blob([Buffer.from('not an image')], { type: 'text/plain' }), 'x.txt');
  r = await call('POST', '/products', { token: admin, form: bad });
  check('admin: non-image upload rejected (400)', r.status === 400, r);

  // Draft must not be visible on the storefront
  r = await call('GET', `/products?isActive=true&search=${encodeURIComponent(`QA Saffron Honey ${RUN}`)}`);
  check('storefront: draft product hidden from listing', r.status === 200 && r.data.data.length === 0, r.data);

  r = await call('GET', `/products/${product.id}`);
  check('storefront: draft product not reachable by direct URL (404)', r.status === 404, { status: r.status, isActive: r.data?.isActive });

  r = await call('GET', `/products/${product.id}`, { token: admin });
  check('admin: staff can still open the draft (with cost price)', r.status === 200 && Number(r.data.costPrice) === 20, { status: r.status, cost: r.data?.costPrice });

  r = await call('GET', `/products?limit=100&search=${encodeURIComponent(`QA Saffron Honey ${RUN}`)}`, { token: admin });
  check('admin: catalogue list includes drafts for staff', r.data.data?.some((p) => p.id === product.id), r.status);

  r = await call('GET', `/products?isActive=false&limit=100`, { token: buyer });
  check('storefront: customer cannot list drafts via isActive=false', r.status === 200 && r.data.data.every((p) => p.isActive), r.data?.data?.length);

  // Edit details
  const edit = new FormData();
  edit.append('price', '44.50');
  edit.append('description', 'QA updated description');
  r = await call('PATCH', `/products/${product.id}`, { token: admin, form: edit });
  check('admin: edit price & description', r.status === 200 && r.data.price === '44.5' || r.data.price === '44.50', r.data?.price);

  const more = new FormData();
  more.append('images', new Blob([PNG], { type: 'image/png' }), 'qa2.png');
  r = await call('PATCH', `/products/${product.id}`, { token: admin, form: more });
  check('admin: add second image keeps first as primary',
    r.status === 200 && r.data.images.length === 2 && r.data.images.filter((i) => i.isPrimary).length === 1, r.data?.images);

  // Inventory
  r = await call('GET', `/inventory?limit=100`, { token: admin });
  const inv = r.data.data.find((i) => i.product?.id === product.id) ??
    (await db.query(`select id from "Inventory" where "productId"=$1`, [product.id])).rows[0];
  check('admin: inventory record listed', !!inv, r.status);

  r = await call('POST', `/inventory/${inv.id}/adjust`, { token: admin, body: { reason: 'RECEIPT', quantity: 5, note: 'QA stock-in' } });
  check('admin: adjust stock to 5', r.status === 201 && r.data.quantity === 5, r);
  if (r.status !== 201) {
    const reasons = (await db.query(`select unnest(enum_range(null::"AdjustmentReason"))::text v`)).rows.map((x) => x.v);
    console.log('   AdjustmentReason values:', reasons);
  }

  r = await call('POST', `/inventory/${inv.id}/adjust`, { token: admin, body: { reason: 'RECEIPT', quantity: -1 } });
  check('admin: negative stock rejected (400)', r.status === 400, r);

  r = await call('GET', `/inventory/${inv.id}/adjustments`, { token: admin });
  check('admin: adjustment recorded in audit trail', r.status === 200 && r.data.some((a) => a.delta === 5), r.data);

  // Publish
  const pub = new FormData();
  pub.append('isActive', 'true');
  r = await call('PATCH', `/products/${product.id}`, { token: admin, form: pub });
  check('admin: publish product', r.status === 200 && r.data.isActive === true, r.data?.isActive);

  // ================= 3. STOREFRONT INTEGRATION =================
  r = await call('GET', `/products?isActive=true&search=${encodeURIComponent(`QA Saffron Honey ${RUN}`)}`);
  const listed = r.data.data?.[0];
  check('storefront: published product appears in listing', !!listed, r.data);
  if (listed) {
    check('storefront: listing price matches admin edit', Number(listed.price) === 44.5, listed.price);
    check('storefront: listing image matches upload', listed.images?.[0]?.url === product.images[0].url, listed.images);
    check('storefront: listing stock matches inventory (5)', listed.inventory?.quantity === 5, listed.inventory);
    check('storefront: cost price not exposed publicly', listed.costPrice === undefined, listed.costPrice);
  }

  r = await call('GET', `/products/${product.id}`);
  check('storefront: product detail', r.status === 200 && r.data.description === 'QA updated description' && Number(r.data.compareAtPrice) === 59.9, r.data);

  r = await call('GET', `/products?isActive=true&categoryId=${leaf.parentId}&limit=100`);
  check('storefront: product found under parent category filter', r.data.data?.some((p) => p.id === product.id), r.status);

  r = await call('GET', `/products?isActive=true&sort=price_asc&limit=5`);
  check('storefront: sorted listing', r.status === 200 && r.data.data.every((p, i, a) => i === 0 || Number(a[i - 1].price) <= Number(p.price)), r.data?.data?.map((p) => p.price));

  r = await call('GET', `/products/does-not-exist`);
  check('storefront: unknown product 404', r.status === 404, r.status);

  // ================= 4. CHECKOUT =================
  r = await call('POST', '/addresses', { token: buyer, body: { recipientName: 'QA Buyer', line1: '1 Test St', city: 'Riyadh', postalCode: '12345', country: 'SA', phone: '+966500000000' } });
  check('checkout: customer saves shipping address', r.status === 201 && r.data.id, r);
  const address = r.data;

  r = await call('POST', '/addresses', { token: other, body: { recipientName: 'QA Other', line1: '2 Test St', city: 'Jeddah', postalCode: '54321', country: 'SA' } });
  const otherAddress = r.data;

  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 6 }], shippingAddressId: address.id, paymentMethod: 'card' } });
  check('checkout: ordering more than stock rejected (400)', r.status === 400 && /Insufficient stock/.test(r.data.errors?.items), r);

  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddressId: otherAddress.id } });
  check("checkout: using another customer's address rejected (400)", r.status === 400, r);

  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 0 }] } });
  check('checkout: zero quantity rejected (400)', r.status === 400, r);

  r = await call('POST', '/orders', { token: buyer, body: { items: [] } });
  check('checkout: empty cart rejected (400)', r.status === 400, r);

  r = await call('POST', '/orders', { body: { items: [{ productId: product.id, quantity: 1 }] } });
  check('checkout: anonymous order rejected (401)', r.status === 401, r);

  r = await call('POST', '/orders', { body: { customerId: 'anything', items: [{ productId: product.id, quantity: 1 }] } });
  check('checkout: anonymous order for a chosen customerId rejected (401)', r.status === 401, r);

  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }] } });
  check('checkout: storefront order without shipping address rejected (400)', r.status === 400 && r.data.errors?.shippingAddressId, r);

  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddressId: address.id, paymentMethod: 'paypal' } });
  check('checkout: unsupported payment method rejected (400)', r.status === 400, r);

  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }], couponCode: 'QA-NOPE' } });
  check('checkout: invalid coupon rejected (4xx)', r.status >= 400 && r.status < 500, r);

  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1, price: 0.01 }] } });
  check('checkout: client-supplied price rejected (400)', r.status === 400, r);

  const stockBefore = (await call('GET', `/products/${product.id}`)).data.inventory.quantity;
  check('checkout: failed attempts did not consume stock', stockBefore === 5, stockBefore);

  // Expected pricing: shipping from Settings (or the Settings-screen defaults), KSA VAT 15%.
  const settingRows = (await db.query(`select key, value from "Setting" where key in ('flat_shipping_rate','free_shipping_threshold')`)).rows;
  const setting = (k, d) => { const v = Number(settingRows.find((x) => x.key === k)?.value); return Number.isFinite(v) && v >= 0 ? v : d; };
  const flatFee = setting('flat_shipping_rate', 25);
  const freeOver = setting('free_shipping_threshold', 250);
  const expShip = freeOver > 0 && 89 >= freeOver ? 0 : flatFee;
  const expTax = round2((89 + expShip) * 0.15);
  const expTotal = round2(89 + expShip + expTax);

  r = await call('POST', '/orders/quote', { token: buyer, body: { items: [{ productId: product.id, quantity: 2 }] } });
  check('quote: without an address, tax is not yet calculated', r.status === 201 && r.data.taxCalculated === false && r.data.taxTotal === 0, r.data);

  r = await call('POST', '/orders/quote', { token: buyer, body: { items: [{ productId: product.id, quantity: 2 }], shippingAddressId: address.id } });
  const quote = r.data;
  check('quote: KSA address -> 15% tax on goods + shipping', r.status === 201 && quote.taxRate === 15 && quote.taxTotal === expTax && quote.shippingTotal === expShip && quote.total === expTotal, { quote, expShip, expTax, expTotal });

  r = await call('POST', '/orders/quote', { token: buyer, body: { items: [{ productId: product.id, quantity: 6 }], shippingAddressId: address.id } });
  check('quote: shipping waived at/over the free-shipping threshold', freeOver <= 0 || 267 < freeOver ? true : r.data.shippingTotal === 0, r.data);

  r = await call('POST', '/addresses', { token: buyer, body: { recipientName: 'QA Buyer US', line1: '9 Main St', city: 'Austin', postalCode: '73301', country: 'US' } });
  const usAddress = r.data;
  r = await call('POST', '/orders/quote', { token: buyer, body: { items: [{ productId: product.id, quantity: 2 }], shippingAddressId: usAddress.id } });
  check('quote: country without a tax rate -> no tax', r.data.taxTotal === 0 && r.data.taxCalculated === true, r.data);

  r = await call('POST', '/orders/quote', { token: other, body: { items: [{ productId: product.id, quantity: 2 }], shippingAddressId: address.id } });
  check("quote: another customer's address rejected (400)", r.status === 400, r);

  r = await call('POST', '/orders/quote', { body: { items: [{ productId: product.id, quantity: 2 }] } });
  check('quote: requires sign-in (401)', r.status === 401, r);

  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 2 }], shippingAddressId: address.id, paymentMethod: 'card' } });
  check('checkout: order placed', r.status === 201 && r.data.id, r);
  const order = r.data;
  if (order?.id) created.orders.push(order.id);
  check('checkout: order totals equal the quote the customer saw',
    Number(order.subtotal) === 89 && Number(order.shippingTotal) === quote.shippingTotal && Number(order.taxTotal) === quote.taxTotal && Number(order.total) === quote.total,
    { subtotal: order.subtotal, ship: order.shippingTotal, tax: order.taxTotal, total: order.total, quote });
  check('checkout: payment raised as PENDING for full amount', order.payment?.status === 'PENDING' && Number(order.payment.amount) === expTotal && order.payment.provider === 'card', order.payment);
  check('email: order confirmation sent to the customer', await waitFor(() => mailLogged(c1.email, `Order ${order.orderNumber} confirmed`)), BACKEND_LOG ? 'not in log' : 'BACKEND_LOG not set');
  check('checkout: order starts PENDING', order.status === 'PENDING', order.status);
  check('checkout: order number issued', /^ORD-/.test(order.orderNumber), order.orderNumber);

  r = await call('GET', `/products/${product.id}`);
  check('checkout: stock decremented 5 -> 3', r.data.inventory.quantity === 3, r.data.inventory);

  // Payment step as performed by the storefront payment page
  r = await call('PATCH', `/payments/${order.payment.id}`, { token: buyer, body: { status: 'PAID' } });
  check('payment: customer cannot mark their own payment PAID (403)', r.status === 403, r);

  // Confirmation / customer views
  r = await call('GET', `/orders/me/${order.id}`, { token: buyer });
  check('confirmation: customer can load their order', r.status === 200 && r.data.orderNumber === order.orderNumber, r);
  check('confirmation: order carries shipping address', r.data.shippingAddress?.line1 === '1 Test St', r.data.shippingAddress);

  r = await call('GET', `/orders/me`, { token: buyer });
  check('account: order history lists the order', r.data.data?.some((o) => o.id === order.id), r);

  r = await call('GET', `/orders/me/${order.id}`, { token: other });
  check("account: another customer cannot read the order (403)", r.status === 403, r);

  r = await call('GET', `/orders/${order.id}`, { token: buyer });
  check('account: customer cannot use admin order endpoint (403)', r.status === 403, r);

  r = await call('GET', `/orders/track/${order.orderNumber}`);
  check('tracking: public lookup by order number', r.status === 200 && r.data.status, r.status);
  check('tracking: public lookup does not leak customer email/address',
    !r.data?.customer?.email && !r.data?.shippingAddress?.line1, { customer: r.data?.customer, address: r.data?.shippingAddress });

  // ================= 5. ADMIN ORDER MANAGEMENT =================
  r = await call('GET', `/orders?limit=50`, { token: admin });
  const adminOrder = r.data.data?.find((o) => o.id === order.id);
  check('admin: order appears in dashboard list', !!adminOrder, r.status);
  if (adminOrder) {
    check('admin: order total/items match storefront', Number(adminOrder.total) === expTotal && adminOrder.items[0].quantity === 2 && Number(adminOrder.items[0].unitPrice) === 44.5, adminOrder.items);
    check('admin: customer & address attached', adminOrder.customer?.email === c1.email && adminOrder.shippingAddress?.city === 'Riyadh', adminOrder.customer);
    check('admin: payment status visible', !!adminOrder.payment?.status, adminOrder.payment);
  }

  r = await call('PATCH', `/orders/${order.id}`, { token: admin, body: { status: 'DELIVERED' } });
  check('admin: illegal status jump rejected (400)', r.status === 400, r);

  const pay = (await call('GET', `/orders/${order.id}`, { token: admin })).data.payment;
  if (pay.status !== 'PAID') {
    r = await call('PATCH', `/payments/${pay.id}`, { token: admin, body: { status: 'PAID' } });
    check('admin: mark payment PAID', r.status === 200 && r.data.status === 'PAID' && r.data.paidAt, r);
  }
  r = await call('GET', `/orders/${order.id}`, { token: admin });
  check('admin: paid order auto-moves to PROCESSING', r.data.status === 'PROCESSING', r.data.status);
  check('email: payment receipt sent', await waitFor(() => mailLogged(c1.email, `Payment received for ${order.orderNumber}`)), 'not in log');

  r = await call('PATCH', `/orders/${order.id}`, { token: admin, body: { status: 'SHIPPED' } });
  check('admin: fulfil -> SHIPPED', r.status === 200 && r.data.status === 'SHIPPED', r);
  check('email: shipped notice sent', await waitFor(() => mailLogged(c1.email, `Order ${order.orderNumber} has shipped`)), 'not in log');

  r = await call('GET', `/orders/me/${order.id}`, { token: buyer });
  check('storefront: customer sees SHIPPED + PAID', r.data.status === 'SHIPPED' && r.data.payment.status === 'PAID', { s: r.data.status, p: r.data.payment?.status });

  r = await call('PATCH', `/orders/${order.id}`, { token: admin, body: { status: 'CANCELLED' } });
  check('admin: cannot cancel a shipped order (400)', r.status === 400, r);

  // Cancel restores stock
  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddressId: address.id, paymentMethod: 'cod' } });
  const cod = r.data;
  if (cod?.id) created.orders.push(cod.id);
  check('checkout: cash-on-delivery order placed', r.status === 201 && cod.payment.provider === 'cod', r);
  r = await call('PATCH', `/orders/${cod.id}`, { token: admin, body: { status: 'CANCELLED' } });
  check('admin: cancel pending order', r.status === 200 && r.data.status === 'CANCELLED', r);
  r = await call('GET', `/products/${product.id}`);
  check('admin: cancellation restores stock (back to 3)', r.data.inventory.quantity === 3, r.data.inventory);

  // Reserved stock must not be sellable
  await call('POST', `/inventory/${inv.id}/adjust`, { token: admin, body: { reason: 'RECEIPT', quantity: 3, reserved: 3 } });
  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddressId: address.id } });
  if (r.data?.id) created.orders.push(r.data.id);
  check('checkout: reserved units are not sold (available = qty - reserved)', r.status === 400, { status: r.status });
  await call('POST', `/inventory/${inv.id}/adjust`, { token: admin, body: { reason: 'RECEIPT', quantity: 1, reserved: 0 } });

  // Concurrency: two buyers race for the last unit
  const [a, b] = await Promise.all([
    call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddressId: address.id } }),
    call('POST', '/orders', { token: other, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddressId: otherAddress.id } }),
  ]);
  for (const x of [a, b]) if (x.data?.id) created.orders.push(x.data.id);
  check('concurrency: exactly one buyer gets the last unit', [a.status, b.status].sort().join() === '201,400', [a.status, b.status]);
  r = await call('GET', `/products/${product.id}`);
  check('concurrency: stock never negative', r.data.inventory.quantity === 0, r.data.inventory);

  // Unpublish -> cannot be bought
  const unpub = new FormData();
  unpub.append('isActive', 'false');
  await call('PATCH', `/products/${product.id}`, { token: admin, form: unpub });
  await call('POST', `/inventory/${inv.id}/adjust`, { token: admin, body: { reason: 'RECEIPT', quantity: 5 } });
  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddressId: address.id } });
  if (r.data?.id) created.orders.push(r.data.id);
  check('checkout: unpublished product cannot be ordered (400)', r.status === 400 && /not currently available/.test(r.data.errors?.items), r);

  // Republish for the remaining flows
  const repub = new FormData();
  repub.append('isActive', 'true');
  await call('PATCH', `/products/${product.id}`, { token: admin, form: repub });

  // ================= 6. ADMIN MANUAL ORDER =================
  const buyerCustomer = (await db.query(`select id from "Customer" where email=$1`, [c1.email])).rows[0];
  r = await call('POST', '/orders', { token: admin, body: { customerId: buyerCustomer.id, items: [{ productId: product.id, quantity: 1 }] } });
  if (r.data?.id) created.orders.push(r.data.id);
  check('admin: staff can raise an order for a customer (POS)', r.status === 201 && r.data.customer?.email === c1.email && r.data.channel === 'POS', r);

  r = await call('POST', '/orders', { token: admin, body: { items: [{ productId: product.id, quantity: 1 }] } });
  check('admin: staff order without a customer rejected (400)', r.status === 400, r);

  // ================= 7. CARD PAYMENTS (STRIPE) =================
  r = await call('POST', '/orders', { token: buyer, body: { items: [{ productId: product.id, quantity: 1 }], shippingAddressId: address.id, paymentMethod: 'card' } });
  const cardOrder = r.data;
  if (cardOrder?.id) created.orders.push(cardOrder.id);
  check('stripe: card order placed', r.status === 201, r);

  r = await call('POST', '/payments/stripe/intent', { token: other, body: { orderId: cardOrder.id } });
  check("stripe: cannot start payment on another customer's order (403)", r.status === 403, r);

  r = await call('POST', '/payments/stripe/intent', { body: { orderId: cardOrder.id } });
  check('stripe: payment intent requires sign-in (401)', r.status === 401, r);

  r = await call('POST', '/payments/stripe/intent', { token: buyer, body: { orderId: cardOrder.id } });
  if (!process.env.STRIPE_SECRET_KEY) {
    check('stripe: not configured -> clear 503, not 500', r.status === 503, r);
  } else if (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_qa')) {
    check('stripe: provider rejects fake key -> 502, not 500', r.status === 502, r);
  } else {
    check('stripe: payment intent created with client secret', r.status === 201 && /^pi_.+_secret_/.test(r.data.clientSecret), r);
  }

  if (STRIPE_WEBHOOK_SECRET) {
    const Stripe = require('stripe');
    const stripe = new Stripe('sk_test_unused');
    const cents = Math.round(Number(cardOrder.total) * 100);
    const event = (amount) => JSON.stringify({
      id: `evt_qa_${RUN}_${amount}`, object: 'event', type: 'payment_intent.succeeded',
      data: { object: { id: `pi_qa_${RUN}`, object: 'payment_intent', amount, amount_received: amount, currency: 'usd', status: 'succeeded', metadata: { orderId: cardOrder.id, paymentId: cardOrder.payment.id } } },
    });
    const send = async (payload, secret = STRIPE_WEBHOOK_SECRET) => {
      const res = await fetch(API + '/payments/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload, secret }) }, body: payload });
      return res.status;
    };

    check('stripe webhook: bad signature rejected (400)', (await send(event(cents), 'whsec_wrong')) === 400);

    const unsigned = await fetch(API + '/payments/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: event(cents) });
    check('stripe webhook: unsigned request rejected (400)', unsigned.status === 400, unsigned.status);

    check('stripe webhook: under-payment accepted (200) but…', (await send(event(cents - 100))) === 200);
    r = await call('GET', `/orders/me/${cardOrder.id}`, { token: buyer });
    check('stripe webhook: …under-payment does NOT settle the order', r.data.payment.status === 'PENDING' && r.data.status === 'PENDING', r.data.payment);

    check('stripe webhook: succeeded event accepted (200)', (await send(event(cents))) === 200);
    r = await call('GET', `/orders/me/${cardOrder.id}`, { token: buyer });
    check('stripe webhook: payment PAID and order PROCESSING', r.data.payment.status === 'PAID' && r.data.status === 'PROCESSING', { p: r.data.payment, s: r.data.status });
    check('stripe webhook: payment receipt emailed', await waitFor(() => mailLogged(c1.email, `Payment received for ${cardOrder.orderNumber}`)), 'not in log');

    check('stripe webhook: replayed event is a harmless no-op (200)', (await send(event(cents))) === 200);
    r = await call('GET', `/orders/me/${cardOrder.id}`, { token: buyer });
    check('stripe webhook: replay leaves order PROCESSING', r.data.status === 'PROCESSING', r.data.status);

    r = await call('POST', '/payments/stripe/intent', { token: buyer, body: { orderId: cardOrder.id } });
    check('stripe: paid order cannot be paid again (400)', r.status === 400, r);
  } else {
    r = await fetch(API + '/payments/stripe/webhook', { method: 'POST', body: '{}' });
    check('stripe webhook: not configured -> 503', r.status === 503, r.status);
  }

  // ================= 8. PASSWORD RESET =================
  r = await call('POST', '/auth/forgot-password', { body: { email: c2.email } });
  check('reset: request accepted with neutral message', r.status === 201 && /reset link has been sent/.test(r.data.message), r);
  check('email: reset link emailed', await waitFor(() => mailLogged(c2.email, 'Reset your password')), 'not in log');
  const resetToken = r.data.resetToken ?? (await db.query(`select token from "PasswordResetToken" t join "User" u on u.id=t."userId" where u.email=$1 order by t."createdAt" desc limit 1`, [c2.email])).rows[0]?.token;
  r = await call('POST', '/auth/reset-password', { body: { token: resetToken, password: 'Qa-NewPassw0rd!' } });
  check('reset: password changed with emailed token', r.status === 201, r);
  r = await call('POST', '/auth/login', { body: { email: c2.email, password: 'Qa-NewPassw0rd!' } });
  check('reset: can log in with the new password', r.status === 201 && r.data.token, r.status);
  r = await call('POST', '/auth/reset-password', { body: { token: resetToken, password: 'Qa-Another1!' } });
  check('reset: token cannot be reused (400)', r.status === 400, r.status);

  r = await call('POST', '/auth/forgot-password', { body: { email: `nobody-${RUN}@example.test` } });
  check('reset: unknown email gets the same neutral reply', r.status === 201 && /reset link has been sent/.test(r.data.message) && !r.data.resetToken, r.data);

  // Product with orders: delete must fail cleanly, not 500
  r = await call('DELETE', `/products/${product.id}`, { token: admin });
  check('admin: deleting a product that has orders fails cleanly (4xx, not 500)', r.status >= 400 && r.status < 500, r);
}

async function cleanup() {
  if (!db) return;
  try {
    for (const id of created.orders) await db.query(`delete from "Order" where id=$1`, [id]);
    for (const id of created.products) {
      // goes through the API path for Cloudinary cleanup when possible
      const admin = (await call('POST', '/auth/admin/signin', { body: { email: `qa-admin-${RUN}@example.test`, password: 'Qa-Admin-Passw0rd!' } })).data.token;
      const r = await call('DELETE', `/products/${id}`, { token: admin });
      if (r.status !== 200) await db.query(`delete from "Product" where id=$1`, [id]);
    }
    await db.query(`delete from "Product" where sku like $1`, [`QA-%-${RUN}`]);
    await db.query(`delete from "Customer" where email like $1`, [`qa-%-${RUN}@example.test`]);
    for (const id of created.users) await db.query(`delete from "User" where id=$1`, [id]);
    await db.query(`delete from "User" where email like $1`, [`qa-%-${RUN}@example.test`]);
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
