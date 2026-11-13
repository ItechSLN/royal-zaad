-- Synthetic marketplace for load testing: 200 approved shops scattered over
-- Saudi Arabia / UAE, 100 products each (20,000), ~6% unpublished, random stock.
-- Load into a THROWAWAY database built with `prisma migrate deploy` + seed — never production.
INSERT INTO "Role"(id,name,kind,"updatedAt") VALUES ('r_admin','Admin','STAFF',now()),('r_user','User','CUSTOMER',now()) ON CONFLICT DO NOTHING;
INSERT INTO "Vendor"(id,status,"approvedAt","updatedAt") SELECT 'pv'||g,'ACTIVE',now(),now() FROM generate_series(1,200) g;
INSERT INTO "Shop"(id,"vendorId",name,slug,city,country,latitude,longitude,"locationVerifiedAt","offersDelivery","offersPickup","deliveryRadiusKm","updatedAt")
SELECT 'ps'||g,'pv'||g,'Perf Shop '||g,'perf-shop-'||g,'City '||(g%20),'SA', 21 + random()*5, 39 + random()*16, now(), true, g%3=0, CASE WHEN g%2=0 THEN 40 END, now() FROM generate_series(1,200) g;
INSERT INTO "Product"(id,name,slug,sku,price,"categoryId","shopId","isActive","shortDescription",description,"updatedAt")
SELECT 'pp'||s||'_'||n,
  (ARRAY['Sidr Honey','Ajwa Dates','Arabic Coffee','Saffron Threads','Medjool Dates','Cardamom Pods','Oud Oil','Rose Water','Pistachio Mix','Black Seed Oil'])[1+(n%10)] || ' ' || (ARRAY['Premium','Classic','Organic','Gift','Family'])[1+(s%5)] || ' ' || n,
  'perf-'||s||'-'||n, 'SKU-'||n, (5 + random()*200)::numeric(10,2),
  (SELECT id FROM "Category" WHERE "parentId" IS NOT NULL ORDER BY "sortOrder", id OFFSET (n%20) LIMIT 1),
  'ps'||s, n%17<>0, 'Quality product '||n, 'A traditional product sourced from family producers across the peninsula, batch '||n, now()
FROM generate_series(1,200) s, generate_series(1,100) n;
INSERT INTO "Inventory"(id,"productId",quantity,"updatedAt") SELECT 'pi_'||id, id, (random()*50)::int, now() FROM "Product" WHERE id LIKE 'pp%';
ANALYZE;
