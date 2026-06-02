import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';

/**
 * In-memory mock of an external parking provider's availability feed.
 *
 * This simulates a third-party "smart parking" API for development. Real
 * deployments would point ApiIntegration.endpointUrl at an actual provider;
 * here the sync service fetches this endpoint instead. A developer/owner can
 * POST a specific value to simulate the sensor count changing, otherwise the
 * GET returns a pseudo-random count so syncs visibly fluctuate.
 */
const simulated = new Map<string, number>();

export function setSimulatedAvailability(facilityId: string, value: number): void {
  simulated.set(facilityId, value);
}

export async function readMockAvailability(facilityId: string) {
  const facility = await prisma.parkingFacility.findUnique({
    where: { id: facilityId },
    select: { id: true, totalSpaces: true },
  });
  if (!facility) throw notFound('Facility not found.');

  const availableSpaces = simulated.has(facilityId)
    ? Math.min(simulated.get(facilityId)!, facility.totalSpaces)
    : Math.floor(Math.random() * (facility.totalSpaces + 1));

  return {
    facilityId: facility.id,
    availableSpaces,
    totalSpaces: facility.totalSpaces,
    generatedAt: new Date().toISOString(),
  };
}

export async function applySimulatedAvailability(facilityId: string, value: number) {
  const facility = await prisma.parkingFacility.findUnique({
    where: { id: facilityId },
    select: { id: true, totalSpaces: true },
  });
  if (!facility) throw notFound('Facility not found.');

  const clamped = Math.min(Math.max(Math.round(value), 0), facility.totalSpaces);
  setSimulatedAvailability(facilityId, clamped);
  return { facilityId, availableSpaces: clamped, totalSpaces: facility.totalSpaces };
}
