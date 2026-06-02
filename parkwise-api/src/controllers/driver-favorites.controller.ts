import type { Response } from 'express';
import * as favoriteService from '../services/favorite.service';
import { sendOk } from '../lib/api-response';
import { badRequest } from '../lib/errors';
import type { AuthenticatedRequest } from '../types/auth';

function driverId(req: AuthenticatedRequest): string {
  const id = req.authUser?.driverProfileId;
  if (!id) throw badRequest('Driver profile not found for this account.');
  return id;
}

export async function list(req: AuthenticatedRequest, res: Response): Promise<void> {
  sendOk(res, await favoriteService.listFavorites(driverId(req)));
}

export async function add(req: AuthenticatedRequest, res: Response): Promise<void> {
  const favorite = await favoriteService.addFavorite(driverId(req), req.params.facilityId!);
  sendOk(res, { favorite }, 201);
}

export async function remove(req: AuthenticatedRequest, res: Response): Promise<void> {
  await favoriteService.removeFavorite(driverId(req), req.params.facilityId!);
  sendOk(res, { removed: true });
}

export async function updateAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
  const favorite = await favoriteService.updateFavoriteAlerts(
    driverId(req),
    req.params.facilityId!,
    req.body,
  );
  sendOk(res, { favorite });
}
