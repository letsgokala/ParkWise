import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { encryptSecret, hashPassword } from '../lib/crypto';
import { writeAudit, AuditActions } from './audit.service';
import {
  toApiIntegrationStatus,
  toAssignment,
  toManagedFacility,
  toParkingAdminAccount,
} from '../lib/serializers';
import type {
  AssignAdminInput,
  CreateFacilityInput,
  CreateParkingAdminInput,
  ReplaceAssignmentInput,
  UpdateFacilityInput,
} from '../validators/owner.validators';

const assignmentInclude = {
  parkingAdmin: { include: { user: true } },
  facility: true,
} satisfies Prisma.ParkingAdminAssignmentInclude;

// --- Ownership guards (business rule 3) ------------------------------------

async function assertOwnsFacility(ownerProfileId: string, facilityId: string) {
  const facility = await prisma.parkingFacility.findUnique({ where: { id: facilityId } });
  if (!facility) throw notFound('Facility not found.');
  if (facility.ownerId !== ownerProfileId) throw forbidden('You do not own this facility.');
  return facility;
}

async function assertOwnsAdmin(ownerProfileId: string, adminProfileId: string) {
  const admin = await prisma.parkingAdminProfile.findUnique({ where: { id: adminProfileId } });
  if (!admin) throw notFound('Parking administrator not found.');
  if (admin.createdByOwnerId !== ownerProfileId) throw forbidden('You do not manage this administrator.');
  return admin;
}

async function assertOwnsAssignment(ownerProfileId: string, assignmentId: string) {
  const assignment = await prisma.parkingAdminAssignment.findUnique({
    where: { id: assignmentId },
    include: { facility: true },
  });
  if (!assignment) throw notFound('Assignment not found.');
  if (assignment.facility.ownerId !== ownerProfileId) {
    throw forbidden('You do not manage this assignment.');
  }
  return assignment;
}

// --- Facilities ------------------------------------------------------------

export async function getDashboard(ownerProfileId: string) {
  const [facilities, admins] = await Promise.all([
    prisma.parkingFacility.findMany({ where: { ownerId: ownerProfileId }, orderBy: { createdAt: 'desc' } }),
    listParkingAdmins(ownerProfileId),
  ]);

  const stats = facilities.reduce(
    (acc, f) => {
      acc.total += 1;
      acc[f.status.toLowerCase() as 'pending' | 'approved' | 'rejected' | 'suspended'] += 1;
      return acc;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0, suspended: 0 },
  );

  return { facilities: facilities.map(toManagedFacility), stats, admins };
}

export async function listFacilities(ownerProfileId: string) {
  const facilities = await prisma.parkingFacility.findMany({
    where: { ownerId: ownerProfileId },
    orderBy: { createdAt: 'desc' },
  });
  return facilities.map(toManagedFacility);
}

/** All assignments (current + historical) across the owner's facilities. */
export async function listAssignments(ownerProfileId: string) {
  const assignments = await prisma.parkingAdminAssignment.findMany({
    where: { facility: { ownerId: ownerProfileId } },
    include: assignmentInclude,
    orderBy: [{ status: 'asc' }, { assignedAt: 'desc' }],
  });
  return assignments.map(toAssignment);
}

export async function getFacilityDetail(ownerProfileId: string, facilityId: string) {
  const facility = await assertOwnsFacility(ownerProfileId, facilityId);
  const [assignments, api] = await Promise.all([
    prisma.parkingAdminAssignment.findMany({
      where: { facilityId },
      include: assignmentInclude,
      orderBy: [{ status: 'asc' }, { assignedAt: 'desc' }],
    }),
    facility.facilityType === 'API_INTEGRATED'
      ? prisma.apiIntegration.findUnique({ where: { facilityId } })
      : Promise.resolve(null),
  ]);

  return {
    facility: toManagedFacility(facility),
    assignments: assignments.map(toAssignment),
    apiIntegration: api ? toApiIntegrationStatus(api) : null,
  };
}

