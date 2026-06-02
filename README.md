# ParkWise — Smart City Parking Management System

ParkWise is a web-based smart parking platform for Ethiopian urban areas (built
around Addis Ababa). Drivers find nearby **approved** parking facilities, view
real-time availability, compare price/distance/congestion, get **AI-ranked**
recommendations, save favorites, and navigate with MapLibre. Facility Owners,
Parking Administrators and System Administrators get dedicated role-based
dashboards.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS, React Router, **MapLibre GL JS**, React Hook Form + Zod, sonner |
| Backend | Node.js + **Express** + TypeScript, **Prisma ORM**, Zod validation, Helmet, rate limiting |
| Database | PostgreSQL (PostGIS-ready; distance via Haversine in app code) |
| Auth | Email/password, bcrypt hashing, **DB-backed HTTP-only cookie sessions** (real logout/invalidation) + CSRF double-submit |
| AI | Deterministic, explainable **coefficient scoring model** (no black box) |
| Tests | Vitest (unit + integration via supertest) |

> The repository is a single **npm workspaces monorepo**: `parkwise-api`
> (backend) and `parkwise-client` (frontend).

## Architecture at a glance

- **Strict RBAC** for 5 actors: Guest Driver, Registered Driver, Facility
  Owner, Parking Administrator, System Administrator.
- **Only `APPROVED` facilities** ever reach drivers (map, search, ranking,
  navigation, favorites). `PENDING`/`REJECTED`/`SUSPENDED` are invisible.
- **Assignment history is preserved** — admins are never hard-deleted; status is
  tracked (`ACTIVE`/`SUSPENDED`/`REMOVED`).
- **MANUAL** facilities are updated by admins; **API_INTEGRATED** facilities
  sync availability from an external API (mocked for development) — admins can
  never set their availability manually.
- Every sensitive admin action is written to an **audit log**.

---

## Run with Docker (one command)

The fastest way to run the whole stack (database, API, web) — needs only Docker:

```bash
cp .env.example .env     # optional: set GOOGLE_MAPS_API_KEY + VITE_GOOGLE_MAPS_API_KEY for Google Maps
docker compose up --build
```

Open **http://localhost:3000**. Compose starts PostgreSQL, runs migrations + seed
(the one-shot `migrate` service), starts the API, and serves the web app via nginx
which proxies `/api` to the API (so session cookies stay first-party). Stop with
`docker compose down` (add `-v` to also delete the database volume).

> The containerized stack is fully self-contained (its own Postgres) and does not
> touch any local Postgres you may have. Map display uses Google Maps when
> `VITE_GOOGLE_MAPS_API_KEY` is set, otherwise the free MapLibre/OpenFreeMap basemap.

---

## Prerequisites (manual / non-Docker setup)

- **Node.js 20+** and npm
- **PostgreSQL 14+** — either via Docker (recommended) or a native install

## 1. Install

```bash
git clone <your-repo-url> ParkWise
cd ParkWise
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Then open `.env` and set at least:

- `DATABASE_URL` — your Postgres connection string
- `SESSION_SECRET` — a long random string (`openssl rand -base64 48`)
- `APP_ENCRYPTION_KEY` — a 32-byte key (`openssl rand -base64 32`)

`VITE_MAPTILER_KEY` is optional — leave it blank to use free OpenStreetMap
tiles. `ROUTING_PROVIDER_URL` is optional — leave it blank to use the
straight-line navigation fallback.

## 3. Start PostgreSQL

**Option A — Docker (recommended):**

```bash
docker compose up -d
# DATABASE_URL in .env should be:
# postgresql://parkwise:parkwise@localhost:5432/parkwise?schema=public
```

**Option B — native Postgres:** create a database (e.g. `parkwise`) and point
`DATABASE_URL` at it.

## 4. Migrate & seed

```bash
npm run db:migrate     # applies the Prisma schema (creates all tables)
npm run db:seed        # loads demo data + the system admin
```

**One-command alternative.** Once `.env` points at a running Postgres, you can
generate the client, apply migrations, and seed in a single step:

```bash
npm run db:setup       # = db:generate + db:deploy + db:seed
```

Or, straight from a fresh clone (installs deps first):

```bash
npm run setup          # = npm install + db:setup
```

The seed is **idempotent** (stable IDs + upserts), so re-running it just refreshes
the demo data. To wipe and rebuild from scratch, use `npm run db:reset`.

## 5. Run

```bash
# terminal 1 — API on http://localhost:4000
npm run dev:api

