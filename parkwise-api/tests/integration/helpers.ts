import request from 'supertest';
import { randomUUID } from 'crypto';
import { app } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { hashPassword } from '../../src/lib/crypto';

export type Agent = ReturnType<typeof request.agent>;

/** True if a Postgres database is reachable; integration tests skip otherwise. */
export async function dbAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export function newEmail(prefix = 'user'): string {
  return `${prefix}-${randomUUID()}@test.local`;
}

/** Obtain the CSRF token the server sets on the first request. */
export async function csrfToken(a: Agent): Promise<string> {
  const res = await a.get('/api/health');
  const raw = res.headers['set-cookie'] as unknown as string[] | string | undefined;
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cookie = cookies.find((c) => c.startsWith('pw_csrf='));
  return cookie ? decodeURIComponent(cookie.split(';')[0]!.split('=')[1]!) : '';
}

export interface TestActor {
  a: Agent;
  token: string;
  email: string;
}

export async function makeDriver(): Promise<TestActor> {
  const a = request.agent(app);
  const token = await csrfToken(a);
  const email = newEmail('driver');
  await a
    .post('/api/auth/register/driver')
    .set('x-csrf-token', token)
    .send({ name: 'Test Driver', email, phoneNumber: '+251911000000', password: 'Password123' })
    .expect(201);
  return { a, token, email };
}

export async function makeOwner(): Promise<TestActor> {
  const a = request.agent(app);
  const token = await csrfToken(a);
  const email = newEmail('owner');
  await a
    .post('/api/auth/register/facility-owner')
    .set('x-csrf-token', token)
    .send({
      fullName: 'Test Owner',
      organizationName: 'Test Org',
      email,
      phoneNumber: '+251911000000',
      password: 'Password123',
    })
    .expect(201);
  return { a, token, email };
}

export async function makeSysAdmin(): Promise<TestActor> {
  const email = newEmail('sysadmin');
  const passwordHash = await hashPassword('Password123');
  await prisma.user.create({
    data: { email, name: 'Test SysAdmin', passwordHash, role: 'SYSTEM_ADMIN', sysAdminProfile: { create: {} } },
  });
  const a = request.agent(app);
  const token = await csrfToken(a);
  await a.post('/api/auth/login').set('x-csrf-token', token).send({ email, password: 'Password123' }).expect(200);
  return { a, token, email };
}

/** Log in as an existing user (e.g. a parking admin created by an owner). */
export async function loginAs(email: string, password: string): Promise<TestActor> {
  const a = request.agent(app);
  const token = await csrfToken(a);
  await a.post('/api/auth/login').set('x-csrf-token', token).send({ email, password }).expect(200);
  return { a, token, email };
}

/** Helper: create + approve a facility, returning its id. */
export async function createApprovedFacility(
  owner: TestActor,
  sysAdmin: TestActor,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const createRes = await owner.a
    .post('/api/owner/facilities')
    .set('x-csrf-token', owner.token)
    .send({
      name: 'Test Lot',
      address: 'Bole, Addis Ababa',
      latitude: 9.0,
      longitude: 38.75,
      totalSpaces: 100,
      availableSpaces: 50,
      hourlyPrice: 20,
      facilityType: 'MANUAL',
      congestionLevel: 'MEDIUM',
      ...overrides,
    })
    .expect(201);
  const id = createRes.body.data.facility.id as string;
  await sysAdmin.a.patch(`/api/system-admin/facilities/${id}/approve`).set('x-csrf-token', sysAdmin.token).send({}).expect(200);
  return id;
}
