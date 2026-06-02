/**
 * Typed ParkWise API client.
 *
 * Auth uses HTTP-only session cookies (sent via credentials:'include') plus a
 * double-submit CSRF token: the backend sets a readable `pw_csrf` cookie which
 * we echo in the `x-csrf-token` header on every mutating request.
 */

const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';

// ---------------------------------------------------------------------------
// Shared types (mirror backend serializers)
// ---------------------------------------------------------------------------

export type Role = 'REGISTERED_DRIVER' | 'FACILITY_OWNER' | 'PARKING_ADMIN' | 'SYSTEM_ADMIN';
export type FacilityStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type FacilityType = 'MANUAL' | 'API_INTEGRATED';
export type Congestion = 'LOW' | 'MEDIUM' | 'HIGH';
export type AssignmentStatus = 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

export interface MeUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
  accountStatus: string;
  createdAt: string;
  homePath: string;
  profile: Record<string, unknown>;
}

export interface Facility {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  totalSpaces: number;
  availableSpaces: number;
  hourlyPrice: number;
  facilityType: FacilityType;
  congestionLevel: Congestion;
  status: FacilityStatus;
  occupancyRate: number;
  isFull: boolean;
  lastAvailabilityUpdateAt: string | null;
  createdAt: string | null;
}

export interface FacilityWithDistance extends Facility {
  distanceKm: number | null;
}

export interface ScoreBreakdown {
  distanceScore: number;
  priceScore: number;
  availabilityScore: number;
  congestionScore: number;
  weights: { distance: number; price: number; availability: number; congestion: number };
}

export interface Recommendation {
  facility: Facility;
  rank: number;
  distanceKm: number;
  finalScore: number;
  scorePercent: number;
  isFull: boolean;
  scoreBreakdown: ScoreBreakdown;
}

export interface Favorite {
  id: string;
  facilityId: string;
  notifyOnAvailability: boolean;
  notifyOnPriceDrop: boolean;
  createdAt: string | null;
  facility: Facility;
}

export interface SmartAlert {
  facilityId: string;
  facilityName: string;
  type: 'availability' | 'price-drop';
  message: string;
  availableSpaces: number;
  hourlyPrice: number;
}

export interface ManagedFacility extends Facility {
  ownerId: string;
  approvalNotes: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  suspendedAt: string | null;
  updatedAt: string | null;
}

export interface FacilityWithOwner extends ManagedFacility {
  owner: { ownerProfileId: string; organizationName: string; name: string; email: string };
}

export interface Assignment {
  id: string;
  facilityId: string;
  facilityName: string;
  parkingAdminId: string;
  adminName: string;
  adminEmail: string;
  status: AssignmentStatus;
  notes: string | null;
  assignedAt: string | null;
  suspendedAt: string | null;
  removedAt: string | null;
  replacedByAssignmentId: string | null;
  createdAt: string | null;
}

export interface ParkingAdminAccount {
  id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  adminStatus: string;
  createdAt: string | null;
  activeAssignments: { assignmentId: string; facilityId: string; facilityName: string }[];
}

export interface ApiIntegrationStatus {
  id: string;
  facilityId: string;
  endpointUrl: string;
  refreshIntervalSeconds: number;
  isEnabled: boolean;
  hasToken: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: 'SUCCESS' | 'FAILED' | 'NEVER';
  lastSyncError: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RouteResult {
  provider: string;
  fallback: boolean;
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
}

export interface AssignedFacility {
  assignmentId: string;
  facility: ManagedFacility;
  canEditAvailability: boolean;
  apiIntegration: ApiIntegrationStatus | null;
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = readCookie('pw_csrf');
    if (csrf) headers['x-csrf-token'] = csrf;
  }

