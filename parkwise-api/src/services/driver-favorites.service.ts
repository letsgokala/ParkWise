import { AppDataSource } from '../db/data-source';
import { DriverFavoriteEntity } from '../entities/DriverFavorite.entity';
import { DriverEntity } from '../entities/Driver.entity';
import { ParkingLocationEntity } from '../entities/ParkingLocation.entity';
import { AppError } from '../types/app-error';
import {
  CreateDriverFavoriteInput,
  DriverFavoriteDto,
  DriverSmartAlertDto,
  UpdateFavoriteAlertsInput,
} from '../types/api.types';
import { toDriverFavoriteDto } from './mappers';

export class DriverFavoritesService {
  private driverRepository = AppDataSource.getRepository(DriverEntity);
  private favoritesRepository = AppDataSource.getRepository(DriverFavoriteEntity);
  private parkingLocationRepository = AppDataSource.getRepository(ParkingLocationEntity);

  async listFavorites(userId: string): Promise<{ favorites: DriverFavoriteDto[]; alerts: DriverSmartAlertDto[] }> {
    await this.assertDriverExists(userId);

    const favorites = await this.favoritesRepository.find({
      where: { userId },
      relations: { facility: true },
      order: { createdAt: 'DESC' },
    });

    const alerts: DriverSmartAlertDto[] = [];

    for (const favorite of favorites) {
      const availabilityRecovered =
        favorite.notifyOnAvailability &&
        typeof favorite.lastSeenAvailableSpaces === 'number' &&
        favorite.lastSeenAvailableSpaces <= 0 &&
        favorite.facility.availableSpaces > 0;

      if (availabilityRecovered) {
        alerts.push({
          facilityId: favorite.facilityId,
          facilityName: favorite.facility.facilityName,
          type: 'availability',
          message: `${favorite.facility.facilityName} now has ${favorite.facility.availableSpaces} open spot${favorite.facility.availableSpaces === 1 ? '' : 's'}.`,
          availableSpaces: favorite.facility.availableSpaces,
          pricePerHour: Number(favorite.facility.pricePerHour),
          triggeredAt: new Date(),
        });
      }

      const priceDropped =
        favorite.notifyOnPriceDrop &&
        typeof favorite.lastSeenPricePerHour === 'number' &&
        favorite.facility.pricePerHour < favorite.lastSeenPricePerHour;

      if (priceDropped) {
        alerts.push({
          facilityId: favorite.facilityId,
          facilityName: favorite.facility.facilityName,
          type: 'price-drop',
          message: `${favorite.facility.facilityName} dropped to ${favorite.facility.pricePerHour} ETB/hr.`,
          availableSpaces: favorite.facility.availableSpaces,
          pricePerHour: Number(favorite.facility.pricePerHour),
          triggeredAt: new Date(),
        });
      }

      favorite.lastSeenAvailableSpaces = favorite.facility.availableSpaces;
      favorite.lastSeenPricePerHour = Number(favorite.facility.pricePerHour);
    }

    if (favorites.length > 0) {
      await this.favoritesRepository.save(favorites);
    }

    return {
      favorites: favorites.map(toDriverFavoriteDto),
      alerts,
    };
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
      notifyOnAvailability: true,
      notifyOnPriceDrop: true,
      lastSeenAvailableSpaces: facility.availableSpaces,
      lastSeenPricePerHour: Number(facility.pricePerHour),
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

  async updateAlerts(userId: string, facilityId: string, input: UpdateFavoriteAlertsInput): Promise<DriverFavoriteDto> {
    await this.assertDriverExists(userId);

    const favorite = await this.favoritesRepository.findOne({
      where: { userId, facilityId },
      relations: { facility: true },
    });

    if (!favorite) {
      throw new AppError(404, 'Favorite parking facility not found.');
    }

    if (typeof input.notifyOnAvailability === 'boolean') {
      favorite.notifyOnAvailability = input.notifyOnAvailability;
    }

    if (typeof input.notifyOnPriceDrop === 'boolean') {
      favorite.notifyOnPriceDrop = input.notifyOnPriceDrop;
    }

    const savedFavorite = await this.favoritesRepository.save(favorite);
    return toDriverFavoriteDto({ ...savedFavorite, facility: favorite.facility });
  }

  private async assertDriverExists(userId: string) {
    const driver = await this.driverRepository.findOneBy({ userId });
    if (!driver) {
      throw new AppError(404, 'Driver account not found.');
    }
  }
}
