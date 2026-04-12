import { AppDataSource } from '../db/data-source';
import { DriverFavoriteEntity } from '../entities/DriverFavorite.entity';
import { DriverEntity } from '../entities/Driver.entity';
import { ParkingLocationEntity } from '../entities/ParkingLocation.entity';
import { AppError } from '../types/app-error';
import { CreateDriverFavoriteInput, DriverFavoriteDto } from '../types/api.types';
import { toDriverFavoriteDto } from './mappers';

export class DriverFavoritesService {
  private driverRepository = AppDataSource.getRepository(DriverEntity);
  private favoritesRepository = AppDataSource.getRepository(DriverFavoriteEntity);
  private parkingLocationRepository = AppDataSource.getRepository(ParkingLocationEntity);

  async listFavorites(userId: string): Promise<DriverFavoriteDto[]> {
    await this.assertDriverExists(userId);

    const favorites = await this.favoritesRepository.find({
      where: { userId },
      relations: { facility: true },
      order: { createdAt: 'DESC' },
    });

    return favorites.map(toDriverFavoriteDto);
  }

  async addFavorite(userId: string, input: CreateDriverFavoriteInput): Promise<DriverFavoriteDto> {
    await this.assertDriverExists(userId);

    if (!input.facilityId) {
      throw new AppError(400, 'Facility ID is required.');
    }

    const facility = await this.parkingLocationRepository.findOneBy({ id: input.facilityId });
    if (!facility) {
      throw new AppError(404, 'Parking facility not found.');
    }

    const existingFavorite = await this.favoritesRepository.findOne({
      where: { userId, facilityId: input.facilityId },
      relations: { facility: true },
    });

    if (existingFavorite) {
      return toDriverFavoriteDto(existingFavorite);
    }

    const favorite = this.favoritesRepository.create({
      userId,
      facilityId: input.facilityId,
      facility,
    });

    const savedFavorite = await this.favoritesRepository.save(favorite);
    return toDriverFavoriteDto({ ...savedFavorite, facility });
  }

  async removeFavorite(userId: string, facilityId: string): Promise<void> {
    await this.assertDriverExists(userId);

    if (!facilityId) {
      throw new AppError(400, 'Facility ID is required.');
    }

    await this.favoritesRepository.delete({ userId, facilityId });
  }

  private async assertDriverExists(userId: string) {
    const driver = await this.driverRepository.findOneBy({ userId });
    if (!driver) {
      throw new AppError(404, 'Driver account not found.');
    }
  }
}
