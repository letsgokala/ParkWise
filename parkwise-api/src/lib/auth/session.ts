import { prisma } from '../prisma';
import { env } from '../../config/env';
import { generateOpaqueToken, sha256 } from '../crypto';
import type { AuthUser } from '../../types/auth';
import type { AccountRole } from '../rbac/roles';

interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
  sessionId: string;
}

/** Issue a new opaque session token and persist only its SHA-256 hash. */
export async function createSession(userId: string, meta: SessionMeta = {}): Promise<CreatedSession> {
  const token = generateOpaqueToken(32);
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 255),
      ipAddress: meta.ipAddress?.slice(0, 64),
    },
  });

  return { token, expiresAt, sessionId: session.id };
}

const userWithProfiles = {
  driverProfile: { select: { id: true } },
  ownerProfile: { select: { id: true } },
  adminProfile: { select: { id: true, adminStatus: true } },
  sysAdminProfile: { select: { id: true } },
} as const;

/** Resolve a raw session token to an AuthUser, or null if invalid/expired. */
export async function resolveSession(token: string): Promise<AuthUser | null> {
  if (!token) return null;
  const tokenHash = sha256(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { include: userWithProfiles } },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  const { user } = session;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as AccountRole,
    accountStatus: user.accountStatus,
    sessionId: session.id,
    driverProfileId: user.driverProfile?.id,
    ownerProfileId: user.ownerProfile?.id,
    adminProfileId: user.adminProfile?.id,
    adminStatus: user.adminProfile?.adminStatus,
    sysAdminProfileId: user.sysAdminProfile?.id,
  };
}

/** Revoke a single session by its raw token (logout). Idempotent. */
export async function revokeSessionByToken(token: string): Promise<void> {
  if (!token) return;
  const tokenHash = sha256(token);
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoke every active session for a user (e.g. on suspension). */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
