-- Marketplace foundation: vendors, shops, per-shop sub-orders, order-item
-- snapshots, moderation, payouts, reports, geospatial + full-text search.
--
-- Data-preserving: every existing product moves to a default "Royal Zaad"
-- shop, every existing order gets one sub-order for that shop, and every
-- order item gets a snapshot of the product it references. The checks at the
-- end abort the whole migration (it runs in one transaction) on any mismatch.

-- 1. Extensions -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- earthdistance 1.1's ll_to_earth() resolves cube helpers through the caller's
-- search_path, which breaks pg_dump/pg_restore of any index built on it. This
-- wrapper pins the search_path; index it and query through it.
CREATE OR REPLACE FUNCTION shop_earth(lat double precision, lng double precision)
RETURNS earth
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
SET search_path = public
AS $$ SELECT ll_to_earth(lat, lng) $$;

-- 2. Enums ------------------------------------------------------------------
CREATE TYPE "RoleKind" AS ENUM ('CUSTOMER', 'VENDOR', 'STAFF');
CREATE TYPE "VendorStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');
CREATE TYPE "ProductModeration" AS ENUM ('APPROVED', 'PENDING_REVIEW', 'REJECTED', 'REMOVED');
CREATE TYPE "FulfillmentMethod" AS ENUM ('DELIVERY', 'PICKUP');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
CREATE TYPE "ReportTarget" AS ENUM ('PRODUCT', 'SHOP');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- 3. New tables ---------------------------------------------------------------
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "isPlatform" BOOLEAN NOT NULL DEFAULT false,
    "status" "VendorStatus" NOT NULL DEFAULT 'PENDING',
    "statusReason" TEXT,
    "commissionRate" DECIMAL(5,2),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "logoPublicId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" CHAR(2),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationVerifiedAt" TIMESTAMP(3),
    "openingHours" JSONB,
    "offersDelivery" BOOLEAN NOT NULL DEFAULT true,
    "offersPickup" BOOLEAN NOT NULL DEFAULT false,
    "deliveryRadiusKm" DOUBLE PRECISION,
    "shippingFlatFee" DECIMAL(10,2),
    "freeShippingOver" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VendorOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillmentMethod" "FulfillmentMethod" NOT NULL DEFAULT 'DELIVERY',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shippingTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "commissionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vendorNet" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VendorOrder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VendorPayout" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "note" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VendorPayout_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "targetType" "ReportTarget" NOT NULL,
    "productId" TEXT,
    "shopId" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");
CREATE UNIQUE INDEX "Vendor_userId_key" ON "Vendor"("userId");
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");
CREATE UNIQUE INDEX "Shop_vendorId_key" ON "Shop"("vendorId");
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");
CREATE INDEX "Shop_isActive_idx" ON "Shop"("isActive");
CREATE INDEX "VendorOrder_shopId_status_idx" ON "VendorOrder"("shopId", "status");
CREATE INDEX "VendorOrder_payoutId_idx" ON "VendorOrder"("payoutId");
CREATE UNIQUE INDEX "VendorOrder_orderId_shopId_key" ON "VendorOrder"("orderId", "shopId");
CREATE INDEX "VendorPayout_vendorId_status_idx" ON "VendorPayout"("vendorId", "status");
CREATE INDEX "Report_status_idx" ON "Report"("status");
CREATE INDEX "Report_productId_idx" ON "Report"("productId");
CREATE INDEX "Report_shopId_idx" ON "Report"("shopId");

-- 4. Simple additive columns -------------------------------------------------
ALTER TABLE "Address" ADD COLUMN "geocodedAt" TIMESTAMP(3),
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Role" ADD COLUMN "kind" "RoleKind" NOT NULL DEFAULT 'STAFF';
ALTER TABLE "Shipment" ADD COLUMN "vendorOrderId" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Accounts that already exist were created and used before verification
-- existed; treat them as verified rather than lock anyone out.
UPDATE "User" SET "emailVerifiedAt" = "createdAt";

-- 5. Role kinds: authorization keys off kind, not name ----------------------
UPDATE "Role" SET "kind" = 'CUSTOMER' WHERE "name" = 'User';
INSERT INTO "Role" ("id", "name", "kind", "description", "createdAt", "updatedAt")
SELECT 'role_vendor', 'Vendor', 'VENDOR', 'Marketplace shop owner', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'Vendor');

-- 6. Platform vendor + default shop (home of the original catalogue) --------
INSERT INTO "Vendor" ("id", "userId", "isPlatform", "status", "commissionRate", "approvedAt", "createdAt", "updatedAt")
VALUES ('vendor_platform', NULL, true, 'ACTIVE', 0, now(), now(), now());

INSERT INTO "Shop" ("id", "vendorId", "name", "slug", "description", "email", "country", "isActive", "createdAt", "updatedAt")
VALUES (
  'shop_platform', 'vendor_platform', 'Royal Zaad', 'royal-zaad',
  'The original Royal Zaad catalogue.',
  (SELECT "value" FROM "Setting" WHERE "key" = 'support_email'),
  'SA', true, now(), now()
);

