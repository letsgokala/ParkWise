import { In } from 'typeorm';
import { AppDataSource } from '../db/data-source';
import { ParkingLocationEntity } from '../entities/ParkingLocation.entity';
import { ParkingLocationDto } from '../types/api.types';
import { toParkingLocationDto } from './mappers';

export class ParkingService {
  private parkingLocationRepository = AppDataSource.getRepository(ParkingLocationEntity);

  async listFacilities(statuses: string[]): Promise<ParkingLocationDto[]> {
    const facilities = await this.parkingLocationRepository.find({
      where: statuses.length > 0 ? { status: In(statuses) } : undefined,
      order: { facilityName: 'ASC' },
    });

    return facilities.map(toParkingLocationDto);
  }
}
