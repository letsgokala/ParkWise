import type { Response } from 'express';
import * as ownerService from '../services/owner.service';
import { sendOk } from '../lib/api-response';
import { badRequest } from '../lib/errors';
import type { AuthenticatedRequest } from '../types/auth';

function ctx(req: AuthenticatedRequest): { ownerProfileId: string; actorUserId: string } {
  const user = req.authUser!;
  if (!user.ownerProfileId) throw badRequest('Owner profile not found for this account.');
  return { ownerProfileId: user.ownerProfileId, actorUserId: user.id };
}

export async function dashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  sendOk(res, await ownerService.getDashboard(ctx(req).ownerProfileId));
}

export async function listFacilities(req: AuthenticatedRequest, res: Response): Promise<void> {
  sendOk(res, { facilities: await ownerService.listFacilities(ctx(req).ownerProfileId) });
}

export async function listAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
  sendOk(res, { assignments: await ownerService.listAssignments(ctx(req).ownerProfileId) });
}

export async function getFacility(req: AuthenticatedRequest, res: Response): Promise<void> {
  sendOk(res, await ownerService.getFacilityDetail(ctx(req).ownerProfileId, req.params.id!));
}

export async function createFacility(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { ownerProfileId, actorUserId } = ctx(req);
  const facility = await ownerService.createFacility(ownerProfileId, actorUserId, req.body);
  sendOk(res, { facility }, 201);
}

export async function updateFacility(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { ownerProfileId, actorUserId } = ctx(req);
  const facility = await ownerService.updateFacility(ownerProfileId, actorUserId, req.params.id!, req.body);
  sendOk(res, { facility });
}

export async function listParkingAdmins(req: AuthenticatedRequest, res: Response): Promise<void> {
  sendOk(res, { admins: await ownerService.listParkingAdmins(ctx(req).ownerProfileId) });
}

export async function createParkingAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { ownerProfileId, actorUserId } = ctx(req);
  const admin = await ownerService.createParkingAdmin(ownerProfileId, actorUserId, req.body);
  sendOk(res, { admin }, 201);
}

export async function assignAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { ownerProfileId, actorUserId } = ctx(req);
  const assignment = await ownerService.assignAdmin(ownerProfileId, actorUserId, req.params.facilityId!, req.body);
  sendOk(res, { assignment }, 201);
}

export async function suspendAssignment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { ownerProfileId, actorUserId } = ctx(req);
  const assignment = await ownerService.suspendAssignment(ownerProfileId, actorUserId, req.params.assignmentId!);
  sendOk(res, { assignment });
}

export async function removeAssignment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { ownerProfileId, actorUserId } = ctx(req);
  const assignment = await ownerService.removeAssignment(ownerProfileId, actorUserId, req.params.assignmentId!);
  sendOk(res, { assignment });
}

export async function replaceAssignment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { ownerProfileId, actorUserId } = ctx(req);
  const assignment = await ownerService.replaceAssignment(
    ownerProfileId,
    actorUserId,
    req.params.assignmentId!,
    req.body,
  );
  sendOk(res, { assignment }, 201);
}