export async function createFacility(
  ownerProfileId: string,
  actorUserId: string,
  input: CreateFacilityInput,
) {
  const facility = await prisma.$transaction(async (tx) => {
    const created = await tx.parkingFacility.create({
      data: {
        ownerId: ownerProfileId,
        name: input.name,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        totalSpaces: input.totalSpaces,
        availableSpaces: input.availableSpaces,
        facilityType: input.facilityType,
        hourlyPrice: input.hourlyPrice,
        congestionLevel: input.congestionLevel,
        status: 'PENDING', // business rule 11
        lastAvailabilityUpdateAt: new Date(),
      },
    });

    if (input.facilityType === 'API_INTEGRATED' && input.api) {
      await tx.apiIntegration.create({
        data: {
          facilityId: created.id,
          endpointUrl: input.api.endpointUrl,
          authToken: encryptSecret(input.api.authToken),
          refreshIntervalSeconds: input.api.refreshIntervalSeconds,
          isEnabled: true,
        },
      });
    }

    await tx.availabilityLog.create({
      data: {
        facilityId: created.id,
        oldAvailableSpaces: 0,
        newAvailableSpaces: input.availableSpaces,
        source: 'SEED',
        updatedByUserId: actorUserId,
      },
    });

    return created;
  });

  await writeAudit({
    actorUserId,
    action: AuditActions.FACILITY_CREATED,
    entityType: 'ParkingFacility',
    entityId: facility.id,
    metadata: { name: facility.name, facilityType: facility.facilityType },
  });

  return toManagedFacility(facility);
}

export async function updateFacility(
  ownerProfileId: string,
  actorUserId: string,
  facilityId: string,
  input: UpdateFacilityInput,
) {
  const facility = await assertOwnsFacility(ownerProfileId, facilityId);

  const data: Prisma.ParkingFacilityUpdateInput = { ...input };
  // Keep availableSpaces consistent if capacity shrinks below current count.
  if (input.totalSpaces !== undefined && input.totalSpaces < facility.availableSpaces) {
    data.availableSpaces = input.totalSpaces;
  }

  const updated = await prisma.parkingFacility.update({ where: { id: facilityId }, data });

  await writeAudit({
    actorUserId,
    action: AuditActions.FACILITY_UPDATED,
    entityType: 'ParkingFacility',
    entityId: facilityId,
    metadata: { ...input },
  });

  return toManagedFacility(updated);
}

// --- Parking administrators ------------------------------------------------

