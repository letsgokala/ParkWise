import type { Response } from 'express';
import * as parkingAdminService from '../services/parking-admin.service';
import { sendOk } from '../lib/api-response';
import { badRequest } from '../lib/errors';
import type { AuthenticatedRequest } from '../types/auth';

function ctx(req: AuthenticatedRequest) {
  const user = req.authUser!;
  if (!user.adminProfileId) throw badRequest('Parking administrator profile not found.');
  return { adminProfileId: user.adminProfileId, adminStatus: user.adminStatus, actorUserId: user.id };
}

export async function assignedFacilities(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { adminProfileId, adminStatus } = ctx(req);
  sendOk(res, {
    facilities: await parkingAdminService.listAssignedFacilities(adminProfileId, adminStatus),
  });
}

export async function updateAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { adminProfileId, adminStatus, actorUserId } = ctx(req);
  const facility = await parkingAdminService.updateAvailability({
    adminProfileId,
    adminStatus,
    actorUserId,
    facilityId: req.params.facilityId!,
    availableSpaces: req.body.availableSpaces,
  });
  sendOk(res, { facility });
}

export async function updatePrice(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { adminProfileId, adminStatus, actorUserId } = ctx(req);
  const facility = await parkingAdminService.updatePrice({
    adminProfileId,
    adminStatus,
    actorUserId,
    facilityId: req.params.facilityId!,
    hourlyPrice: req.body.hourlyPrice,
  });
  sendOk(res, { facility });
}
