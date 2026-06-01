import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';
import { isFavoriteActive } from '../lib/rbac/policy';
import { toFavorite } from '../lib/serializers';
import type { FavoriteAlertsInput } from '../validators/favorite.validators';

export interface SmartAlert {
  facilityId: string;
  facilityName: string;
  type: 'availability' | 'price-drop';
  message: string;
  availableSpaces: number;
  hourlyPrice: number;
}

/**
 * List a driver's favorites. Per UC4, only favorites whose facility is still
 * APPROVED are returned as active; suspended/rejected ones are hidden. Also
 * surfaces lightweight smart alerts (spaces opened up / price dropped) and
 * refreshes the last-seen snapshot.
 */
export async function listFavorites(driverProfileId: string) {
  const favorites = await prisma.favoriteParkingFacility.findMany({
    where: { driverId: driverProfileId },
    include: { facility: true },
    orderBy: { createdAt: 'desc' },
  });

  const active = favorites.filter((f) => isFavoriteActive(f.facility.status));
  const hiddenCount = favorites.length - active.length;

  const alerts: SmartAlert[] = [];
  for (const fav of active) {
    const { facility } = fav;
    if (
      fav.notifyOnAvailability &&
      facility.availableSpaces > 0 &&
      (fav.lastSeenAvailableSpaces ?? 0) <= 0
    ) {
      alerts.push({
        facilityId: facility.id,
        facilityName: facility.name,
        type: 'availability',
        message: `${facility.name} now has ${facility.availableSpaces} open space(s).`,
        availableSpaces: facility.availableSpaces,
        hourlyPrice: facility.hourlyPrice,
      });
    }
    if (
      fav.notifyOnPriceDrop &&
      fav.lastSeenHourlyPrice != null &&
      facility.hourlyPrice < fav.lastSeenHourlyPrice
    ) {
      alerts.push({
        facilityId: facility.id,
        facilityName: facility.name,
        type: 'price-drop',
        message: `${facility.name} dropped to ${facility.hourlyPrice} ETB/hr.`,
        availableSpaces: facility.availableSpaces,
        hourlyPrice: facility.hourlyPrice,
      });
    }
  }

  // Refresh last-seen snapshot so alerts only fire on the next change.
  await Promise.all(
    active.map((fav) =>
      prisma.favoriteParkingFacility.update({
        where: { id: fav.id },
        data: {
          lastSeenAvailableSpaces: fav.facility.availableSpaces,
          lastSeenHourlyPrice: fav.facility.hourlyPrice,
        },
      }),
    ),
  );

  return { favorites: active.map(toFavorite), hiddenCount, alerts };
}

export async function addFavorite(driverProfileId: string, facilityId: string) {
  const facility = await prisma.parkingFacility.findUnique({ where: { id: facilityId } });
  // Can only favorite a facility that is currently visible (APPROVED).
  if (!facility || facility.status !== 'APPROVED') {
    throw notFound('Parking facility not found.');
  }

  // Idempotent: re-saving an existing favorite does not create a duplicate.
  const favorite = await prisma.favoriteParkingFacility.upsert({
    where: { driverId_facilityId: { driverId: driverProfileId, facilityId } },
    update: {},
    create: {
      driverId: driverProfileId,
      facilityId,
      lastSeenAvailableSpaces: facility.availableSpaces,
      lastSeenHourlyPrice: facility.hourlyPrice,
    },
    include: { facility: true },
  });

  return toFavorite(favorite);
}

export async function removeFavorite(driverProfileId: string, facilityId: string): Promise<void> {
  await prisma.favoriteParkingFacility.deleteMany({
    where: { driverId: driverProfileId, facilityId },
  });
}

export async function updateFavoriteAlerts(
  driverProfileId: string,
  facilityId: string,
  input: FavoriteAlertsInput,
) {
  const existing = await prisma.favoriteParkingFacility.findUnique({
    where: { driverId_facilityId: { driverId: driverProfileId, facilityId } },
    include: { facility: true },
  });
  if (!existing) throw notFound('Favorite not found.');

  const favorite = await prisma.favoriteParkingFacility.update({
    where: { id: existing.id },
    data: {
      ...(input.notifyOnAvailability !== undefined
        ? { notifyOnAvailability: input.notifyOnAvailability }
        : {}),
      ...(input.notifyOnPriceDrop !== undefined ? { notifyOnPriceDrop: input.notifyOnPriceDrop } : {}),
    },
    include: { facility: true },
  });

  return toFavorite(favorite);
}
