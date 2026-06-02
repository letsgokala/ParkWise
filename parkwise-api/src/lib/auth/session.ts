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
    sessionExpiresAt: session.expiresAt,
    driverProfileId: user.driverProfile?.id,
    ownerProfileId: user.ownerProfile?.id,
    adminProfileId: user.adminProfile?.id,
    adminStatus: user.adminProfile?.adminStatus,
    sysAdminProfileId: user.sysAdminProfile?.id,
  };
}

// Sliding expiration: once an active session has used up more than half its
// lifetime, push the expiry back to a full TTL again. This keeps active users
// logged in indefinitely while genuinely idle sessions still lapse.
const RENEWAL_THRESHOLD_FRACTION = 0.5;

/**
 * Extend a session's expiry if it is past the renewal threshold. Returns the
 * new expiry (so the caller can refresh the cookie), or null if no renewal was
 * needed. Best-effort — callers should not let a failure here break the request.
 */
export async function renewSessionIfNeeded(user: AuthUser): Promise<Date | null> {
  const ttlMs = env.sessionTtlHours * 60 * 60 * 1000;
  const remainingMs = user.sessionExpiresAt.getTime() - Date.now();
  if (remainingMs >= ttlMs * RENEWAL_THRESHOLD_FRACTION) {
    return null;
  }
  const expiresAt = new Date(Date.now() + ttlMs);
  await prisma.session.update({ where: { id: user.sessionId }, data: { expiresAt } });
  return expiresAt;
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
