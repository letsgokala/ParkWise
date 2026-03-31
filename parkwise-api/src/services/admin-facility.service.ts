import { AppDataSource } from '../db/data-source';
import { ParkingAdminEntity } from '../entities/ParkingAdmin.entity';
import { ParkingLocationEntity } from '../entities/ParkingLocation.entity';
import { AppError } from '../types/app-error';
import { ParkingLocationDto, UpdateFacilityInput } from '../types/api.types';
import { toParkingLocationDto } from './mappers';

export class AdminFacilityService {
  private parkingAdminRepository = AppDataSource.getRepository(ParkingAdminEntity);
  private parkingLocationRepository = AppDataSource.getRepository(ParkingLocationEntity);

  async getAssignedFacility(userId: string): Promise<ParkingLocationDto | null> {
    const parkingAdmin = await this.parkingAdminRepository.findOne({
      where: { userId },
      relations: { facility: true },
    });

    if (!parkingAdmin?.facility) {
      return null;
    }

    return toParkingLocationDto(parkingAdmin.facility);
  }

  async updateAssignedFacility(userId: string, input: UpdateFacilityInput): Promise<ParkingLocationDto> {
    const { availableSpaces, pricePerHour } = input;

    if (typeof availableSpaces !== 'number' || typeof pricePerHour !== 'number') {
      throw new AppError(400, 'Invalid facility update payload.');
    }

    const parkingAdmin = await this.parkingAdminRepository.findOneBy({ userId });
    if (!parkingAdmin?.facilityId) {
      throw new AppError(400, 'No facility is assigned to this admin.');
    }

    const facility = await this.parkingLocationRepository.findOneBy({ id: parkingAdmin.facilityId });
    if (!facility) {
      throw new AppError(404, 'Assigned facility not found.');
    }

    facility.availableSpaces = Math.max(0, Math.min(facility.totalSpaces, availableSpaces));
    facility.pricePerHour = Math.max(0, pricePerHour);
    facility.status = facility.availableSpaces === 0 ? 'Full' : 'Verified';

    await this.parkingLocationRepository.save(facility);
    return toParkingLocationDto(facility);
  }
}
