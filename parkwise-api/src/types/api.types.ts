export type UserRole = 'driver' | 'parking_admin' | 'sys_admin';

export interface AppUserDto {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
}

export interface AuthResponseDto {
  token: string;
  user: AppUserDto;
}

export interface ParkingLocationDto {
  facilityId: string;
  facilityName: string;
  address: string;
  latitude: number;
  longitude: number;
  totalSpaces: number;
  availableSpaces: number;
  pricePerHour: number;
  status: string;
  createdAt: Date;
}

export interface ParkingAdminRecordDto {
  adminId: string;
  name: string;
  email: string;
  facilityID: string | null;
}

export interface SysAdminUserDto {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  createdAt: Date;
}

export interface RegisterInput {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: UserRole;
}

export interface LoginInput {
  email?: string;
  password?: string;
}

export interface UpdateFacilityInput {
  availableSpaces?: number;
  pricePerHour?: number;
}

export interface CreateFacilityInput {
  facilityName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  totalSpaces?: number;
  pricePerHour?: number;
  status?: string;
}

export interface AssignAdminInput {
  adminId?: string | null;
  facilityId?: string;
}
