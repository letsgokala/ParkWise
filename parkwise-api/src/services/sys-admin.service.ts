import { randomUUID } from 'crypto';
import { AppDataSource } from '../db/data-source';
import { ParkingAdminEntity } from '../entities/ParkingAdmin.entity';
import { ParkingLocationEntity } from '../entities/ParkingLocation.entity';
import { UserEntity } from '../entities/User.entity';
import { AppError } from '../types/app-error';
import { AssignAdminInput, CreateFacilityInput, ParkingAdminRecordDto, ParkingLocationDto, SysAdminUserDto } from '../types/api.types';
import { toParkingAdminRecordDto, toParkingLocationDto, toSysAdminUserDto } from './mappers';

export class SysAdminService {
  private parkingLocationRepository = AppDataSource.getRepository(ParkingLocationEntity);
  private userRepository = AppDataSource.getRepository(UserEntity);
  private parkingAdminRepository = AppDataSource.getRepository(ParkingAdminEntity);

  async getOverview(): Promise<{
    facilities: ParkingLocationDto[];
    users: SysAdminUserDto[];
    admins: ParkingAdminRecordDto[];
  }> {
    const [facilities, users, admins] = await Promise.all([
      this.parkingLocationRepository.find({ order: { facilityName: 'ASC' } }),
      this.userRepository.find({ order: { createdAt: 'DESC' } }),
      this.parkingAdminRepository.find({
        relations: { user: true },
        order: { userId: 'ASC' },
      }),
    ]);

    return {
      facilities: facilities.map(toParkingLocationDto),
      users: users.map(toSysAdminUserDto),
      admins: admins.map(toParkingAdminRecordDto),
    };
  }

  async createFacility(input: CreateFacilityInput): Promise<ParkingLocationDto> {
    const { facilityName, address, latitude, longitude, totalSpaces, pricePerHour, status } = input;

    if (!facilityName || !address) {
      throw new AppError(400, 'Facility name and address are required.');
    }

    const facility = this.parkingLocationRepository.create({
      id: randomUUID(),
      facilityName,
      address,
      latitude: Number(latitude),
      longitude: Number(longitude),
      totalSpaces: Number(totalSpaces),
      availableSpaces: Number(totalSpaces),
      pricePerHour: Number(pricePerHour),
      status: status || 'Verified',
    });

    await this.parkingLocationRepository.save(facility);
    return toParkingLocationDto(facility);
  }

  async deleteFacility(id: string): Promise<void> {
    await this.parkingLocationRepository.delete({ id });
  }

  async assignAdmin(input: AssignAdminInput): Promise<void> {
    const { adminId, facilityId } = input;

    if (!facilityId) {
      throw new AppError(400, 'Facility id is required.');
    }

    await AppDataSource.transaction(async (manager) => {
      await manager.update(ParkingAdminEntity, { facilityId }, { facilityId: null });

      if (adminId) {
        const parkingAdmin = await manager.findOneBy(ParkingAdminEntity, { userId: adminId });
        if (!parkingAdmin) {
          throw new AppError(404, 'Parking admin not found.');
        }

        parkingAdmin.facilityId = null;
        await manager.save(parkingAdmin);

        parkingAdmin.facilityId = facilityId;
        await manager.save(parkingAdmin);
      }
    });
  }
}
