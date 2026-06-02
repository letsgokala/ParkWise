import type { Request, Response } from 'express';
import * as navigationService from '../services/navigation.service';
import { sendOk } from '../lib/api-response';
import type { RouteQuery } from '../validators/navigation.validators';

export async function route(req: Request, res: Response): Promise<void> {
  const { fromLat, fromLng, toLat, toLng } = req.query as unknown as RouteQuery;
  const result = await navigationService.getRoute(
    { lat: fromLat, lng: fromLng },
    { lat: toLat, lng: toLng },
  );
  sendOk(res, { route: result });
}
