import { AppUserDto, DriverFavoriteDto, ParkingAdminRecordDto, ParkingLocationDto, SysAdminUserDto } from '../types/api.types';
import { DriverFavoriteEntity } from '../entities/DriverFavorite.entity';
import { ParkingAdminEntity } from '../entities/ParkingAdmin.entity';
import { ParkingLocationEntity } from '../entities/ParkingLocation.entity';
import { UserEntity } from '../entities/User.entity';

export const toUserDto = (user: UserEntity): AppUserDto => ({
  uid: user.id,
  email: user.email,
  role: user.role as AppUserDto['role'],
  displayName: user.displayName,
});

export const toParkingLocationDto = (facility: ParkingLocationEntity): ParkingLocationDto => ({
  facilityId: facility.id,
  facilityName: facility.facilityName,
  address: facility.address,
  latitude: Number(facility.latitude),
  longitude: Number(facility.longitude),
  totalSpaces: Number(facility.totalSpaces),
  availableSpaces: Number(facility.availableSpaces),
  pricePerHour: Number(facility.pricePerHour),
  status: facility.status,
  createdAt: facility.createdAt,
});

export const toDriverFavoriteDto = (favorite: DriverFavoriteEntity): DriverFavoriteDto => ({
  facilityId: favorite.facilityId,
  createdAt: favorite.createdAt,
  facility: toParkingLocationDto(favorite.facility),
});

export const toSysAdminUserDto = (user: UserEntity): SysAdminUserDto => ({
  uid: user.id,
  email: user.email,
  role: user.role as SysAdminUserDto['role'],
  displayName: user.displayName,
  createdAt: user.createdAt,
});

export const toParkingAdminRecordDto = (parkingAdmin: ParkingAdminEntity): ParkingAdminRecordDto => ({
  adminId: parkingAdmin.userId,
  name: parkingAdmin.user.displayName,
  email: parkingAdmin.user.email,
  facilityID: parkingAdmin.facilityId,
});