-- 7. Products belong to a shop ----------------------------------------------
ALTER TABLE "Product" ADD COLUMN "shopId" TEXT,
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "moderationStatus" "ProductModeration" NOT NULL DEFAULT 'APPROVED';
UPDATE "Product" SET "shopId" = 'shop_platform';
ALTER TABLE "Product" ALTER COLUMN "shopId" SET NOT NULL;

DROP INDEX "Product_barcode_key";
DROP INDEX "Product_sku_key";
CREATE UNIQUE INDEX "Product_shopId_sku_key" ON "Product"("shopId", "sku");
CREATE UNIQUE INDEX "Product_shopId_barcode_key" ON "Product"("shopId", "barcode");
CREATE INDEX "Product_shopId_idx" ON "Product"("shopId");
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");

-- 8. One sub-order per existing order, for the default shop -----------------
INSERT INTO "VendorOrder" ("id", "orderId", "shopId", "status", "fulfillmentMethod",
  "subtotal", "discountTotal", "shippingTotal", "taxTotal", "total",
  "commissionRate", "commissionAmount", "vendorNet", "createdAt", "updatedAt")
SELECT 'vo_' || o."id", o."id", 'shop_platform', o."status", 'DELIVERY',
  o."subtotal", o."discountTotal", o."shippingTotal", o."taxTotal", o."total",
  0, 0, o."total", o."createdAt", now()
FROM "Order" o;

-- 9. Order items: owner + immutable snapshot -------------------------------
ALTER TABLE "OrderItem" ADD COLUMN "vendorOrderId" TEXT,
ADD COLUMN "shopId" TEXT,
ADD COLUMN "productName" TEXT,
ADD COLUMN "sku" TEXT,
ADD COLUMN "imageUrl" TEXT;

UPDATE "OrderItem" oi SET
  "vendorOrderId" = 'vo_' || oi."orderId",
  "shopId" = p."shopId",
  "productName" = p."name",
  "sku" = p."sku",
  "imageUrl" = (
    SELECT pi."url" FROM "ProductImage" pi
    WHERE pi."productId" = p."id"
    ORDER BY pi."isPrimary" DESC, pi."sortOrder" ASC
    LIMIT 1
  )
FROM "Product" p
WHERE p."id" = oi."productId";

ALTER TABLE "OrderItem" ALTER COLUMN "vendorOrderId" SET NOT NULL,
ALTER COLUMN "shopId" SET NOT NULL,
ALTER COLUMN "productName" SET NOT NULL,
ALTER COLUMN "sku" SET NOT NULL;
CREATE INDEX "OrderItem_vendorOrderId_idx" ON "OrderItem"("vendorOrderId");
CREATE INDEX "OrderItem_shopId_idx" ON "OrderItem"("shopId");

-- 10. Shipments follow their sub-order --------------------------------------
UPDATE "Shipment" SET "vendorOrderId" = 'vo_' || "orderId";
CREATE INDEX "Shipment_vendorOrderId_idx" ON "Shipment"("vendorOrderId");

-- 11. Checkout idempotency ---------------------------------------------------
CREATE UNIQUE INDEX "Order_customerId_idempotencyKey_key" ON "Order"("customerId", "idempotencyKey");

-- 12. Foreign keys -------------------------------------------------------------
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_vendorOrderId_fkey" FOREIGN KEY ("vendorOrderId") REFERENCES "VendorOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "VendorPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_vendorOrderId_fkey" FOREIGN KEY ("vendorOrderId") REFERENCES "VendorOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 13. Search indexes (not expressible in schema.prisma) ---------------------
-- Distance: GiST on the shop's point, only for shops with a location.
CREATE INDEX "Shop_earth_idx" ON "Shop" USING gist (shop_earth("latitude", "longitude"))
  WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
-- Relevance: weighted full-text document, matched by the search module.
CREATE INDEX "Product_search_idx" ON "Product" USING gin ((
  setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("shortDescription", '')), 'B') ||
  setweight(to_tsvector('english', coalesce("description", '')), 'C')
));
-- Typo-tolerant name matching.
CREATE INDEX "Product_name_trgm_idx" ON "Product" USING gin ("name" gin_trgm_ops);

-- 14. Verify nothing was lost or mis-attributed -----------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Product" WHERE "shopId" IS NULL) THEN
    RAISE EXCEPTION 'marketplace migration: product without a shop';
  END IF;
  IF (SELECT count(*) FROM "VendorOrder") <> (SELECT count(*) FROM "Order") THEN
    RAISE EXCEPTION 'marketplace migration: sub-order count mismatch';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Order" o JOIN "VendorOrder" v ON v."orderId" = o."id"
    WHERE v."total" <> o."total" OR v."subtotal" <> o."subtotal"
  ) THEN
    RAISE EXCEPTION 'marketplace migration: sub-order totals differ from orders';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "OrderItem" oi JOIN "VendorOrder" v ON v."id" = oi."vendorOrderId"
    WHERE v."orderId" <> oi."orderId"
  ) THEN
    RAISE EXCEPTION 'marketplace migration: order item linked to another order';
  END IF;
END $$;