export async function listParkingAdmins(ownerProfileId: string) {
  const admins = await prisma.parkingAdminProfile.findMany({
    where: { createdByOwnerId: ownerProfileId },
    include: { user: true, assignments: { include: { facility: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return admins.map(toParkingAdminAccount);
}

export async function createParkingAdmin(
  ownerProfileId: string,
  actorUserId: string,
  input: CreateParkingAdminInput,
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict('That email is already in use.');

  const passwordHash = await hashPassword(input.temporaryPassword);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phoneNumber: input.phoneNumber,
      passwordHash,
      role: 'PARKING_ADMIN',
      adminProfile: { create: { createdByOwnerId: ownerProfileId, adminStatus: 'ACTIVE' } },
    },
    include: { adminProfile: true },
  });

  const profile = await prisma.parkingAdminProfile.findUniqueOrThrow({
    where: { id: user.adminProfile!.id },
    include: { user: true, assignments: { include: { facility: true } } },
  });

  await writeAudit({
    actorUserId,
    action: AuditActions.ADMIN_CREATED,
    entityType: 'ParkingAdminProfile',
    entityId: profile.id,
    metadata: { email: input.email },
  });

  return toParkingAdminAccount(profile);
}

// --- Assignment lifecycle (UC14) -------------------------------------------

export async function assignAdmin(
  ownerProfileId: string,
  actorUserId: string,
  facilityId: string,
  input: AssignAdminInput,
) {
  await assertOwnsFacility(ownerProfileId, facilityId);
  const admin = await assertOwnsAdmin(ownerProfileId, input.parkingAdminId);
  if (admin.adminStatus !== 'ACTIVE') {
    throw badRequest('Cannot assign a suspended or removed administrator.');
  }

  const duplicate = await prisma.parkingAdminAssignment.findFirst({
    where: { parkingAdminId: admin.id, facilityId, status: 'ACTIVE' },
  });
  if (duplicate) {
    throw conflict('This administrator is already actively assigned to this facility.');
  }

  const assignment = await prisma.parkingAdminAssignment.create({
    data: {
      parkingAdminId: admin.id,
      facilityId,
      status: 'ACTIVE',
      createdByOwnerId: ownerProfileId,
      notes: input.notes,
    },
    include: assignmentInclude,
  });

  await writeAudit({
    actorUserId,
    action: AuditActions.ADMIN_ASSIGNED,
    entityType: 'ParkingAdminAssignment',
    entityId: assignment.id,
    metadata: { facilityId, parkingAdminId: admin.id },
  });

  return toAssignment(assignment);
}

export async function suspendAssignment(ownerProfileId: string, actorUserId: string, assignmentId: string) {
  const assignment = await assertOwnsAssignment(ownerProfileId, assignmentId);
  if (assignment.status !== 'ACTIVE') {
    throw badRequest('Only active assignments can be suspended.');
  }

  const updated = await prisma.parkingAdminAssignment.update({
    where: { id: assignmentId },
    data: { status: 'SUSPENDED', suspendedAt: new Date() },
    include: assignmentInclude,
  });

  await writeAudit({
    actorUserId,
    action: AuditActions.ADMIN_SUSPENDED,
    entityType: 'ParkingAdminAssignment',
    entityId: assignmentId,
    metadata: { facilityId: assignment.facilityId },
  });

  return toAssignment(updated);
}

export async function removeAssignment(ownerProfileId: string, actorUserId: string, assignmentId: string) {
  const assignment = await assertOwnsAssignment(ownerProfileId, assignmentId);
  if (assignment.status === 'REMOVED') {
    throw badRequest('This assignment has already been removed.');
  }

  const updated = await prisma.parkingAdminAssignment.update({
    where: { id: assignmentId },
    data: { status: 'REMOVED', removedAt: new Date() },
    include: assignmentInclude,
  });

  await writeAudit({
    actorUserId,
    action: AuditActions.ADMIN_REMOVED,
    entityType: 'ParkingAdminAssignment',
    entityId: assignmentId,
    metadata: { facilityId: assignment.facilityId },
  });

  return toAssignment(updated);
}

/**
 * Replace an administrator: mark the existing assignment REMOVED and create a
 * fresh ACTIVE assignment for the new admin on the same facility, linking the
 * two for history (UC14).
 */
export async function replaceAssignment(
  ownerProfileId: string,
  actorUserId: string,
  assignmentId: string,
  input: ReplaceAssignmentInput,
) {
  const oldAssignment = await assertOwnsAssignment(ownerProfileId, assignmentId);
  if (oldAssignment.status === 'REMOVED') {
    throw badRequest('A removed assignment cannot be replaced.');
  }

  const newAdmin = await assertOwnsAdmin(ownerProfileId, input.newParkingAdminId);
  if (newAdmin.adminStatus !== 'ACTIVE') {
    throw badRequest('The replacement administrator is suspended or removed.');
  }

  const duplicate = await prisma.parkingAdminAssignment.findFirst({
    where: { parkingAdminId: newAdmin.id, facilityId: oldAssignment.facilityId, status: 'ACTIVE' },
  });
  if (duplicate) {
    throw conflict('The replacement administrator is already assigned to this facility.');
  }

  const created = await prisma.$transaction(async (tx) => {
    const newAssignment = await tx.parkingAdminAssignment.create({
      data: {
        parkingAdminId: newAdmin.id,
        facilityId: oldAssignment.facilityId,
        status: 'ACTIVE',
        createdByOwnerId: ownerProfileId,
        notes: input.notes,
      },
    });
    await tx.parkingAdminAssignment.update({
      where: { id: assignmentId },
      data: { status: 'REMOVED', removedAt: new Date(), replacedByAssignmentId: newAssignment.id },
    });
    return newAssignment;
  });

  const full = await prisma.parkingAdminAssignment.findUniqueOrThrow({
    where: { id: created.id },
    include: assignmentInclude,
  });

  await writeAudit({
    actorUserId,
    action: AuditActions.ADMIN_REPLACED,
    entityType: 'ParkingAdminAssignment',
    entityId: created.id,
    metadata: { replacedAssignmentId: assignmentId, facilityId: oldAssignment.facilityId },
  });

  return toAssignment(full);
}
