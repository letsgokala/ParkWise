import type { Role } from './api';

const ROLE_ROUTE_PREFIXES: Record<Role, string[]> = {
  REGISTERED_DRIVER: ['/driver'],
  FACILITY_OWNER: ['/owner'],
  PARKING_ADMIN: ['/parking-admin'],
  SYSTEM_ADMIN: ['/system-admin'],
};

const PUBLIC_ROUTE_PREFIXES = ['/', '/map', '/facilities'];

export function canRoleAccessPath(role: Role, path: string): boolean {
  const cleanPath = path.split(/[?#]/, 1)[0] || '/';

  if (PUBLIC_ROUTE_PREFIXES.some((prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`))) {
    return true;
  }

  return ROLE_ROUTE_PREFIXES[role].some((prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`));
}

export function getPostLoginPath(user: { role: Role; homePath: string }, from?: string): string {
  if (from && canRoleAccessPath(user.role, from)) {
    return from;
  }

  return user.homePath;
}
