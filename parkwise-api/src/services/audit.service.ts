import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Append-only audit trail for sensitive actions (facility approval/rejection/
 * suspension, admin assignment changes, availability updates, etc.). Failures
 * are swallowed so an audit write can never break the primary operation.
 */
export async function writeAudit(params: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error('[audit] failed to write audit log', error);
  }
}

export const AuditActions = {
  FACILITY_APPROVED: 'FACILITY_APPROVED',
  FACILITY_REJECTED: 'FACILITY_REJECTED',
  FACILITY_SUSPENDED: 'FACILITY_SUSPENDED',
  FACILITY_CREATED: 'FACILITY_CREATED',
  FACILITY_UPDATED: 'FACILITY_UPDATED',
  ADMIN_CREATED: 'PARKING_ADMIN_CREATED',
  ADMIN_ASSIGNED: 'PARKING_ADMIN_ASSIGNED',
  ADMIN_SUSPENDED: 'PARKING_ADMIN_SUSPENDED',
  ADMIN_REMOVED: 'PARKING_ADMIN_REMOVED',
  ADMIN_REPLACED: 'PARKING_ADMIN_REPLACED',
  AVAILABILITY_UPDATED: 'AVAILABILITY_UPDATED',
  PRICE_UPDATED: 'PRICE_UPDATED',
  API_SYNCED: 'API_INTEGRATION_SYNCED',
} as const;
