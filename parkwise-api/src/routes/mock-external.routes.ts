import { Router } from 'express';
import * as mockController from '../controllers/mock-external.controller';
import { asyncHandler } from '../lib/async-handler';
import { validate } from '../middleware/validate.middleware';
import { uuidParams } from '../validators/common';
import { setMockAvailabilitySchema } from '../validators/mock.validators';

// Stands in for a third-party "smart parking" provider during development.
export const mockExternalRouter = Router();

mockExternalRouter.get(
  '/mock-external-parking/:facilityId/availability',
  validate({ params: uuidParams('facilityId') }),
  asyncHandler(mockController.read),
);

mockExternalRouter.post(
  '/mock-external-parking/:facilityId/availability',
  validate({ params: uuidParams('facilityId'), body: setMockAvailabilitySchema }),
  asyncHandler(mockController.simulate),
);
