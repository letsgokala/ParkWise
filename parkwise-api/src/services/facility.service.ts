import type { ParkingFacility } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { haversineKm, round, type Coordinates } from '../lib/geo/haversine';
import { rankFacilities, type Congestion } from '../lib/ai/scoring';
import { toPublicFacility } from '../lib/serializers';
import { notFound } from '../lib/errors';
import * as congestionService from './congestion.service';
import type { SearchQuery } from '../validators/facility.validators';

interface FacilityFilters {
  facilityType?: 'MANUAL' | 'API_INTEGRATED';
  maxPrice?: number;
  minAvailableSpaces?: number;
  onlyAvailable?: boolean;
}

/**
 * Single source of truth for which facilities drivers may see: ONLY APPROVED.
 * Every public/driver query funnels through here so PENDING/REJECTED/SUSPENDED
 * facilities can never leak (business rules 1 & 2).
 */
async function getApprovedFacilities(filters: FacilityFilters = {}): Promise<ParkingFacility[]> {
  return prisma.parkingFacility.findMany({
    where: {
      status: 'APPROVED',
      ...(filters.facilityType ? { facilityType: filters.facilityType } : {}),
      ...(filters.maxPrice !== undefined ? { hourlyPrice: { lte: filters.maxPrice } } : {}),
      ...(filters.minAvailableSpaces !== undefined
        ? { availableSpaces: { gte: filters.minAvailableSpaces } }
        : {}),
      ...(filters.onlyAvailable ? { availableSpaces: { gt: 0 } } : {}),
    },
    orderBy: { name: 'asc' },
  });
}

const withDistance = (facility: ParkingFacility, origin: Coordinates) =>
  round(haversineKm(origin, { lat: facility.latitude, lng: facility.longitude }), 3);

const toPoints = (facilities: ParkingFacility[]): congestionService.FacilityPoint[] =>
  facilities.map((f) => ({
    id: f.id,
    latitude: f.latitude,
    longitude: f.longitude,
    fallback: f.congestionLevel as Congestion,
  }));

export async function listNearby(origin: Coordinates, radiusKm: number) {
  const facilities = await getApprovedFacilities();
  const within = facilities.filter((f) => withDistance(f, origin) <= radiusKm);
  // Real-time congestion (live Google traffic) overrides the stored level.
  const congestion = await congestionService.computeForFacilities(origin, toPoints(within));
  return within
    .map((f) => ({
      ...toPublicFacility(f),
      congestionLevel: congestion.get(f.id) ?? (f.congestionLevel as Congestion),
      distanceKm: withDistance(f, origin),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function getPublicFacility(id: string) {
  const facility = await prisma.parkingFacility.findUnique({ where: { id } });
  // Drivers must never see non-approved facilities — treat as not found.
  if (!facility || facility.status !== 'APPROVED') {
    throw notFound('Parking facility not found.');
  }
  return toPublicFacility(facility);
}

export async function searchFacilities(params: SearchQuery) {
  const facilities = await getApprovedFacilities({
    facilityType: params.facilityType,
    maxPrice: params.maxPrice,
    minAvailableSpaces: params.minAvailableSpaces,
    onlyAvailable: params.availability === 'available',
  });

  const hasOrigin = params.lat !== undefined && params.lng !== undefined;
  const origin: Coordinates | null = hasOrigin ? { lat: params.lat!, lng: params.lng! } : null;

  let pool = facilities;
  if (origin && params.maxDistanceKm !== undefined) {
    pool = facilities.filter((f) => withDistance(f, origin) <= params.maxDistanceKm!);
  }

  const congestion = origin ? await congestionService.computeForFacilities(origin, toPoints(pool)) : null;

  const results = pool.map((f) => ({
    ...toPublicFacility(f),
    congestionLevel: congestion?.get(f.id) ?? (f.congestionLevel as Congestion),
    distanceKm: origin ? withDistance(f, origin) : null,
  }));

  results.sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
    return a.name.localeCompare(b.name);
  });

  return results;
}

/**
 * AI-ranked recommendations. Considers only APPROVED facilities within the
 * radius, scores them with the deterministic coefficient model using real-time
 * congestion, and (when a registered driver is making the request) records an
 * AIRecommendationLog.
 */
export async function rankNearby(params: {
  origin: Coordinates;
  radiusKm: number;
  driverProfileId?: string;
}) {
  const facilities = await getApprovedFacilities();
  const within = facilities.filter((f) => withDistance(f, params.origin) <= params.radiusKm);
  const byId = new Map(within.map((f) => [f.id, f]));

  // Live traffic congestion feeds both the score and the returned facility.
  const congestion = await congestionService.computeForFacilities(params.origin, toPoints(within));

  const candidates = within.map((f) => ({
    id: f.id,
    latitude: f.latitude,
    longitude: f.longitude,
    hourlyPrice: f.hourlyPrice,
    availableSpaces: f.availableSpaces,
    totalSpaces: f.totalSpaces,
    congestionLevel: congestion.get(f.id) ?? (f.congestionLevel as Congestion),
  }));

  const ranked = rankFacilities(candidates, params.origin, { maxDistanceKm: params.radiusKm });

  const result = ranked.map((r) => {
    const facility = byId.get(r.facility.id)!;
    return {
      facility: {
        ...toPublicFacility(facility),
        congestionLevel: congestion.get(facility.id) ?? (facility.congestionLevel as Congestion),
      },
      rank: r.rank,
      distanceKm: r.distanceKm,
      finalScore: r.finalScore,
      scorePercent: r.scorePercent,
      isFull: r.isFull,
      scoreBreakdown: r.scoreBreakdown,
    };
  });

  if (params.driverProfileId && result.length > 0) {
    await prisma.aIRecommendationLog.createMany({
      data: result.map((r) => ({
        driverId: params.driverProfileId!,
        inputLatitude: params.origin.lat,
        inputLongitude: params.origin.lng,
        facilityId: r.facility.id,
        distanceKm: r.distanceKm,
        priceScore: r.scoreBreakdown.priceScore,
        distanceScore: r.scoreBreakdown.distanceScore,
        availabilityScore: r.scoreBreakdown.availabilityScore,
        congestionScore: r.scoreBreakdown.congestionScore,
        finalScore: r.finalScore,
        rankPosition: r.rank,
      })),
    });
  }

  return result;
}
