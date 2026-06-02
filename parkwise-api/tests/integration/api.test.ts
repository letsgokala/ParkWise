import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import {
  createApprovedFacility,
  csrfToken,
  dbAvailable,
  loginAs,
  makeDriver,
  makeOwner,
  makeSysAdmin,
  newEmail,
  type TestActor,
} from './helpers';

// Integration tests require a reachable Postgres. They skip (rather than fail)
// when DATABASE_URL is not pointing at a running database.
const hasDb = await dbAvailable();
const d = hasDb ? describe : describe.skip;
if (!hasDb) {
  console.warn('\n[integration] Skipped — no database. Run `npm run db:migrate` against a Postgres and retry.\n');
}

const nearbyHas = (facilities: { id: string }[], id: string) => facilities.some((f) => f.id === id);

d('ParkWise API integration', () => {
  describe('health', () => {
    it('GET /api/health is ok', async () => {
      const res = await request(app).get('/api/health').expect(200);
      expect(res.body).toMatchObject({ success: true, data: { status: 'ok' } });
    });
  });

  describe('authentication', () => {
    it('registers a driver and returns the current user, then logs out', async () => {
      const { a, token, email } = await makeDriver();
      const me = await a.get('/api/auth/me').expect(200);
      expect(me.body.data.user.email).toBe(email);
      expect(me.body.data.user.role).toBe('REGISTERED_DRIVER');
      expect(me.body.data.user).not.toHaveProperty('passwordHash');

      await a.post('/api/auth/logout').set('x-csrf-token', token).expect(200);
      await a.get('/api/auth/me').expect(401);
    });

    it('rejects duplicate email registration with 409', async () => {
      const { token } = await makeDriver();
      const a = request.agent(app);
      const t = await csrfToken(a);
      const existing = (await makeDriver()).email;
      const res = await a
        .post('/api/auth/register/driver')
        .set('x-csrf-token', t)
        .send({ name: 'Dup', email: existing, phoneNumber: '+251911000000', password: 'Password123' });
      expect(res.status).toBe(409);
      expect(token).toBeTruthy();
    });

    it('rejects login with wrong password', async () => {
      const { email } = await makeDriver();
      const a = request.agent(app);
      const t = await csrfToken(a);
      await a.post('/api/auth/login').set('x-csrf-token', t).send({ email, password: 'wrong-password' }).expect(401);
    });

    it('blocks a mutating request without a CSRF token (403)', async () => {
      const a = request.agent(app);
      await csrfToken(a); // sets cookie but we deliberately omit the header
      await a
        .post('/api/auth/register/driver')
        .send({ name: 'NoCsrf', email: newEmail(), phoneNumber: '+251911000000', password: 'Password123' })
        .expect(403);
    });
  });

  describe('facility visibility lifecycle', () => {
    let owner: TestActor;
    let sysAdmin: TestActor;

    beforeAll(async () => {
      owner = await makeOwner();
      sysAdmin = await makeSysAdmin();
    });

    it('hides a PENDING facility from public search, then shows it once APPROVED, then hides on SUSPEND', async () => {
      // Create — defaults to PENDING.
      const createRes = await owner.a
        .post('/api/owner/facilities')
        .set('x-csrf-token', owner.token)
        .send({
          name: 'Lifecycle Lot',
          address: 'Bole',
          latitude: 9.0,
          longitude: 38.75,
          totalSpaces: 100,
          availableSpaces: 40,
          hourlyPrice: 25,
          facilityType: 'MANUAL',
          congestionLevel: 'MEDIUM',
        })
        .expect(201);
      const id = createRes.body.data.facility.id as string;
      expect(createRes.body.data.facility.status).toBe('PENDING');

      const pendingNearby = await request(app).get('/api/facilities/nearby?lat=9.0&lng=38.75&radiusKm=5').expect(200);
      expect(nearbyHas(pendingNearby.body.data.facilities, id)).toBe(false);

      // Approve → visible.
      await sysAdmin.a.patch(`/api/system-admin/facilities/${id}/approve`).set('x-csrf-token', sysAdmin.token).send({}).expect(200);
      const approvedNearby = await request(app).get('/api/facilities/nearby?lat=9.0&lng=38.75&radiusKm=5').expect(200);
      expect(nearbyHas(approvedNearby.body.data.facilities, id)).toBe(true);

      // Suspend → hidden again.
      await sysAdmin.a.patch(`/api/system-admin/facilities/${id}/suspend`).set('x-csrf-token', sysAdmin.token).send({}).expect(200);
      const suspendedNearby = await request(app).get('/api/facilities/nearby?lat=9.0&lng=38.75&radiusKm=5').expect(200);
      expect(nearbyHas(suspendedNearby.body.data.facilities, id)).toBe(false);
    });

    it('only returns APPROVED facilities from the public detail endpoint', async () => {
      const createRes = await owner.a
        .post('/api/owner/facilities')
        .set('x-csrf-token', owner.token)
        .send({
          name: 'Hidden Lot',
          address: 'Bole',
          latitude: 9.0,
          longitude: 38.75,
          totalSpaces: 50,
          availableSpaces: 10,
          hourlyPrice: 15,
          facilityType: 'MANUAL',
          congestionLevel: 'LOW',
        })
        .expect(201);
      const id = createRes.body.data.facility.id as string;
      await request(app).get(`/api/facilities/${id}`).expect(404); // pending → not found publicly
    });
  });

  describe('driver favorites', () => {
    it('saves, lists and removes a favorite', async () => {
      const owner = await makeOwner();
      const sysAdmin = await makeSysAdmin();
      const id = await createApprovedFacility(owner, sysAdmin);
      const driver = await makeDriver();

      await driver.a.post(`/api/driver/favorites/${id}`).set('x-csrf-token', driver.token).expect(201);

      const list = await driver.a.get('/api/driver/favorites').expect(200);
      expect(list.body.data.favorites.some((f: { facilityId: string }) => f.facilityId === id)).toBe(true);

      await driver.a.delete(`/api/driver/favorites/${id}`).set('x-csrf-token', driver.token).expect(200);
      const after = await driver.a.get('/api/driver/favorites').expect(200);
      expect(after.body.data.favorites.length).toBe(0);
    });
  });

  describe('parking admin operations', () => {
    it('allows MANUAL availability updates but blocks them for API_INTEGRATED facilities', async () => {
      const owner = await makeOwner();
      const sysAdmin = await makeSysAdmin();

      // MANUAL facility, approved, with an assigned admin.
      const manualId = await createApprovedFacility(owner, sysAdmin);
      const adminEmail = newEmail('padmin');
      const adminRes = await owner.a
        .post('/api/owner/parking-admins')
        .set('x-csrf-token', owner.token)
        .send({ name: 'Op Admin', email: adminEmail, phoneNumber: '+251911000000', temporaryPassword: 'Password123' })
        .expect(201);
      const adminProfileId = adminRes.body.data.admin.id as string;
      await owner.a
        .post(`/api/owner/facilities/${manualId}/assign-admin`)
        .set('x-csrf-token', owner.token)
        .send({ parkingAdminId: adminProfileId })
        .expect(201);

      const admin = await loginAs(adminEmail, 'Password123');
      await admin.a
        .patch(`/api/parking-admin/facilities/${manualId}/availability`)
        .set('x-csrf-token', admin.token)
        .send({ availableSpaces: 12 })
        .expect(200);

      // API_INTEGRATED facility, approved, same admin assigned → availability blocked.
      const apiId = await createApprovedFacility(owner, sysAdmin, {
        name: 'Smart Lot',
        facilityType: 'API_INTEGRATED',
        api: { endpointUrl: 'https://provider.example.com/feed', authToken: 'tok', refreshIntervalSeconds: 120 },
      });
      await owner.a
        .post(`/api/owner/facilities/${apiId}/assign-admin`)
        .set('x-csrf-token', owner.token)
        .send({ parkingAdminId: adminProfileId })
        .expect(201);
      await admin.a
        .patch(`/api/parking-admin/facilities/${apiId}/availability`)
        .set('x-csrf-token', admin.token)
        .send({ availableSpaces: 5 })
        .expect(403);

      // Price updates are allowed for both types.
      await admin.a
        .patch(`/api/parking-admin/facilities/${apiId}/price`)
        .set('x-csrf-token', admin.token)
        .send({ hourlyPrice: 33 })
        .expect(200);
    });
  });

  describe('RBAC enforcement', () => {
    it('forbids a driver from accessing owner endpoints', async () => {
      const driver = await makeDriver();
      await driver.a.get('/api/owner/facilities').expect(403);
    });

    it("forbids an owner from modifying another owner's facility", async () => {
      const ownerA = await makeOwner();
      const ownerB = await makeOwner();
      const sysAdmin = await makeSysAdmin();
      const facilityId = await createApprovedFacility(ownerA, sysAdmin);

      await ownerB.a
        .patch(`/api/owner/facilities/${facilityId}`)
        .set('x-csrf-token', ownerB.token)
        .send({ hourlyPrice: 999 })
        .expect(403);
    });

    it('requires authentication for protected routes', async () => {
      await request(app).get('/api/owner/facilities').expect(401);
      await request(app).get('/api/system-admin/facilities/pending').expect(401);
    });
  });
});
