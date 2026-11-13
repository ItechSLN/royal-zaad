# Royal Zaad Marketplace — Architecture & Migration Plan

Evolving the single-shop store into a location-aware multi-vendor marketplace.
Branch: `sass-market`. Database backup taken and test-restored before migration
(`~/projects/personal/Ecom-market-db-backups/`).

## Decisions

| Topic | Decision |
|---|---|
| Geospatial | PostgreSQL `cube` + `earthdistance` (contrib; available on every managed Postgres). GiST index on `ll_to_earth(lat, lng)`. |
| Text search | PostgreSQL full-text (`tsvector`, `websearch_to_tsquery`) + `pg_trgm` similarity for typos and short queries. |
| Checkout | One payment per checkout; a parent `Order` with one `VendorOrder` per shop. Each vendor sees and fulfils only its own sub-order. |
| Payouts | Platform collects through its Stripe account. Each sub-order records commission and vendor net; admins record payouts. Stripe Connect can come later. |
| Shops | One shop per vendor (enforced by a unique constraint); `Vendor` and `Shop` stay separate tables so multi-shop needs no data migration. |
| Architecture | Stays a modular NestJS monolith + Next.js app. No microservices. |

## 1. Assessment of the current system

**Kept as-is (works, tested):** NestJS module layout, Prisma, JWT auth with
id-based sessions, rate limiting, Stripe Payment Intents + signed webhook,
SMTP mail, Cloudinary uploads, server-side pricing (`OrderPricingService`),
atomic stock decrement, coupons, promotions, reviews, returns, shipments,
the API/browser test suites.

**Must change:**

| Area | Today | Problem for a marketplace |
|---|---|---|
| Roles | Any role other than `User` is "staff" | A `Vendor` role would get full back-office access. |
| Products | No owner; global unique `sku` | Products must belong to a shop; SKUs only need to be unique within a shop. |
| Orders | One order = one fulfilment | A multi-shop basket needs per-shop sub-orders, statuses, shipping and commission. |
| Order items | Reference the live product | No snapshot: renaming or repricing a product rewrites order history. |
| Pricing | One shipping rule for the store | Shipping, delivery radius and pickup are per shop. |
| Search | `name ILIKE` on one table | No relevance ranking, no category/brand matching, no location. |
| Addresses | No coordinates | Delivery-radius checks and distance need a geocoded point. |
| Admin | Single-store back office | Needs vendor approval, product moderation, reports, payouts. |

**Main risks and mitigations:**
1. *Data loss during migration* — additive migrations only; existing rows are
   backfilled to a default "Royal Zaad" shop; backup + tested restore; counts
   verified before and after.
2. *Cross-vendor data leaks* — every vendor query is scoped by the shop id
   resolved from the session on the server, never from request input;
   dedicated isolation tests.
3. *Checkout consistency* — parent order, sub-orders, stock and coupon in one
   transaction; idempotency key prevents duplicate orders on retry.
4. *Breaking working features* — the existing suites (618 checks) are re-run
   after every phase.

## 2. Target data model

```
User 1─0..1 Vendor 1─1 Shop 1─* Product 1─1 Inventory
 │                       │         └─* ProductImage, ProductVariant, Review
 │                       └─* VendorOrder ─* OrderItem (snapshot)
 └─1 Customer 1─* Order 1─* VendorOrder
              │      └─1 Payment
              └─* Address (lat/lng)
Vendor 1─* VendorPayout      Report (product|shop)     AuditEvent
```

New / changed tables:

- **Role.kind** `CUSTOMER | VENDOR | STAFF` — authorization keys off the kind,
  not the name. Backfill: `User`→CUSTOMER, everything else→STAFF, new `Vendor`
  role→VENDOR.
- **User.emailVerifiedAt** + **EmailVerificationToken**.
- **Vendor** — `userId` (unique), `status` PENDING/ACTIVE/SUSPENDED/REJECTED,
  `statusReason`, `commissionRate` (null = platform default), timestamps.
