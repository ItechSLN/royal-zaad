# Royal Zaad

A location-aware, multi-vendor marketplace: customers shop from many local shops in
one checkout, sellers manage their own shop, and staff run the platform.

| Folder | What | Stack |
|---|---|---|
| [`frontend/`](frontend) | Storefront (`/`), seller dashboard (`/vendor`), admin dashboard (`/admin`) | Next.js 16, React 19, Tailwind 4 |
| [`backend/`](backend) | REST API at `/api/v1` (Swagger at `/docs`) | NestJS 11, Prisma 7, PostgreSQL |
| [`docs/`](docs) | Marketplace architecture and API notes | |

## Run locally

Requires Node 22+ and PostgreSQL 15+ (with the `cube`, `earthdistance` and `pg_trgm` extensions, which ship with PostgreSQL).

```bash
# API — http://localhost:8080/api/v1
cd backend
cp .env.example .env    # fill in DATABASE_URL and JWT_SECRET at minimum
npm install
npx prisma migrate deploy
npm run seed            # optional sample catalogue
npm run start:dev

# Web — http://localhost:3000
cd frontend
cp .env.example .env
npm install
npm run dev
```



## Configuration

All settings are listed in [`backend/.env.example`](backend/.env.example) and
[`frontend/.env.example`](frontend/.env.example). External services: **Stripe**
(payments), **Cloudinary** (images), an **SMTP** provider (email) and a geocoder
(OpenStreetMap Nominatim by default). In development the API runs without them.

## Tests

End-to-end suites live in [`backend/test/`](backend/test) and run against the local
dev servers; see the header of each file for how to run it.
