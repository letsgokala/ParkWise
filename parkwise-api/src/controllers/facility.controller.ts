import type { Request, Response } from 'express';
import * as facilityService from '../services/facility.service';
import { sendOk } from '../lib/api-response';
import type { AuthenticatedRequest } from '../types/auth';
import type { NearbyQuery, RankQuery, SearchQuery } from '../validators/facility.validators';

export async function nearby(req: Request, res: Response): Promise<void> {
  const { lat, lng, radiusKm } = req.query as unknown as NearbyQuery;
  sendOk(res, { facilities: await facilityService.listNearby({ lat, lng }, radiusKm) });
}

export async function search(req: Request, res: Response): Promise<void> {
  sendOk(res, { facilities: await facilityService.searchFacilities(req.query as unknown as SearchQuery) });
}

export async function rank(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { lat, lng, radiusKm } = req.query as unknown as RankQuery;
  // Only log recommendations for an authenticated registered driver.
  const driverProfileId =
    req.authUser?.role === 'REGISTERED_DRIVER' ? req.authUser.driverProfileId : undefined;
  sendOk(res, {
    recommendations: await facilityService.rankNearby({ origin: { lat, lng }, radiusKm, driverProfileId }),
  });
}

export async function detail(req: Request, res: Response): Promise<void> {
  sendOk(res, { facility: await facilityService.getPublicFacility(req.params.id!) });
}
