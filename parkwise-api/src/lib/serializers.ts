import { Prisma } from '@prisma/client';
import type {
  ApiIntegration,
  AvailabilityLog,
  FavoriteParkingFacility,
  ParkingFacility,
} from '@prisma/client';
import { round } from './geo/haversine';

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/**
 * Driver-facing facility shape. Never exposes owner internals, approval notes,
 * or API tokens.
 */
export function toPublicFacility(f: ParkingFacility) {
  const occupancyRate =
    f.totalSpaces > 0 ? round(1 - f.availableSpaces / f.totalSpaces, 3) : 0;
  return {
    id: f.id,
    name: f.name,
    address: f.address,
    latitude: f.latitude,
    longitude: f.longitude,
    totalSpaces: f.totalSpaces,
    availableSpaces: f.availableSpaces,
    hourlyPrice: f.hourlyPrice,
    facilityType: f.facilityType,
    congestionLevel: f.congestionLevel,
    status: f.status,
    occupancyRate,
    isFull: f.availableSpaces <= 0,
    lastAvailabilityUpdateAt: iso(f.lastAvailabilityUpdateAt),
    createdAt: iso(f.createdAt),
  };
}

/** Owner / admin / system-admin view: adds ownership + approval metadata. */
export function toManagedFacility(f: ParkingFacility) {
  return {
    ...toPublicFacility(f),
    ownerId: f.ownerId,
    approvalNotes: f.approvalNotes,
    approvedBySystemAdminId: f.approvedBySystemAdminId,
    approvedAt: iso(f.approvedAt),
    rejectedAt: iso(f.rejectedAt),
    suspendedAt: iso(f.suspendedAt),
    updatedAt: iso(f.updatedAt),
  };
}

type FavoriteWithFacility = Prisma.FavoriteParkingFacilityGetPayload<{
  include: { facility: true };
}>;

export function toFavorite(fav: FavoriteWithFacility) {
  return {
    id: fav.id,
    facilityId: fav.facilityId,
    notifyOnAvailability: fav.notifyOnAvailability,
    notifyOnPriceDrop: fav.notifyOnPriceDrop,
    createdAt: iso(fav.createdAt),
    facility: toPublicFacility(fav.facility),
  };
}

type AssignmentWithRelations = Prisma.ParkingAdminAssignmentGetPayload<{
  include: {
    parkingAdmin: { include: { user: true } };
    facility: true;
  };
}>;

export function toAssignment(a: AssignmentWithRelations) {
  return {
    id: a.id,
    facilityId: a.facilityId,
    facilityName: a.facility.name,
    parkingAdminId: a.parkingAdminId,
    adminName: a.parkingAdmin.user.name,
    adminEmail: a.parkingAdmin.user.email,
    status: a.status,
    notes: a.notes,
    assignedAt: iso(a.assignedAt),
    suspendedAt: iso(a.suspendedAt),
    removedAt: iso(a.removedAt),
    replacedByAssignmentId: a.replacedByAssignmentId,
    createdAt: iso(a.createdAt),
  };
}

type AdminProfileWithUser = Prisma.ParkingAdminProfileGetPayload<{
  include: { user: true; assignments: { include: { facility: true } } };
}>;

export function toParkingAdminAccount(p: AdminProfileWithUser) {
  return {
    id: p.id,
    userId: p.userId,
    name: p.user.name,
    email: p.user.email,
    phoneNumber: p.user.phoneNumber,
    adminStatus: p.adminStatus,
    createdAt: iso(p.createdAt),
    activeAssignments: p.assignments
      .filter((a) => a.status === 'ACTIVE')
      .map((a) => ({ assignmentId: a.id, facilityId: a.facilityId, facilityName: a.facility.name })),
  };
}

/** API integration status — deliberately omits the (encrypted) auth token. */
export function toApiIntegrationStatus(i: ApiIntegration) {
  return {
    id: i.id,
    facilityId: i.facilityId,
    endpointUrl: i.endpointUrl,
    refreshIntervalSeconds: i.refreshIntervalSeconds,
    isEnabled: i.isEnabled,
    hasToken: Boolean(i.authToken),
    lastSyncAt: iso(i.lastSyncAt),
    lastSyncStatus: i.lastSyncStatus,
    lastSyncError: i.lastSyncError,
    createdAt: iso(i.createdAt),
    updatedAt: iso(i.updatedAt),
  };
}

export function toAvailabilityLog(log: AvailabilityLog) {
  return {
    id: log.id,
    facilityId: log.facilityId,
    oldAvailableSpaces: log.oldAvailableSpaces,
    newAvailableSpaces: log.newAvailableSpaces,
    source: log.source,
    updatedByUserId: log.updatedByUserId,
    createdAt: iso(log.createdAt),
  };
}
