# Marketplace API reference (v1)

Base: `http://localhost:8080/api/v1`. Auth: `Authorization: Bearer <token>`.
Errors: `400 {message, errors: {field: message}}` (nested fields as `items.0.quantity`),
`401` no/invalid session, `403` wrong kind of account, `404` not found **or not yours**,
`429` rate limited. Lists: `{data: [...], meta: {page, limit, total, totalPages}}`
(`?page=1&limit=10`).

`GET /auth/me` → `{id, email, firstName, lastName, role, roleKind: 'CUSTOMER'|'VENDOR'|'STAFF', emailVerified, customerId}`.

## Vendor onboarding

| Method | Path | Body / notes |
|---|---|---|
| POST | `/auth/register-vendor` | `{email, password(≥8), firstName, lastName, shopName, phone?, description?, addressLine1?, addressLine2?, city?, state?, postalCode?, country? (2-letter)}` → `{status, token, user, vendorStatus:'PENDING', shopSlug, verifyUrl? (dev only)}` |
| POST | `/auth/vendor/signin` | `{email, password}` → `{token, user}`; vendor accounts only. Sessions last 12 h. |
| POST | `/auth/verify-email` | `{token}` (from the emailed link `/auth/verify-email?token=…`) |
| POST | `/auth/resend-verification` | signed in → `{message, verifyUrl? (dev only)}` |

A new vendor is `PENDING` until an admin approves it. Pending vendors can sign in,
edit their shop and prepare products; nothing they list is visible or purchasable
until approved. `GET /vendor/shop` → `vendor.status` / `vendor.statusReason` tell the UI.

## Vendor workspace — all `/vendor/*`, vendor accounts only, always the caller's own shop

| Method | Path | Notes |
|---|---|---|
| GET | `/vendor/shop` | Shop + `vendor {status, statusReason, approvedAt, commissionRate, user {email, emailVerifiedAt}}` |
| PATCH | `/vendor/shop` | Any of: `name, description, email, phone, addressLine1, addressLine2, city, state, postalCode, country, openingHours, offersDelivery, offersPickup, deliveryRadiusKm (0.5–500 or null = anywhere), shippingFlatFee (null = platform default), freeShippingOver (null = default)`. `openingHours`: `{mon..sun: [{open:'09:00', close:'17:00'}]}` or null. Must offer delivery or pickup. Address changes re-geocode; response may include `locationMessage`. |
| POST | `/vendor/shop/logo` | multipart field `logo` (jpeg/png/webp/gif ≤ 5 MB) |
| GET | `/vendor/products` | `?status=all|published|draft|archived|pending|rejected|removed&q=&page&limit` — full product rows (incl. `costPrice`, `moderationStatus`, `archivedAt`, `inventory`, `images`, `category`, `brand`) |
| GET | `/vendor/products/:id` | |
| POST | `/vendor/products` | multipart: `name, slug, sku, price, categoryId` required; `shortDescription, description, compareAtPrice, costPrice, barcode, brandId, isActive ('true'/'false'), isFeatured`; files `images` (≤10). No `shopId` (400). SKU unique within the shop. New products are `APPROVED`, or `PENDING_REVIEW` when the platform requires approval. |
| PATCH | `/vendor/products/:id` | same fields, partial; extra `images` appended. `REMOVED` products → 403. A `REJECTED` product goes back to review when edited. Product rows carry `moderationReason` (why it was rejected/removed; null otherwise). |
| POST | `/vendor/products/:id/archive` · `/unarchive` | archive = hidden + unpublished |
| DELETE | `/vendor/products/:id` | only if never ordered (else 400 — archive instead) |
| GET | `/vendor/inventory` | `[{id, productId, quantity, reserved, reorderAt, available, product {name, sku, isActive, archivedAt}}]` |
| POST | `/vendor/inventory/:productId/adjust` | `{reason: COUNT|DAMAGE|RECEIPT|TRANSFER|RETURN, quantity (new on-hand total), reserved?, reorderAt?, note?}` |
| GET | `/vendor/orders` | `?status=PENDING|PROCESSING|SHIPPED|DELIVERED|CANCELLED|REFUNDED` — sub-orders: `{id, status, fulfillmentMethod: DELIVERY|PICKUP, subtotal, discountTotal, shippingTotal, taxTotal, total, commissionRate, commissionAmount, vendorNet, createdAt, items [{productId, productName, sku, imageUrl, quantity, unitPrice, total}], shipments [...], order {id, orderNumber, createdAt, customer {firstName, lastName}, shippingAddress (delivery only: recipientName, line1, line2, city, state, postalCode, country, phone) \| null, payment {status, provider}}}` |
| GET | `/vendor/orders/:id` | |
| PATCH | `/vendor/orders/:id` | `{status: PROCESSING|SHIPPED|DELIVERED|CANCELLED, carrier?, trackingNumber?}`. PENDING→PROCESSING only for cash-on-delivery (card orders move when paid). Forward only: PROCESSING→SHIPPED→DELIVERED; cancel from PENDING/PROCESSING (restocks). For PICKUP, SHIPPED = "ready for collection". |
| GET | `/vendor/analytics?days=30` | `{periodDays, orders {total, byStatus}, grossSales, commission, netEarnings, averageOrderValue, daily [{date, orders, sales}], topProducts [{productId, name, units, revenue}], lowStock [{productId, name, available, reorderAt}], products {published, draft, pendingReview, rejectedOrRemoved}}` |
| GET | `/vendor/payouts` | `{balance, payableOrders, pendingClearance, payouts [{id, amount, currency, status, reference, paidAt, createdAt, _count {vendorOrders}}]}` |