# terminal 2 — web app on http://localhost:3000
npm run dev:client
```

Open **http://localhost:3000**. The dev server proxies `/api` to the backend so
session cookies are first-party.

---

## Seeded test accounts

| Role | Email | Password |
| --- | --- | --- |
| System Admin | `sysadmin@parkwise.local` | `ParkWiseAdmin123!` |
| Facility Owner | `owner1@parkwise.local` | `Owner123!` |
| Facility Owner | `owner2@parkwise.local` | `Owner123!` |
| Parking Admin | `admin1@parkwise.local` | `Admin123!` |
| Parking Admin | `admin2@parkwise.local` | `Admin123!` |
| Registered Driver | `driver1@parkwise.local` | `Driver123!` |
| Registered Driver | `driver2@parkwise.local` | `Driver123!` |

Seeded facilities — **10 across Addis Ababa**, a mix of MANUAL and smart
(API_INTEGRATED) types and statuses so the map, AI ranking, and sync flow all
have variety:

| Facility | Type | Status |
| --- | --- | --- |
| Bole Medhanialem Parking | MANUAL | Approved |
| Mexico Square Smart Garage | API_INTEGRATED | Approved |
| Kazanchis Smart Parking | API_INTEGRATED | Approved |
| Meskel Square Parking | MANUAL | Approved |
| Sarbet Plaza Parking | MANUAL | Approved |
| Gerji Mebrat Hail Smart Lot | API_INTEGRATED | Approved |
| Bole Airport Parking | API_INTEGRATED | Approved |
| Arat Kilo Campus Parking | MANUAL | Approved |
| Piazza Central Lot | MANUAL | Pending |
| Megenagna Hub Parking | MANUAL | Suspended |

The 4 smart facilities are pre-wired to ParkWise's **built-in mock provider**
(`/api/mock-external-parking/:facilityId/availability`), so **Sync now** works
out of the box on a fresh clone with no external API. Point any facility at your
own mock (e.g. mockapi.io) by editing its API integration; it just needs to
return JSON `{ "availableSpaces": <number> }`.

> The System Admin password comes from `SYS_ADMIN_PASSWORD` in `.env`.

---

## Key routes

**Frontend (web app)**

| Path | Who | Purpose |
| --- | --- | --- |
| `/` | everyone | Landing page |
| `/map` | guest + driver | Map + list + filters + navigation + favorites |
| `/facilities/:id` | everyone | Facility detail |
| `/login`, `/register/driver`, `/register/facility-owner` | guest | Auth |
| `/driver/dashboard` `/driver/recommendations` `/driver/favorites` | driver | Driver area |
| `/owner/...` | owner | Facilities, parking admins, assignments |
| `/parking-admin/dashboard` | parking admin | Operations |
| `/system-admin/...` | system admin | Review & monitoring |

**API** — see [docs/API.md](docs/API.md) for the full reference. Highlights:

```
POST /api/auth/register/driver | /register/facility-owner | /login | /logout
GET  /api/auth/me
GET  /api/facilities/nearby | /search | /rank | /:id
POST/GET/DELETE /api/driver/favorites...
GET  /api/navigation/route
... /api/owner/...  /api/parking-admin/...  /api/system-admin/...  /api/api-integrations/...
GET  /api/health | /api/version
```

---

## Testing & quality

```bash
npm run lint            # TypeScript type-check (client + api)
npm test                # Vitest (unit always; integration when a DB is reachable)
npm run test:unit       # AI scoring, distance, RBAC policy, validators
npm run test:integration  # full API flows via supertest (needs DATABASE_URL)
npm run build           # production build of the web app
```

Unit tests run with no database. Integration tests connect to `DATABASE_URL`
and **skip automatically** if no database is reachable. To run them, point
`DATABASE_URL` at a Postgres (a throwaway/test DB is recommended) and re-run.

A manual end-to-end smoke checklist lives in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Project structure

```
ParkWise/
├─ parkwise-api/              # Express + Prisma backend
│  ├─ prisma/
│  │  ├─ schema.prisma        # data model (enums, models, indexes)
│  │  ├─ migrations/          # baseline SQL migration
│  │  └─ seed.ts              # demo data
│  ├─ src/
│  │  ├─ config/env.ts        # Zod-validated environment
│  │  ├─ lib/                 # prisma, auth/session, rbac, ai/scoring, geo, crypto, serializers
│  │  ├─ middleware/          # auth, rbac, csrf, validate, rate-limit, error
│  │  ├─ validators/          # Zod request schemas
│  │  ├─ services/            # business logic per domain
│  │  ├─ controllers/         # thin HTTP handlers
│  │  ├─ routes/              # REST route groups
│  │  └─ app.ts / index.ts
│  └─ tests/ (unit + integration)
├─ parkwise-client/           # React + Vite frontend
│  └─ src/ (lib, components, pages)
├─ docs/                      # API.md, RBAC.md, DEPLOYMENT.md, Postman collection
├─ docker-compose.yml         # local PostgreSQL
├─ .env.example
└─ package.json               # workspace root
```

## Documentation

- [docs/API.md](docs/API.md) — full REST API reference + response format
- [docs/RBAC.md](docs/RBAC.md) — roles, permissions, and the access-control matrix
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — deploying to Render/Railway/Fly + Vercel

## Limitations & next improvements

- Payments, IoT/gate hardware, and nationwide rollout are intentionally **out of
  scope** (per the SRS).
- Navigation uses a straight-line fallback unless `ROUTING_PROVIDER_URL` (an
  OSRM-compatible server) is configured.
- API-integrated availability is driven by a **mock** external service and a
  manual/triggered sync; a background scheduler is a natural next step.
- OAuth sign-in (Google/etc.) was removed in favor of spec-focused
  email/password auth and can be re-added on top of the session layer.
- Automated Playwright E2E is documented as a manual checklist; wiring it into CI
  is a follow-up.