- **Shop** — `vendorId` (unique), `name`, `slug` (unique), description,
  logo, contact email/phone, address fields, `latitude`/`longitude`,
  `locationVerifiedAt`, `openingHours` (JSON), `offersDelivery`,
  `offersPickup`, `deliveryRadiusKm`, `shippingFlatFee`, `freeShippingOver`,
  `isActive`. GiST index on `ll_to_earth(latitude, longitude)`.
- **Product** — `shopId` (FK, required after backfill), `moderationStatus`
  APPROVED/PENDING_REVIEW/REJECTED/REMOVED, `archivedAt`; unique
  `(shopId, sku)` replaces global `sku` uniqueness; `slug` stays globally
  unique (URLs); full-text expression index.
- **Address** — `latitude`, `longitude`, `geocodedAt`.
- **VendorOrder** — `orderId`, `shopId`, `status`, `fulfillmentMethod`
  DELIVERY/PICKUP, subtotal, discount, shipping, tax, total,
  `commissionRate`, `commissionAmount`, `vendorNet`, `payoutId`.
- **OrderItem** — adds `vendorOrderId`, `shopId`, and snapshots
  `productName`, `sku`, `imageUrl`.
- **Order** — adds `idempotencyKey` (unique per customer). `status` becomes an
  aggregate of its sub-orders.
- **Shipment** — adds `vendorOrderId`.
- **VendorPayout**, **Report** — new.

## 3. Migration plan (data-preserving)

1. Enable `cube`, `earthdistance`, `pg_trgm`.
2. Add `Role.kind`; backfill by name. Create the `Vendor` role.
3. Create `Vendor`/`Shop`; create the platform vendor + default shop
   "Royal Zaad" (owned by the first Admin) from the store settings.
4. Add `Product.shopId` nullable → backfill all products to the default shop
   → set NOT NULL. Swap `sku` unique for `(shopId, sku)`.
5. Create `VendorOrder`; one per existing order for the default shop, copying
   status and totals; link order items; fill item snapshots from products.
6. Add `Order.idempotencyKey`, `Address` coordinates, moderation fields.
7. Verify: row counts unchanged, every product has a shop, every order item
   has a sub-order, sum of sub-order totals = order totals.

Rollback: each migration is additive; restore from the tested backup if a
step fails (`pg_restore --clean`).

## 4. Authorization model

| Guard | Who |
|---|---|
| `@Staff()` | `Role.kind = STAFF` (platform staff); `@Roles('Admin')` for admin-only. |
| `@VendorOnly()` | `Role.kind = VENDOR`. Pending vendors can set up their shop and draft products; only ACTIVE vendors' products are visible or purchasable. |
| Customer endpoints | Any signed-in user with a customer profile. |

All vendor routes live under `/vendor/*`. Each resolves the caller's shop from
the session and passes `shopId` into the service; repositories always filter
by it. Admin routes keep working platform-wide.

## 5. API changes (v1)

- **Vendor onboarding:** `POST /auth/register-vendor`, `POST /auth/verify-email`,
  `POST /auth/resend-verification`.
- **Vendor workspace:** `GET/PATCH /vendor/shop`, `POST /vendor/shop/logo`,
  `GET/POST/PATCH/DELETE /vendor/products[/:id]`, `POST /vendor/products/:id/archive`,
  `POST /vendor/inventory/:productId/adjust`, `GET /vendor/orders[/:id]`,
  `PATCH /vendor/orders/:id` (fulfilment), `GET /vendor/analytics`,
  `GET /vendor/payouts`.
- **Marketplace admin:** `GET /admin/vendors`, `PATCH /admin/vendors/:id/status`,
  `PATCH /admin/products/:id/moderation`, `GET/PATCH /admin/reports`,
  `GET/POST /admin/payouts`.