## Discovery (public)

`GET /search/products` — `q, lat, lng, radiusKm (needs lat/lng), sort=relevance|nearest|price_asc|price_desc (nearest needs lat/lng), categoryId, brandId, shopId, minPrice, maxPrice, minRating, fulfillment=delivery|pickup, includeOutOfStock=true, page, limit`.
Response `data[]`: `{id, name, slug, shortDescription, price (promoted if a promotion is live), compareAtPrice, barcode, images [{url}], category, brand, shop {id, name, slug, logoUrl, city, country, latitude, longitude (null unless verified), offersDelivery, offersPickup}, available, rating, reviewCount, distanceKm (null without a location or for unlocated shops), deliversToYou (true|false|null = unknown), relevance}`; `meta {page, limit, total, totalPages, sort, location, radiusKm, capped}`.
Without lat/lng it still works (relevance only). Out-of-stock hidden unless `includeOutOfStock=true`.

`GET /search/shops?lat&lng&radiusKm=25&limit=12` → `[{id, name, slug, logoUrl, city, offersDelivery, offersPickup, deliveryRadiusKm, distanceKm, productCount}]`
`GET /geo/lookup?q=<postcode|city|area>&country=SA?` → `{latitude, longitude, label}` or 400 `{errors: {q}}`.
`GET /products`, `GET /products/:id` now include `shop` (same public shape). `GET /products?shopId=` lists one shop.
Same-product-other-sellers: products sharing a `barcode` across shops — `GET /search/products?q=<barcode or name>` and match `barcode`.

## Checkout (customers)

`POST /orders/quote` `{items [{productId, quantity}], couponCode?, shippingAddressId?, fulfillment? [{shopId, method: DELIVERY|PICKUP}]}` →
`{groups [{shopId, shopName, fulfillmentMethod, availableMethods, distanceKm, lines [{productId, shopId, name, sku, imageUrl, quantity, unitPrice, total}], subtotal, discountTotal, shippingTotal, taxTotal, total, commissionRate, commissionAmount, vendorNet}], lines, subtotal, discountTotal, shippingTotal, taxRate, taxTotal, total, taxCalculated}`.
400 `errors.fulfillment` when a shop doesn't offer the chosen method or the address is outside its delivery radius — offer pickup.

`POST /orders` same body + `paymentMethod: card|cod` + `idempotencyKey` (send a fresh `crypto.randomUUID()` per checkout attempt and reuse it on retry). Returns the order with `vendorOrders [{id, shopId, status, fulfillmentMethod, totals…, shop {id, name, slug, logoUrl, city, phone}, shipments}]`. The order's own `status` is derived from its shops' sub-orders.
`GET /orders/me`, `/orders/me/:id`, `/orders/track/:orderNumber` include the same `vendorOrders`.
Addresses (`POST /addresses`) are geocoded on save (`latitude`, `longitude`).
