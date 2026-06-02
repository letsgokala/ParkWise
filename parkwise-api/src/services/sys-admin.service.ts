import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';
import { toManagedFacility } from '../lib/serializers';
import { writeAudit, AuditActions } from './audit.service';
import type { FacilityStatus } from '../lib/rbac/policy';

const facilityWithOwner = {
  owner: { include: { user: true } },
} satisfies Prisma.ParkingFacilityInclude;

type FacilityWithOwner = Prisma.ParkingFacilityGetPayload<{ include: typeof facilityWithOwner }>;

function toFacilityWithOwner(f: FacilityWithOwner) {
  return {
    ...toManagedFacility(f),
    owner: {
      ownerProfileId: f.owner.id,
      organizationName: f.owner.organizationName,
      name: f.owner.user.name,
      email: f.owner.user.email,
    },
  };
}

export async function listPending() {
  const facilities = await prisma.parkingFacility.findMany({
    where: { status: 'PENDING' },
    include: facilityWithOwner,
    orderBy: { createdAt: 'asc' },
  });
  return facilities.map(toFacilityWithOwner);
}

export async function listAllFacilities(status?: FacilityStatus) {
  const facilities = await prisma.parkingFacility.findMany({
    where: status ? { status } : undefined,
    include: facilityWithOwner,
    orderBy: { createdAt: 'desc' },
  });
  return facilities.map(toFacilityWithOwner);
}

export async function getOverview() {
  const [byStatus, totalUsers, totalFacilities] = await Promise.all([
    prisma.parkingFacility.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.count(),
    prisma.parkingFacility.count(),
  ]);

  const stats = { pending: 0, approved: 0, rejected: 0, suspended: 0 };
  for (const row of byStatus) {
    stats[row.status.toLowerCase() as keyof typeof stats] = row._count._all;
  }

  return { totalUsers, totalFacilities, facilitiesByStatus: stats };
}

async function reviewFacility(
  facilityId: string,
  data: Prisma.ParkingFacilityUpdateInput,
  audit: { actorUserId: string; action: string; notes?: string },
) {
  const facility = await prisma.parkingFacility.findUnique({ where: { id: facilityId } });
  if (!facility) throw notFound('Facility not found.');

  const updated = await prisma.parkingFacility.update({
    where: { id: facilityId },
    data,
    include: facilityWithOwner,
  });

  await writeAudit({
    actorUserId: audit.actorUserId,
    action: audit.action,
    entityType: 'ParkingFacility',
    entityId: facilityId,
    metadata: { previousStatus: facility.status, notes: audit.notes ?? null },
  });

  return toFacilityWithOwner(updated);
}

export async function approveFacility(
  sysAdminProfileId: string,
  actorUserId: string,
  facilityId: string,
  notes?: string,
) {
  return reviewFacility(
    facilityId,
    {
      status: 'APPROVED',
      approvedBy: { connect: { id: sysAdminProfileId } },
      approvedAt: new Date(),
      rejectedAt: null,
      suspendedAt: null,
      approvalNotes: notes ?? null,
    },
    { actorUserId, action: AuditActions.FACILITY_APPROVED, notes },
  );
}

export async function rejectFacility(actorUserId: string, facilityId: string, notes?: string) {
  return reviewFacility(
    facilityId,
    { status: 'REJECTED', rejectedAt: new Date(), approvalNotes: notes ?? null },
    { actorUserId, action: AuditActions.FACILITY_REJECTED, notes },
  );
}

export async function suspendFacility(actorUserId: string, facilityId: string, notes?: string) {
  return reviewFacility(
    facilityId,
    { status: 'SUSPENDED', suspendedAt: new Date(), approvalNotes: notes ?? null },
    { actorUserId, action: AuditActions.FACILITY_SUSPENDED, notes },
  );
}

export async function listAuditLogs(limit: number, entityType?: string) {
  const logs = await prisma.auditLog.findMany({
    where: entityType ? { entityType } : undefined,
    include: { actor: { select: { name: true, email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: log.metadata,
    actor: log.actor ? { name: log.actor.name, email: log.actor.email, role: log.actor.role } : null,
    createdAt: log.createdAt.toISOString(),
  }));
}
