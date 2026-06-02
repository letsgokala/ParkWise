import { Router } from 'express';
import * as parkingAdminController from '../controllers/parking-admin.controller';
import { asyncHandler } from '../lib/async-handler';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParams } from '../validators/common';
import { updateAvailabilitySchema, updatePriceSchema } from '../validators/parking-admin.validators';

// Mounted at /parking-admin. Requires an authenticated PARKING_ADMIN.
export const parkingAdminRouter = Router();
parkingAdminRouter.use(requireAuth, requireRole('PARKING_ADMIN'));

parkingAdminRouter.get('/assigned-facilities', asyncHandler(parkingAdminController.assignedFacilities));

parkingAdminRouter.patch(
  '/facilities/:facilityId/availability',
  validate({ params: uuidParams('facilityId'), body: updateAvailabilitySchema }),
  asyncHandler(parkingAdminController.updateAvailability),
);

parkingAdminRouter.patch(
  '/facilities/:facilityId/price',
  validate({ params: uuidParams('facilityId'), body: updatePriceSchema }),
  asyncHandler(parkingAdminController.updatePrice),
);
