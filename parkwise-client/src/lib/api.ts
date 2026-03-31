export type UserRole = 'driver' | 'parking_admin' | 'sys_admin';

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
}

export interface ParkingLocation {
  facilityId: string;
  facilityName: string;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  totalSpaces: number;
  availableSpaces: number;
  pricePerHour: number;
  createdAt?: string;
}

export interface ParkingAdminRecord {
  adminId: string;
  name: string;
  email: string;
  facilityID: string | null;
}

export interface SysAdminUser {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  createdAt?: string;
}

export interface CreateFacilityPayload {
  facilityName: string;
  address: string;
  latitude: number;
  longitude: number;
  totalSpaces: number;
  pricePerHour: number;
  status: string;
}

interface AuthResponse {
  token: string;
  user: AppUser;
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'parkwise_token';
const USER_KEY = 'parkwise_user';

const parseJson = async (response: Response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

async function apiFetch<T>(path: string, init: RequestInit = {}, requiresAuth = false): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');

  if (requiresAuth) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed.');
  }

  return data as T;
}

export const saveSession = (session: AuthResponse) => {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getStoredUser = (): AppUser | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    clearSession();
    return null;
  }
};

export const registerUser = async (payload: {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'driver' | 'parking_admin';
}) => {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const loginUser = async (payload: { email: string; password: string }) => {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const getCurrentUser = async () => {
  return apiFetch<{ user: AppUser }>('/auth/me', {}, true);
};

export const getParkingLocations = async (statuses: string[] = []) => {
  const search = statuses.length > 0 ? `?statuses=${encodeURIComponent(statuses.join(','))}` : '';
  return apiFetch<{ facilities: ParkingLocation[] }>(`/parking-locations${search}`);
};

export const getAssignedFacility = async () => {
  return apiFetch<{ facility: ParkingLocation | null }>('/admin/facility', {}, true);
};

export const updateAssignedFacility = async (payload: { availableSpaces: number; pricePerHour: number }) => {
  return apiFetch<{ facility: ParkingLocation }>('/admin/facility', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, true);
};

export const getSysAdminOverview = async () => {
  return apiFetch<{
    facilities: ParkingLocation[];
    users: SysAdminUser[];
    admins: ParkingAdminRecord[];
  }>('/sysadmin/overview', {}, true);
};

export const createFacility = async (payload: CreateFacilityPayload) => {
  return apiFetch<{ facility: ParkingLocation }>('/sysadmin/facilities', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
};

export const deleteFacility = async (id: string) => {
  return apiFetch<void>(`/sysadmin/facilities/${id}`, {
    method: 'DELETE',
  }, true);
};

export const assignAdminToFacility = async (adminId: string, facilityId: string) => {
  return apiFetch<void>('/sysadmin/assign-admin', {
    method: 'POST',
    body: JSON.stringify({ adminId: adminId || null, facilityId }),
  }, true);
};
