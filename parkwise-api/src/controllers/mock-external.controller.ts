import type { Request, Response } from 'express';
import * as mockService from '../services/mock-external.service';
import { unauthenticated } from '../lib/errors';

/**
 * Simulated external provider. Returns RAW (non-enveloped) bodies on purpose —
 * it mimics a third-party API, which is exactly what the sync service consumes.
 */
export async function read(req: Request, res: Response): Promise<void> {
  // A real external API would authenticate the caller; require a token header.
  if (!req.get('x-api-token')) {
    throw unauthenticated('Missing API token.');
  }
  res.json(await mockService.readMockAvailability(req.params.facilityId!));
}

export async function simulate(req: Request, res: Response): Promise<void> {
  res.json(await mockService.applySimulatedAvailability(req.params.facilityId!, req.body.availableSpaces));
}
