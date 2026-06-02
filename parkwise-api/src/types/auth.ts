import type { Request } from 'express';
import type { AccountRole } from '../lib/rbac/roles';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'REMOVED';

/** The authenticated principal attached to a request after requireAuth. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  accountStatus: AccountStatus;
  sessionId: string;
  sessionExpiresAt: Date;
  // Role-specific profile ids (only the relevant one is populated).
  driverProfileId?: string;
  ownerProfileId?: string;
  adminProfileId?: string;
  adminStatus?: AccountStatus;
  sysAdminProfileId?: string;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}
