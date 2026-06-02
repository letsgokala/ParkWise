import type { ParkingFacility } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { decryptSecret, encryptSecret } from '../lib/crypto';
import { toApiIntegrationStatus, toManagedFacility } from '../lib/serializers';
import { writeAudit, AuditActions } from './audit.service';
import type { UpdateApiIntegrationInput } from '../validators/owner.validators';

export interface Requester {
  role: string;
  actorUserId: string;
  ownerProfileId?: string;
  adminProfileId?: string;
  sysAdminProfileId?: string;
}

async function loadFacility(facilityId: string): Promise<ParkingFacility> {
  const facility = await prisma.parkingFacility.findUnique({ where: { id: facilityId } });
  if (!facility) throw notFound('Facility not found.');
  return facility;
}

async function assertCanView(facilityId: string, r: Requester): Promise<ParkingFacility> {
  const facility = await loadFacility(facilityId);
  if (r.role === 'SYSTEM_ADMIN') return facility;
  if (r.role === 'FACILITY_OWNER' && facility.ownerId === r.ownerProfileId) return facility;
  if (r.role === 'PARKING_ADMIN' && r.adminProfileId) {
    const assignment = await prisma.parkingAdminAssignment.findFirst({
      where: { facilityId, parkingAdminId: r.adminProfileId, status: 'ACTIVE' },
    });
    if (assignment) return facility;
  }
  throw forbidden('You cannot access this facility integration.');
}

async function assertCanManage(facilityId: string, r: Requester): Promise<ParkingFacility> {
  const facility = await loadFacility(facilityId);
  if (r.role === 'SYSTEM_ADMIN') return facility;
  if (r.role === 'FACILITY_OWNER' && facility.ownerId === r.ownerProfileId) return facility;
  throw forbidden('Only the facility owner or a system admin can perform this action.');
}

export async function getStatus(facilityId: string, requester: Requester) {
  const facility = await assertCanView(facilityId, requester);
  const integration = await prisma.apiIntegration.findUnique({ where: { facilityId } });
  if (!integration) throw notFound('This facility has no API integration configured.');
  return { facility: toManagedFacility(facility), integration: toApiIntegrationStatus(integration) };
}

/**
 * Pull the latest availability from the external (mock) API and apply it.
 * On any failure the facility keeps its last-known availability and the error
 * is recorded — the endpoint still responds 200 with synced:false (UC6 / UC16).
 */
export async function syncAvailability(facilityId: string, requester: Requester) {
  const facility = await assertCanManage(facilityId, requester);
  const integration = await prisma.apiIntegration.findUnique({ where: { facilityId } });
  if (!integration) throw notFound('This facility has no API integration configured.');
  if (!integration.isEnabled) throw badRequest('API integration is disabled for this facility.');

  try {
    const token = decryptSecret(integration.authToken);
    const response = await fetch(integration.endpointUrl, {
      headers: { 'x-api-token': token, accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`External API responded ${response.status}`);

    const data = (await response.json()) as { availableSpaces?: number };
    const value = Number(data.availableSpaces);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('External API returned an invalid availability value.');
    }
    const clamped = Math.min(Math.round(value), facility.totalSpaces);

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.parkingFacility.update({
        where: { id: facilityId },
        data: { availableSpaces: clamped, lastAvailabilityUpdateAt: new Date() },
      });
      await tx.availabilityLog.create({
        data: {
          facilityId,
          oldAvailableSpaces: facility.availableSpaces,
          newAvailableSpaces: clamped,
          source: 'API_SYNC',
        },
      });
      await tx.apiIntegration.update({
        where: { facilityId },
        data: { lastSyncAt: new Date(), lastSyncStatus: 'SUCCESS', lastSyncError: null },
      });
      return next;
    });

    await writeAudit({
      actorUserId: requester.actorUserId,
      action: AuditActions.API_SYNCED,
      entityType: 'ApiIntegration',
      entityId: integration.id,
      metadata: { availableSpaces: clamped, result: 'SUCCESS' },
    });

    const fresh = await prisma.apiIntegration.findUniqueOrThrow({ where: { facilityId } });
    return { synced: true, facility: toManagedFacility(updated), integration: toApiIntegrationStatus(fresh) };
  } catch (error) {
    const message = (error as Error).message;
    await prisma.apiIntegration.update({
      where: { facilityId },
      data: { lastSyncAt: new Date(), lastSyncStatus: 'FAILED', lastSyncError: message.slice(0, 500) },
    });
    await writeAudit({
      actorUserId: requester.actorUserId,
      action: AuditActions.API_SYNCED,
      entityType: 'ApiIntegration',
      entityId: integration.id,
      metadata: { result: 'FAILED', error: message },
    });

    const fresh = await prisma.apiIntegration.findUniqueOrThrow({ where: { facilityId } });
    return {
      synced: false,
      warning: `Sync failed: ${message}. Showing last known availability.`,
      facility: toManagedFacility(facility),
      integration: toApiIntegrationStatus(fresh),
    };
  }
}

export async function updateIntegration(
  facilityId: string,
  ownerProfileId: string,
  actorUserId: string,
  input: UpdateApiIntegrationInput,
) {
  const facility = await loadFacility(facilityId);
  if (facility.ownerId !== ownerProfileId) throw forbidden('You do not own this facility.');
  if (facility.facilityType !== 'API_INTEGRATED') {
    throw badRequest('This facility is not configured as API-integrated.');
  }

  const integration = await prisma.apiIntegration.upsert({
    where: { facilityId },
    update: {
      ...(input.endpointUrl !== undefined ? { endpointUrl: input.endpointUrl } : {}),
      ...(input.authToken !== undefined ? { authToken: encryptSecret(input.authToken) } : {}),
      ...(input.refreshIntervalSeconds !== undefined
        ? { refreshIntervalSeconds: input.refreshIntervalSeconds }
        : {}),
      ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
    },
    create: {
      facilityId,
      endpointUrl: input.endpointUrl ?? '',
      authToken: input.authToken ? encryptSecret(input.authToken) : '',
      refreshIntervalSeconds: input.refreshIntervalSeconds ?? 300,
      isEnabled: input.isEnabled ?? true,
    },
  });

  return { facility: toManagedFacility(facility), integration: toApiIntegrationStatus(integration) };
}