  const response = await fetch(url.toString().replace(window.location.origin, ''), {
    method,
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok || (payload && payload.success === false)) {
    const error = payload?.error ?? {};
    throw new ApiError(
      response.status,
      error.code ?? 'ERROR',
      error.message ?? 'Request failed.',
      error.details,
    );
  }

  return (payload?.data ?? null) as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const auth = {
  me: () => request<{ user: MeUser }>('/auth/me'),
  login: (email: string, password: string) =>
    request<{ user: MeUser }>('/auth/login', { method: 'POST', body: { email, password } }),
  registerDriver: (body: { name: string; email: string; phoneNumber: string; password: string }) =>
    request<{ user: MeUser }>('/auth/register/driver', { method: 'POST', body }),
  registerOwner: (body: {
    fullName: string;
    organizationName: string;
    email: string;
    phoneNumber: string;
    password: string;
  }) => request<{ user: MeUser }>('/auth/register/facility-owner', { method: 'POST', body }),
  logout: () => request<{ loggedOut: boolean }>('/auth/logout', { method: 'POST' }),
};

// ---------------------------------------------------------------------------
// Public + driver
// ---------------------------------------------------------------------------

export const facilities = {
  nearby: (lat: number, lng: number, radiusKm = 5) =>
    request<{ facilities: FacilityWithDistance[] }>('/facilities/nearby', {
      query: { lat, lng, radiusKm },
    }),
  search: (params: {
    lat?: number;
    lng?: number;
    maxDistanceKm?: number;
    maxPrice?: number;
    minAvailableSpaces?: number;
    facilityType?: FacilityType;
    availability?: 'any' | 'available';
  }) => request<{ facilities: FacilityWithDistance[] }>('/facilities/search', { query: params }),
  rank: (lat: number, lng: number, radiusKm = 5) =>
    request<{ recommendations: Recommendation[] }>('/facilities/rank', {
      query: { lat, lng, radiusKm },
    }),
  detail: (id: string) => request<{ facility: Facility }>(`/facilities/${id}`),
};

export const navigation = {
  route: (fromLat: number, fromLng: number, toLat: number, toLng: number) =>
    request<{ route: RouteResult }>('/navigation/route', {
      query: { fromLat, fromLng, toLat, toLng },
    }),
};

export const driver = {
  listFavorites: () =>
    request<{ favorites: Favorite[]; hiddenCount: number; alerts: SmartAlert[] }>('/driver/favorites'),
  addFavorite: (facilityId: string) =>
    request<{ favorite: Favorite }>(`/driver/favorites/${facilityId}`, { method: 'POST' }),
  removeFavorite: (facilityId: string) =>
    request<{ removed: boolean }>(`/driver/favorites/${facilityId}`, { method: 'DELETE' }),
  updateFavoriteAlerts: (
    facilityId: string,
    body: { notifyOnAvailability?: boolean; notifyOnPriceDrop?: boolean },
  ) => request<{ favorite: Favorite }>(`/driver/favorites/${facilityId}/alerts`, { method: 'PATCH', body }),
};

// ---------------------------------------------------------------------------
// Facility owner
// ---------------------------------------------------------------------------

export interface OwnerDashboard {
  facilities: ManagedFacility[];
  stats: { total: number; pending: number; approved: number; rejected: number; suspended: number };
  admins: ParkingAdminAccount[];
}

export const owner = {
  dashboard: () => request<OwnerDashboard>('/owner/dashboard'),
  listFacilities: () => request<{ facilities: ManagedFacility[] }>('/owner/facilities'),
  listAssignments: () => request<{ assignments: Assignment[] }>('/owner/assignments'),
  facilityDetail: (id: string) =>
    request<{
      facility: ManagedFacility;
      assignments: Assignment[];
      apiIntegration: ApiIntegrationStatus | null;
    }>(`/owner/facilities/${id}`),
  createFacility: (body: Record<string, unknown>) =>
    request<{ facility: ManagedFacility }>('/owner/facilities', { method: 'POST', body }),
  updateFacility: (id: string, body: Record<string, unknown>) =>
    request<{ facility: ManagedFacility }>(`/owner/facilities/${id}`, { method: 'PATCH', body }),
  listAdmins: () => request<{ admins: ParkingAdminAccount[] }>('/owner/parking-admins'),
  createAdmin: (body: { name: string; email: string; phoneNumber: string; temporaryPassword: string }) =>
    request<{ admin: ParkingAdminAccount }>('/owner/parking-admins', { method: 'POST', body }),
  assignAdmin: (facilityId: string, body: { parkingAdminId: string; notes?: string }) =>
    request<{ assignment: Assignment }>(`/owner/facilities/${facilityId}/assign-admin`, {
      method: 'POST',
      body,
    }),
  suspendAssignment: (assignmentId: string) =>
    request<{ assignment: Assignment }>(`/owner/assignments/${assignmentId}/suspend`, { method: 'PATCH' }),
  removeAssignment: (assignmentId: string) =>
    request<{ assignment: Assignment }>(`/owner/assignments/${assignmentId}/remove`, { method: 'PATCH' }),
  replaceAssignment: (assignmentId: string, body: { newParkingAdminId: string; notes?: string }) =>
    request<{ assignment: Assignment }>(`/owner/assignments/${assignmentId}/replace`, {
      method: 'POST',
      body,
    }),
};

// ---------------------------------------------------------------------------
// Parking admin
// ---------------------------------------------------------------------------

export const parkingAdmin = {
  assignedFacilities: () => request<{ facilities: AssignedFacility[] }>('/parking-admin/assigned-facilities'),
  updateAvailability: (facilityId: string, availableSpaces: number) =>
    request<{ facility: ManagedFacility }>(`/parking-admin/facilities/${facilityId}/availability`, {
      method: 'PATCH',
      body: { availableSpaces },
    }),
  updatePrice: (facilityId: string, hourlyPrice: number) =>
    request<{ facility: ManagedFacility }>(`/parking-admin/facilities/${facilityId}/price`, {
      method: 'PATCH',
      body: { hourlyPrice },
    }),
};

// ---------------------------------------------------------------------------
// System admin
// ---------------------------------------------------------------------------

export interface SystemOverview {
  totalUsers: number;
  totalFacilities: number;
  facilitiesByStatus: { pending: number; approved: number; rejected: number; suspended: number };
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  actor: { name: string; email: string; role: string } | null;
  createdAt: string;
}

export const systemAdmin = {
  overview: () => request<SystemOverview>('/system-admin/overview'),
  pending: () => request<{ facilities: FacilityWithOwner[] }>('/system-admin/facilities/pending'),
  allFacilities: (status?: FacilityStatus) =>
    request<{ facilities: FacilityWithOwner[] }>('/system-admin/facilities', {
      query: status ? { status } : {},
    }),
  approve: (id: string, notes?: string) =>
    request<{ facility: FacilityWithOwner }>(`/system-admin/facilities/${id}/approve`, {
      method: 'PATCH',
      body: { notes },
    }),
  reject: (id: string, notes?: string) =>
    request<{ facility: FacilityWithOwner }>(`/system-admin/facilities/${id}/reject`, {
      method: 'PATCH',
      body: { notes },
    }),
  suspend: (id: string, notes?: string) =>
    request<{ facility: FacilityWithOwner }>(`/system-admin/facilities/${id}/suspend`, {
      method: 'PATCH',
      body: { notes },
    }),
  auditLogs: (limit = 50) => request<{ logs: AuditLogEntry[] }>('/system-admin/audit-logs', { query: { limit } }),
};

// ---------------------------------------------------------------------------
// API integration
// ---------------------------------------------------------------------------

export const apiIntegration = {
  status: (facilityId: string) =>
    request<{ facility: ManagedFacility; integration: ApiIntegrationStatus }>(
      `/api-integrations/${facilityId}/status`,
    ),
  sync: (facilityId: string) =>
    request<{
      synced: boolean;
      warning?: string;
      facility: ManagedFacility;
      integration: ApiIntegrationStatus;
    }>(`/api-integrations/${facilityId}/sync`, { method: 'POST' }),
  update: (facilityId: string, body: Record<string, unknown>) =>
    request<{ facility: ManagedFacility; integration: ApiIntegrationStatus }>(
      `/api-integrations/${facilityId}`,
      { method: 'PATCH', body },
    ),
  /** Simulate the external sensor count changing (dev/demo helper). */
  simulate: async (facilityId: string, availableSpaces: number) => {
    const csrf = readCookie('pw_csrf');
    await fetch(`${API_BASE}/mock-external-parking/${facilityId}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) },
      credentials: 'include',
      body: JSON.stringify({ availableSpaces }),
    });
  },
};
