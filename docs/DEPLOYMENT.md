# ParkWise — Deployment Guide

ParkWise is a monorepo with a **stateless Express API** and a **static React
build**. A typical production layout:

- **API** → Render / Railway / Fly.io (plus a managed PostgreSQL)
- **Web app** → Vercel / Netlify / any static host
- **Database** → managed PostgreSQL (Neon, Supabase, Render PG, Railway PG, …)

## Environment variables

| Variable | Where | Notes |
| --- | --- | --- |
| `DATABASE_URL` | API | Postgres connection string |
| `SESSION_SECRET` | API | Long random string (required in prod) |
| `APP_ENCRYPTION_KEY` | API | 32-byte key for API-token encryption (required in prod) |
| `COOKIE_SECURE` | API | `true` in production (HTTPS) |
| `CLIENT_URL` | API | Exact web app origin (for CORS + cookies) |
| `API_URL` | API | Public API origin |
| `PORT` | API | Provided by most hosts |
| `NODE_ENV` | API | `production` |
| `SYS_ADMIN_EMAIL` / `SYS_ADMIN_PASSWORD` / `SYS_ADMIN_NAME` | API | Seeded admin |
| `ROUTING_PROVIDER_URL` | API | Optional OSRM-compatible routing base URL |
| `VITE_API_URL` | Web | API base (e.g. `https://api.example.com/api`) |
| `VITE_MAPTILER_KEY` | Web | Optional; blank → free OSM tiles |

## Local PostgreSQL via Docker

```bash
docker compose up -d            # Postgres on :5432 (parkwise/parkwise/parkwise)
docker compose --profile tools up -d   # + Adminer on :8080 (optional)
docker compose down -v          # stop and wipe data
```

## Database migrations in production

The schema ships as a Prisma migration in `parkwise-api/prisma/migrations`.

```bash
# apply migrations (no shadow DB, safe for prod)
npm run db:deploy
# optionally load demo data
npm run db:seed
```

On first boot the API also **ensures a System Admin exists** (idempotent), so
the platform is usable even without running the seed.

## Building & running the API

The API runs via `tsx` (esbuild) in both dev and production — no separate
compile step is required:

```bash
cd parkwise-api
npm ci
npm run db:deploy
npm start            # tsx src/index.ts  →  listens on $PORT
```

Example Dockerfile for the API:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY parkwise-api/package.json parkwise-api/
RUN npm ci --workspace parkwise-api
COPY parkwise-api parkwise-api
RUN npm run db:generate --workspace parkwise-api
EXPOSE 4000
CMD ["npm", "start", "--workspace", "parkwise-api"]
```

## Building the web app

```bash
npm run build         # outputs parkwise-client/dist
```

Deploy `parkwise-client/dist` to any static host. Set `VITE_API_URL` to the
deployed API origin at build time.

## Cross-origin cookies (web app and API on different domains)

Session cookies are `SameSite=Lax` by default, which works when the web app and
API share a site (or via the dev proxy). If you deploy them on **different
domains**:

1. Set `COOKIE_SECURE=true` (HTTPS) on the API.
2. Set `CLIENT_URL` to the exact web origin (CORS uses it with credentials).
3. Cross-site cookies require `SameSite=None; Secure` — update
   `src/lib/auth/cookies.ts` accordingly, or (simplest) serve both behind one
   domain/reverse proxy so cookies stay first-party.

## Manual end-to-end smoke checklist

Run after deploying (or locally) to validate the critical paths:

1. **Guest** opens `/map` → sees only approved facilities; markers + popups work.
2. Guest clicks **Navigate** → a route (or straight-line fallback) is drawn.
3. **Register a driver** → lands on the driver map; save a favorite; it appears
   under `/driver/favorites`; open `/driver/recommendations` → ranked list with
   score breakdowns.
4. **Register a facility owner** → create a facility → it is `PENDING` and does
   **not** appear on the public map.
5. **System admin** logs in → `/system-admin/facilities/pending` → approve it →
   it now appears on the public map.
6. Owner creates a **parking admin**, assigns them to the approved (MANUAL)
   facility.
7. **Parking admin** logs in → updates availability → reflected on the map.
8. For an **API_INTEGRATED** facility: owner clicks **Sync now** → availability
   updates; the parking admin cannot edit availability (blocked).
9. System admin **suspends** a facility → it disappears from the public map and
   from active favorites.
```
