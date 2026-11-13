const q = require('./db');
(async () => {
  const users = await q(`select id, email from "User" where email like 'qa-vui-%@example.test'`);
  const ids = users.map((u) => u.id);
  console.log('users:', users.map((u) => u.email));
  const shops = await q(`select s.id from "Shop" s join "Vendor" v on v.id=s."vendorId" where v."userId" = any($1)`, [ids]);
  const shopIds = shops.map((s) => s.id);
  const custs = await q(`select id from "Customer" where "userId" = any($1)`, [ids]);
  const custIds = custs.map((c) => c.id);
  // Orders: placed by qa customers OR touching qa shops.
  const orders = await q(
    `select distinct o.id from "Order" o left join "VendorOrder" vo on vo."orderId"=o.id
     where o."customerId" = any($1) or vo."shopId" = any($2)`, [custIds, shopIds]);
  const orderIds = orders.map((o) => o.id);
  console.log('orders:', orderIds.length, 'shops:', shopIds.length, 'customers:', custIds.length);
  await q(`delete from "Shipment" where "orderId" = any($1)`, [orderIds]);
  await q(`delete from "Order" where id = any($1)`, [orderIds]);
  const del = await q(`delete from "Product" where "shopId" = any($1) returning id`, [shopIds]);
  console.log('products deleted:', del.length);
  await q(`delete from "Customer" where id = any($1)`, [custIds]);
  await q(`delete from "User" where id = any($1)`, [ids]);
  const left = await q(`select
    (select count(*) from "User" where email like 'qa-vui-%') users,
    (select count(*) from "Shop" where name like 'QA VUI%') shops,
    (select count(*) from "Product" where sku like 'QA-VUI-%' or name like 'QA VUI%') products,
    (select count(*) from "Customer" where email like 'qa-vui-%') customers,
    (select count(*) from "VendorOrder" where "shopId" = any($1)) vendor_orders,
    (select count(*) from "Order" where id = any($2)) orders,
    (select count(*) from "Vendor" v where not exists (select 1 from "User" u where u.id=v."userId") and v."userId" is not null) orphan_vendors`, [shopIds, orderIds]);
  console.log('remaining:', left[0]);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
