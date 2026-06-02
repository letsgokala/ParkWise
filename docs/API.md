# ParkWise API Reference

Base URL (dev): `http://localhost:4000/api` (the web app calls it via the Vite
proxy at `/api`).

## Conventions

**Authentication** uses an HTTP-only session cookie (`pw_session`) set on
login/registration. Send requests with credentials included. **CSRF**: the
server sets a readable `pw_csrf` cookie; echo its value in the `x-csrf-token`
header on every mutating request (`POST`/`PATCH`/`DELETE`). Safe methods are
exempt.

**Response envelope** — every endpoint returns one of:

```jsonc
{ "success": true, "data": { /* ... */ } }
```
```jsonc
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": {} } }
```

Error codes: `VALIDATION_ERROR` (422), `UNAUTHENTICATED` (401), `FORBIDDEN`
(403), `NOT_FOUND` (404), `CONFLICT` (409), `BAD_REQUEST` (400), `RATE_LIMITED`
(429), `SERVICE_UNAVAILABLE` (503), `INTERNAL` (500).

`passwordHash` and raw API tokens are **never** returned.

---

## Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | — | Liveness check |
| GET | `/version` | — | App name/version/environment |

## Authentication

| Method | Path | Auth | Body |
| --- | --- | --- | --- |
| POST | `/auth/register/driver` | — | `{ name, email, phoneNumber, password }` |
| POST | `/auth/register/facility-owner` | — | `{ fullName, organizationName, email, phoneNumber, password }` |
| POST | `/auth/login` | — | `{ email, password }` |
| POST | `/auth/logout` | session | — |
| GET | `/auth/me` | session | — |

`register/*` and `login` are rate-limited. On success they set the session
cookie and return `{ user }` (role-aware, includes `homePath`).

## Facilities (public / driver)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/facilities/nearby?lat=&lng=&radiusKm=` | guest+ | APPROVED only, sorted by distance |
| GET | `/facilities/search?lat=&lng=&maxDistanceKm=&maxPrice=&minAvailableSpaces=&facilityType=&availability=` | guest+ | Filtered APPROVED facilities |
| GET | `/facilities/rank?lat=&lng=&radiusKm=` | guest+ (logs for drivers) | AI-ranked list with `scoreBreakdown` |
| GET | `/facilities/:id` | guest+ | APPROVED only (404 otherwise) |

## Navigation

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/navigation/route?fromLat=&fromLng=&toLat=&toLng=` | guest+ | Real route if `ROUTING_PROVIDER_URL` set, else straight-line fallback (`fallback: true`) |

## Driver favorites (REGISTERED_DRIVER)

| Method | Path | Body |
| --- | --- | --- |
| GET | `/driver/favorites` | — (returns active favorites, `hiddenCount`, `alerts`) |
| POST | `/driver/favorites/:facilityId` | — (must be APPROVED; idempotent) |
| DELETE | `/driver/favorites/:facilityId` | — |
| PATCH | `/driver/favorites/:facilityId/alerts` | `{ notifyOnAvailability?, notifyOnPriceDrop? }` |

## Facility Owner (FACILITY_OWNER)

| Method | Path | Body |
| --- | --- | --- |
| GET | `/owner/dashboard` | — |
| GET | `/owner/facilities` | — |
| POST | `/owner/facilities` | `{ name, address, latitude, longitude, totalSpaces, availableSpaces, hourlyPrice, facilityType, congestionLevel, api? }` |
| GET | `/owner/facilities/:id` | — (facility + assignments + integration) |
| PATCH | `/owner/facilities/:id` | partial `{ name?, address?, latitude?, longitude?, totalSpaces?, hourlyPrice?, congestionLevel? }` |
| GET | `/owner/parking-admins` | — |
| POST | `/owner/parking-admins` | `{ name, email, phoneNumber, temporaryPassword }` |
| GET | `/owner/assignments` | — (all assignments + history) |
| POST | `/owner/facilities/:facilityId/assign-admin` | `{ parkingAdminId, notes? }` |
| PATCH | `/owner/assignments/:assignmentId/suspend` | — |
| PATCH | `/owner/assignments/:assignmentId/remove` | — |
| POST | `/owner/assignments/:assignmentId/replace` | `{ newParkingAdminId, notes? }` |

New facilities are created `PENDING`. Owners can only touch their own
facilities/admins (enforced server-side).

## Parking Administrator (PARKING_ADMIN)

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/parking-admin/assigned-facilities` | — | Active assignments only |
| PATCH | `/parking-admin/facilities/:facilityId/availability` | `{ availableSpaces }` | **MANUAL only** (403 for API_INTEGRATED) |
| PATCH | `/parking-admin/facilities/:facilityId/price` | `{ hourlyPrice }` | Both types |

Denied if the admin account is suspended/removed or not actively assigned.

## System Administrator (SYSTEM_ADMIN)

| Method | Path | Body |
| --- | --- | --- |
| GET | `/system-admin/overview` | — (counts) |
| GET | `/system-admin/facilities/pending` | — |
| GET | `/system-admin/facilities?status=` | — |
| PATCH | `/system-admin/facilities/:id/approve` | `{ notes? }` |
| PATCH | `/system-admin/facilities/:id/reject` | `{ notes? }` |
| PATCH | `/system-admin/facilities/:id/suspend` | `{ notes? }` |
| GET | `/system-admin/audit-logs?limit=` | — |

## API Integration

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api-integrations/:facilityId/status` | owner / assigned admin / sysadmin | Integration status (no token) |
| POST | `/api-integrations/:facilityId/sync` | owner / sysadmin | Pulls availability; `synced:false` + last-known on failure |
| PATCH | `/api-integrations/:facilityId` | owner | `{ endpointUrl?, authToken?, refreshIntervalSeconds?, isEnabled? }` |
| GET | `/mock-external-parking/:facilityId/availability` | `x-api-token` header | Simulated external feed (raw JSON) |
| POST | `/mock-external-parking/:facilityId/availability` | — | Set the simulated count `{ availableSpaces }` |

## Example: AI ranking response

```jsonc
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "rank": 1,
        "facility": { "id": "…", "name": "Bole Medhanialem Parking", "availableSpaces": 45, "totalSpaces": 150, "hourlyPrice": 30, "congestionLevel": "HIGH", "status": "APPROVED" },
        "distanceKm": 0.12,
        "finalScore": 0.71,
        "scorePercent": 71,
        "isFull": false,
        "scoreBreakdown": {
          "distanceScore": 1, "priceScore": 0.0, "availabilityScore": 0.3, "congestionScore": 0.2,
          "weights": { "distance": 0.35, "price": 0.25, "availability": 0.25, "congestion": 0.15 }
        }
      }
    ]
  }
}
```