- **Discovery:** `GET /search/products?q&lat&lng&radiusKm&sort&category&minPrice&maxPrice&inStock&minRating&fulfillment`,
  `GET /shops/:slug`, `GET /shops/nearby`, `GET /geo/lookup?q=` (postcode/city → coordinates),
  `POST /reports`.
- **Checkout:** `POST /orders/quote` and `POST /orders` return per-shop groups; `POST /orders`
  accepts `idempotencyKey` and per-shop `fulfillment` (delivery/pickup).

## 6. Location search & ranking

1. **Retrieve** (SQL, indexed): products that are active, approved, not
   archived, from active shops of ACTIVE vendors; text-matched via
   `tsvector` rank + trigram similarity on name, and category/brand name
   matches. If a radius is set, filter with
   `earth_box(ll_to_earth(:lat,:lng), :r) @> ll_to_earth(shop.lat, shop.lng)`
   (GiST) and exact `earth_distance <= :r`. Distance computed in SQL.
   Capped at the top 500 candidates by relevance.
2. **Rank** (pure TypeScript, unit-tested, weights in config):
   - *Eligibility:* when there is a query, a result must reach
     `minRelevance` (relative to the best match).
   - *Relevance tiers:* results are bucketed by relevance relative to the best
     match (strong / good / weak). A weaker tier never outranks a stronger
     one, so a nearby shop can't push an irrelevant product above a strong
     match.
   - *Within a tier:* `score = wRel·relevance + wDist·proximity + wStock·inStock`
     with `proximity = 1 / (1 + distanceKm / scaleKm)`; missing coordinates
     give proximity 0 (neutral, never excluded unless a radius is set).
   - Sorts: relevance (default), nearest (distance, nulls last), price asc/desc.
3. Customer location comes from the browser (with permission), a typed
   postcode/city (geocoded), or a saved address. It's sent per request, never
   stored without consent. Without a location, search still works and
   ranks by relevance only.

**Geocoding:** a `Geocoder` interface with a Nominatim (OpenStreetMap)
implementation for production (configurable endpoint and User-Agent; Google
or Mapbox can be swapped in) and a deterministic fixture geocoder for tests.
Shop coordinates are only used once `locationVerifiedAt` is set (geocoded
successfully, or confirmed by an admin on approval).

## 7. Multi-vendor checkout

- The quote and the order group basket lines by shop. Each group gets its own
  shipping (shop's fee/threshold, or pickup = free), delivery-radius check,
  tax (shipping country), and commission.
- One transaction: validate products/shops, decrement stock atomically, create
  the parent order, sub-orders, item snapshots, coupon redemption and a
  single payment. A unique `(customerId, idempotencyKey)` returns the existing
  order on retry instead of creating a new one.
- Stripe PaymentIntent is for the parent order total; the verified webhook
  settles it, moving every sub-order to PROCESSING.
- Statuses: sub-orders move independently (PENDING → PROCESSING → SHIPPED →
  DELIVERED, or CANCELLED/REFUNDED). The parent order's status is derived:
  all cancelled → CANCELLED; any active → the least-advanced active state;
  all delivered → DELIVERED. Cancelling one sub-order restocks only its items
  and records a partial refund.

## 8. Phased delivery

| Phase | Scope |
|---|---|
| 4a | Schema + data migration, role kinds, vendor/shop modules, product ownership, vendor isolation. |
| 4b | Vendor onboarding + email verification, admin vendor approval, product moderation. |
| 5 | Search module: retrieval SQL, ranking, geocoder, discovery endpoints. |
| 6 | Multi-vendor quote/checkout, sub-order fulfilment, refunds, payouts ledger. |
| 4c/5b | Frontend: vendor dashboard, admin marketplace screens, storefront location + seller UI. |
| 7 | Regression (existing suites), isolation/security tests, search ranking tests, load test on search/checkout. |
| 8 | Final report. |
