# Royal Zaad Marketplace — Final Report

Branch `sass-market` (uncommitted). Companion docs:
[architecture & migration plan](marketplace-architecture.md) ·
[API reference](marketplace-api.md) ·
[performance](../backend/test/perf/README.md) ·
[browser tests](../backend/test/e2e-ui/README.md).

## What was delivered

| Area | Delivered |
|---|---|
| Data model | Vendors, shops (geolocated), per-shop sub-orders, order-item snapshots, moderation (+ reason), payouts, reports, email verification, partial-refund tracking, idempotent checkout. 5 migrations, all additive. |
| Access control | Authorization by role *kind* (customer / vendor / staff), not role name. Vendor routes resolve the shop from the session; another shop's data answers 404. Staff 8 h / vendor 12 h / customer 7 d sessions; sign-in, contact, report and geo-lookup rate limits. |
| Vendors | Sign-up with email confirmation; dashboard for overview analytics, products (images, drafts, archive, moderation status), inventory, orders (accept COD, ship with tracking, ready-for-pickup, deliver, cancel), shop profile (hours, delivery radius, pickup, fees, logo, geocoded address) and payouts. |
| Storefront | One catalogue across shops; location from browser, postcode/city or saved address (search still works without one); distance, "delivers to you", seller cards, "also sold by", shop pages, nearby shops; cart grouped by shop; checkout with delivery/pickup per shop and server-quoted totals. |
| Search | PostgreSQL full-text + trigram (typo-tolerant) retrieval and earthdistance GiST radius search; ranking where relevance gates and tiers results and proximity only reorders comparable matches; sorts relevance / nearest / price; configurable weights (`SEARCH_RANKING`). |
| Checkout | One payment, one sub-order per shop: per-shop shipping, delivery-radius check, tax by destination, commission and vendor net; atomic stock; idempotency key; parent status derived from shops; per-shop cancellation restocks only that shop and records the partial refund; Stripe webhook settles every shop; cash on delivery settles on delivery for the collected amount. |
| Administration | Vendor approval (needs verified email, complete address and a located shop), suspension, commission, manual shop location; product moderation; reports with actions; payout balances and concurrency-safe payout runs; marketplace settings; per-shop breakdown on orders. |
| Operations | `/api/health` and `/api/health/ready`, JSON request logs with request ids in production. |

## Test results (final run)

| Suite | Result |
|---|---|
| API: storefront & checkout | 102/102 (111/111 with Stripe webhook configured) |
| API: users, roles, accounts | 142/142 |
| API: marketing & catalogue | 199/199 |
| API: operations & finance | 168/168 |
| API: refunds | 7/7 |
| API: marketplace admin | 235/235 |
| API: vendors, isolation, location search, multi-vendor checkout | 93/93 |
| Unit: search ranking | 12/12 |
| Browser: core shop flow | 30/30 |
| Browser: storefront marketplace | 29/29 |
| Browser: vendor dashboard | all stages pass |
| Browser: marketplace admin | 25/25 |
| Load: 200 shops / 20k products | search 0 errors, 192 req/s @ 50 concurrent (p50 243 ms, p95 403 ms; 10–60 ms per query); 60 buyers for 20 units → exactly 20 orders |
| Builds / type checks | backend and frontend production builds pass |

All 14 acceptance scenarios from the brief are covered by these suites.

**Migration safety:** backups taken before each migration and a restore tested;
the migration was rehearsed on a restored copy; it verifies itself and rolls
back on any mismatch. After everything: products 14, orders 12, order items 12,
users 14, customers 13, payments 12 — identical to before — all original
products in the default "Royal Zaad" shop, order totals equal sub-order totals.

## Defects found and fixed along the way

- Search candidate cap could drop the shop next door among thousands of equal
  matches → the cap now follows the ranking rule.
- Empty-text searches crashed (`ORDER BY 0`).
- Search was 2 s at load → stored search vector, per-shop distance, no window function (7.7× throughput).
- Distance computed on two different spheres (845 vs 846 km; checkout radius vs search could disagree) → unified.
- A blank price silently saved a product (or variant) at $0.
- Customers could list drafts by passing `isActive=false`.
- Cash-on-delivery orders never became payable to vendors.
- Duplicate-SKU errors named the wrong field; optional product fields couldn't be cleared.
- Admin actions refused with 403 bounced staff to the login page.

## Remaining limitations

- **Stripe**: tested with signed test events; a real test-mode charge needs your Stripe keys. Refunds are recorded and flagged for staff, not issued through Stripe automatically.
- **Payouts** are recorded, not transferred (Stripe Connect not in scope).
- **Geocoding** uses OpenStreetMap Nominatim in production (rate-limited; set `GEOCODER_URL`/`GEOCODER_USER_AGENT`, or swap in a commercial geocoder for volume).
- **Warehouse transfers** still don't move stock between sites (needs per-site inventory).
- Catalogue lists in the admin and vendor dashboards load all pages client-side; fine at today's size, should move to server-side counts at large volume.
- Search beyond ~10 requests/s per process needs more API instances (stateless — scale horizontally) and a larger database pool.
- Test images uploaded to Cloudinary during QA were removed from the database but may remain in the Cloudinary media library.

## Production readiness

Ready to deploy once: the environment variables in `backend/.env.example` and
`frontend/.env.example` are set (the API refuses to start without the
critical ones), `npx prisma migrate deploy` is run after a backup, a Stripe
webhook is configured, and one real test-mode card payment has been made.
