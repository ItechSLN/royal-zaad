# Browser end-to-end tests (Playwright)

They drive the real storefront, vendor dashboard and admin dashboard in Chromium
against the local dev servers (API `:8080`, web `:3000`, API in development mode
so the fixture geocoder and dev email links are used). Every suite creates its
own `qa-`-prefixed data and deletes it afterwards.

Install Playwright once, anywhere (it is not a project dependency):

```bash
mkdir -p ~/pw && cd ~/pw && npm init -y && npm i playwright && npx playwright install chromium
export NODE_PATH=~/pw/node_modules:$PWD/backend/node_modules   # from the repo root
```

| Suite | Run (from the repo root) |
|---|---|
| Core shop: admin creates/stocks/publishes a product, customer buys it, admin fulfils | `node backend/test/e2e-ui/storefront-admin.ui.e2e.js backend/.env` |
| Storefront marketplace: location, ranking by distance, denied geolocation, shop pages, grouped cart, per-shop checkout, idempotent ordering | `node backend/test/e2e-ui/marketplace/storefront/setup.js && node backend/test/e2e-ui/marketplace/storefront/storefront.ui.e2e.js backend/.env; node backend/test/e2e-ui/marketplace/storefront/cleanup.js` |
| Vendor dashboard: sign-up, verification, products, stock, shop settings, analytics, order fulfilment | `node backend/test/e2e-ui/marketplace/vendor/vendor.ui.e2e.js register guard approve product stock shop overview order fulfil; node backend/test/e2e-ui/marketplace/vendor/cleanup.js` |
| Marketplace admin: vendor approval/suspension, moderation, reports, payouts, settings | `node backend/test/e2e-ui/marketplace/admin/admin.ui.e2e.js backend/.env` |

Screenshots are written to a `shots/` folder next to each suite (git-ignored).
