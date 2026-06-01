import type { ParkingFacility } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, forbidden } from '../lib/errors';
import { canManuallyUpdateAvailability } from '../lib/rbac/policy';
import { toApiIntegrationStatus, toManagedFacility } from '../lib/serializers';
import { writeAudit, AuditActions } from './audit.service';
import type { AccountStatus } from '../types/auth';

/**
 * Verify the admin account is ACTIVE and holds an ACTIVE assignment to the
 * facility (business rules 4 & 15). Suspended/removed admins are denied.
 */
async function assertActiveAssignment(
  adminProfileId: string,
  adminStatus: AccountStatus | undefined,
  facilityId: string,
): Promise<ParkingFacility> {
  if (adminStatus !== 'ACTIVE') {
    throw forbidden('Your administrator account is suspended or removed.');
  }
  const assignment = await prisma.parkingAdminAssignment.findFirst({
    where: { parkingAdminId: adminProfileId, facilityId, status: 'ACTIVE' },
  });
  if (!assignment) {
    throw forbidden('You are not actively assigned to this facility.');
  }
  return prisma.parkingFacility.findUniqueOrThrow({ where: { id: facilityId } });
}

export async function listAssignedFacilities(adminProfileId: string, adminStatus: AccountStatus | undefined) {
  if (adminStatus !== 'ACTIVE') {
    throw forbidden('Your administrator account is suspended or removed.');
  }

  const assignments = await prisma.parkingAdminAssignment.findMany({
    where: { parkingAdminId: adminProfileId, status: 'ACTIVE' },
    include: { facility: { include: { apiIntegration: true } } },
    orderBy: { assignedAt: 'desc' },
  });

  return assignments.map((a) => ({
    assignmentId: a.id,
    facility: toManagedFacility(a.facility),
    // API-integrated facilities are monitor-only for the admin.
    canEditAvailability: canManuallyUpdateAvailability(a.facility.facilityType),
    apiIntegration: a.facility.apiIntegration
      ? toApiIntegrationStatus(a.facility.apiIntegration)
      : null,
  }));
}

export async function updateAvailability(params: {
  adminProfileId: string;
  adminStatus: AccountStatus | undefined;
  actorUserId: string;
  facilityId: string;
  availableSpaces: number;
}) {
  const facility = await assertActiveAssignment(
    params.adminProfileId,
    params.adminStatus,
    params.facilityId,
  );

  // Business rules 5 & 6: only MANUAL facilities accept manual availability.
  if (!canManuallyUpdateAvailability(facility.facilityType)) {
    throw forbidden(
      'Availability for API-integrated facilities is managed automatically by the sync service.',
    );
  }
  if (params.availableSpaces > facility.totalSpaces) {
    throw badRequest('Available spaces cannot exceed total spaces.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.parkingFacility.update({
      where: { id: facility.id },
      data: { availableSpaces: params.availableSpaces, lastAvailabilityUpdateAt: new Date() },
    });
    await tx.availabilityLog.create({
      data: {
        facilityId: facility.id,
        oldAvailableSpaces: facility.availableSpaces,
        newAvailableSpaces: params.availableSpaces,
        source: 'MANUAL_UPDATE',
        updatedByUserId: params.actorUserId,
      },
    });
    return next;
  });

  await writeAudit({
    actorUserId: params.actorUserId,
    action: AuditActions.AVAILABILITY_UPDATED,
    entityType: 'ParkingFacility',
    entityId: facility.id,
    metadata: { from: facility.availableSpaces, to: params.availableSpaces },
  });

  return toManagedFacility(updated);
}

export async function updatePrice(params: {
  adminProfileId: string;
  adminStatus: AccountStatus | undefined;
  actorUserId: string;
  facilityId: string;
  hourlyPrice: number;
}) {
  const facility = await assertActiveAssignment(
    params.adminProfileId,
    params.adminStatus,
    params.facilityId,
  );

  const updated = await prisma.parkingFacility.update({
    where: { id: facility.id },
    data: { hourlyPrice: params.hourlyPrice },
  });

  await writeAudit({
    actorUserId: params.actorUserId,
    action: AuditActions.PRICE_UPDATED,
    entityType: 'ParkingFacility',
    entityId: facility.id,
    metadata: { from: facility.hourlyPrice, to: params.hourlyPrice },
  });

  return toManagedFacility(updated);
}
