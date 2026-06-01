/**
 * The five ParkWise actors. GUEST_DRIVER has no account/session — it is the
 * absence of authentication — so it is not a stored UserRole, but it is a
 * meaningful authorization subject for public endpoints.
 */
export const Roles = {
  GUEST_DRIVER: 'GUEST_DRIVER',
  REGISTERED_DRIVER: 'REGISTERED_DRIVER',
  FACILITY_OWNER: 'FACILITY_OWNER',
  PARKING_ADMIN: 'PARKING_ADMIN',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
} as const;

/** Roles that can hold a stored account (everything except guest). */
export type AccountRole =
  | 'REGISTERED_DRIVER'
  | 'FACILITY_OWNER'
  | 'PARKING_ADMIN'
  | 'SYSTEM_ADMIN';

export type SubjectRole = AccountRole | 'GUEST_DRIVER';

export const ACCOUNT_ROLES: AccountRole[] = [
  'REGISTERED_DRIVER',
  'FACILITY_OWNER',
  'PARKING_ADMIN',
  'SYSTEM_ADMIN',
];

/** Default dashboard path per role — drives post-login redirects on the client. */
export const ROLE_HOME_PATH: Record<AccountRole, string> = {
  REGISTERED_DRIVER: '/driver/dashboard',
  FACILITY_OWNER: '/owner/dashboard',
  PARKING_ADMIN: '/parking-admin/dashboard',
  SYSTEM_ADMIN: '/system-admin/dashboard',
};
