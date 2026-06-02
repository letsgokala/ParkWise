import type { Response } from 'express';
import * as sysAdminService from '../services/sys-admin.service';
import { sendOk } from '../lib/api-response';
import { badRequest } from '../lib/errors';
import type { AuthenticatedRequest } from '../types/auth';
import type { AuditQuery, FacilityStatusQuery } from '../validators/sys-admin.validators';

function ctx(req: AuthenticatedRequest) {
  const user = req.authUser!;
  if (!user.sysAdminProfileId) throw badRequest('System administrator profile not found.');
  return { sysAdminProfileId: user.sysAdminProfileId, actorUserId: user.id };
}

export async function pending(_req: AuthenticatedRequest, res: Response): Promise<void> {
  sendOk(res, { facilities: await sysAdminService.listPending() });
}

export async function listFacilities(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { status } = req.query as unknown as FacilityStatusQuery;
  sendOk(res, { facilities: await sysAdminService.listAllFacilities(status) });
}

export async function overview(_req: AuthenticatedRequest, res: Response): Promise<void> {
  sendOk(res, await sysAdminService.getOverview());
}

export async function approve(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { sysAdminProfileId, actorUserId } = ctx(req);
  const facility = await sysAdminService.approveFacility(
    sysAdminProfileId,
    actorUserId,
    req.params.id!,
    req.body?.notes,
  );
  sendOk(res, { facility });
}

export async function reject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { actorUserId } = ctx(req);
  const facility = await sysAdminService.rejectFacility(actorUserId, req.params.id!, req.body?.notes);
  sendOk(res, { facility });
}

export async function suspend(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { actorUserId } = ctx(req);
  const facility = await sysAdminService.suspendFacility(actorUserId, req.params.id!, req.body?.notes);
  sendOk(res, { facility });
}

export async function auditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { limit, entityType } = req.query as unknown as AuditQuery;
  sendOk(res, { logs: await sysAdminService.listAuditLogs(limit, entityType) });
}
