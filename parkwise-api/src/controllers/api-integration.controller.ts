import type { Response } from 'express';
import * as apiIntegrationService from '../services/api-integration.service';
import { sendOk } from '../lib/api-response';
import { badRequest } from '../lib/errors';
import type { AuthenticatedRequest } from '../types/auth';

function requester(req: AuthenticatedRequest): apiIntegrationService.Requester {
  const u = req.authUser!;
  return {
    role: u.role,
    actorUserId: u.id,
    ownerProfileId: u.ownerProfileId,
    adminProfileId: u.adminProfileId,
    sysAdminProfileId: u.sysAdminProfileId,
  };
}

export async function status(req: AuthenticatedRequest, res: Response): Promise<void> {
  sendOk(res, await apiIntegrationService.getStatus(req.params.facilityId!, requester(req)));
}

export async function sync(req: AuthenticatedRequest, res: Response): Promise<void> {
  sendOk(res, await apiIntegrationService.syncAvailability(req.params.facilityId!, requester(req)));
}

export async function update(req: AuthenticatedRequest, res: Response): Promise<void> {
  const u = req.authUser!;
  if (!u.ownerProfileId) throw badRequest('Owner profile not found for this account.');
  sendOk(res, await apiIntegrationService.updateIntegration(req.params.facilityId!, u.ownerProfileId, u.id, req.body));
}
