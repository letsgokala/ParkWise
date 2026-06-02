# ParkWise — Roles & Access Control

ParkWise enforces **Role-Based Access Control** on the server for five actors.
Authorization is layered:

1. **Authentication** — `requireAuth` resolves the session cookie to a user and
   rejects suspended/inactive accounts.
2. **Role** — `requireRole(...)` restricts a route group to specific roles.
3. **Ownership / assignment** — services verify the caller actually owns the
   facility or holds an active assignment before mutating it.
4. **Business rules** — centralized pure functions in
   `src/lib/rbac/policy.ts` encode visibility and operation rules and are unit
   tested.

## Actors

| Role | Account? | Summary |
| --- | --- | --- |
| **Guest Driver** | No | Browse approved facilities, availability, filters, AI ranking, navigation. No favorites, no dashboards. |
| **Registered Driver** | Yes | Everything a guest can do **plus** saving/removing favorites and recommendation history. |
| **Facility Owner** | Yes | Register & edit own facilities; create/assign/suspend/replace/remove parking admins for own facilities; manage own API integrations. Cannot approve own facilities. |
| **Parking Administrator** | Yes (created by an owner) | Operate **actively assigned** facilities: update availability (MANUAL only) and price. Cannot self-register. Denied when suspended/removed. |
| **System Administrator** | Yes (seeded) | Review pending facilities; approve/reject/suspend; monitor all facilities; view audit logs. |

## Access-control matrix

| Subsystem | Actor | Allowed operations |
| --- | --- | --- |
| Auth | Registered Driver | register, login, logout |
| Auth | Facility Owner | register, login, logout |
| Auth | Parking Admin / System Admin | login, logout |
| Driver services | Guest + Registered Driver | view nearby, view availability, filter, rank, navigate |
| Driver services | Registered Driver | + save/remove favorites |
| Owner management | Facility Owner | register facility, update facility, create/assign/replace/suspend/remove parking admins |
| Facility approval | System Admin | review, approve, reject, suspend |
| Parking operations | Parking Admin | view assigned, update MANUAL availability, update price, monitor status |
| API integration | Facility Owner | submit/update integration details, trigger sync |
| API integration | Parking Admin | monitor integration (read-only), update price |
| AI recommendation | Guest + Registered Driver | request recommendations |
| Navigation | Guest + Registered Driver | view map, request navigation |

## Enforced business rules

1. Only `APPROVED` facilities appear in map, nearby search, AI ranking,
   navigation and active favorites.
2. `PENDING` / `REJECTED` / `SUSPENDED` facilities are never exposed publicly
   (the public detail endpoint returns `404`).
3. A Facility Owner can manage **only their own** facilities.
4. A Parking Admin can operate **only actively assigned** facilities.
5. A Parking Admin **cannot** manually set availability for `API_INTEGRATED`
   facilities (server returns `403`).
6. `API_INTEGRATED` availability comes only from the sync service.
7. Parking admins and assignments are **never hard-deleted** — status is
   tracked (`ACTIVE`/`SUSPENDED`/`REMOVED`) and history is preserved (including
   `replacedByAssignmentId`). A partial unique index guarantees at most one
   `ACTIVE` assignment per `(admin, facility)`.
8. Favorites require a logged-in Registered Driver.
9. Guest mode works without an account.
10. Only the System Admin approves/rejects/suspends facilities (owners cannot
    approve their own).
11. New facilities default to `PENDING`.
12. Payments, IoT hardware, gate control, and nationwide rollout are out of
    scope.

## Sessions & secrets

- Sessions are **database-backed**: only a SHA-256 hash of the opaque token is
  stored, the cookie is `HttpOnly` + `SameSite=Lax` (and `Secure` in
  production), and logout revokes the row — so sessions can be truly
  invalidated.
- Passwords are hashed with **bcrypt** (cost 12).
- API integration tokens are encrypted at rest with **AES-256-GCM**
  (`APP_ENCRYPTION_KEY`).
- CSRF is mitigated with a **double-submit token**; login/register are
  **rate-limited**; `helmet` sets security headers; Prisma parameterizes all
  queries (no SQL injection); React escapes rendered output (XSS-safe).
