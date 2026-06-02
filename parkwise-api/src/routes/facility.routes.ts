import { Router } from 'express';
import * as facilityController from '../controllers/facility.controller';
import { asyncHandler } from '../lib/async-handler';
import { optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParams } from '../validators/common';
import {
  nearbyQuerySchema,
  rankQuerySchema,
  searchQuerySchema,
} from '../validators/facility.validators';

// Public, guest-accessible facility discovery. Specific paths are declared
// before the `:id` param route so they are not captured by it.
export const facilityRouter = Router();

facilityRouter.get(
  '/facilities/nearby',
  validate({ query: nearbyQuerySchema }),
  asyncHandler(facilityController.nearby),
);

facilityRouter.get(
  '/facilities/search',
  validate({ query: searchQuerySchema }),
  asyncHandler(facilityController.search),
);

facilityRouter.get(
  '/facilities/rank',
  optionalAuth,
  validate({ query: rankQuerySchema }),
  asyncHandler(facilityController.rank),
);

facilityRouter.get(
  '/facilities/:id',
  validate({ params: uuidParams('id') }),
  asyncHandler(facilityController.detail),
);
