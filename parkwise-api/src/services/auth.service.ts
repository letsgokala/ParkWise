import type { User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { conflict, forbidden, notFound, unauthenticated } from '../lib/errors';
import { ROLE_HOME_PATH, type AccountRole } from '../lib/rbac/roles';
import type { LoginInput, RegisterDriverInput, RegisterOwnerInput } from '../validators/auth.validators';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: AccountRole;
  accountStatus: string;
  createdAt: string;
}

/** Strip secrets before a user ever crosses the API boundary. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role as AccountRole,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt.toISOString(),
  };
}

async function ensureEmailAvailable(email: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict('That email is already in use.');
}

export async function registerDriver(input: RegisterDriverInput): Promise<User> {
  await ensureEmailAvailable(input.email);
  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phoneNumber: input.phoneNumber,
      passwordHash,
      role: 'REGISTERED_DRIVER',
      driverProfile: { create: {} },
    },
  });
}

export async function registerOwner(input: RegisterOwnerInput): Promise<User> {
  await ensureEmailAvailable(input.email);
  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      name: input.fullName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      passwordHash,
      role: 'FACILITY_OWNER',
      ownerProfile: { create: { organizationName: input.organizationName } },
    },
  });
}

export async function authenticate(input: LoginInput): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same message whether the email is unknown or the password is wrong.
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw unauthenticated('Invalid email or password.');
  }
  if (user.accountStatus !== 'ACTIVE') {
    throw forbidden('Your account is suspended or inactive.');
  }
  return user;
}

/** Build the role-aware "me" payload returned by /api/auth/me. */
export async function buildMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      driverProfile: true,
      ownerProfile: true,
      adminProfile: true,
      sysAdminProfile: true,
    },
  });
  if (!user) throw notFound('User not found.');

  const base = toPublicUser(user);
  const role = base.role;

  let profile: Record<string, unknown> = {};
  if (role === 'REGISTERED_DRIVER' && user.driverProfile) {
    profile = {
      driverProfileId: user.driverProfile.id,
      currentLat: user.driverProfile.currentLat,
      currentLng: user.driverProfile.currentLng,
    };
  } else if (role === 'FACILITY_OWNER' && user.ownerProfile) {
    profile = {
      ownerProfileId: user.ownerProfile.id,
      organizationName: user.ownerProfile.organizationName,
    };
  } else if (role === 'PARKING_ADMIN' && user.adminProfile) {
    profile = {
      adminProfileId: user.adminProfile.id,
      adminStatus: user.adminProfile.adminStatus,
    };
  } else if (role === 'SYSTEM_ADMIN' && user.sysAdminProfile) {
    profile = { sysAdminProfileId: user.sysAdminProfile.id };
  }

  return { ...base, homePath: ROLE_HOME_PATH[role], profile };
}
