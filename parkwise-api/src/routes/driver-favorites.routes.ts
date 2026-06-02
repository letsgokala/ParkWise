import { Router } from 'express';
import * as favoritesController from '../controllers/driver-favorites.controller';
import { asyncHandler } from '../lib/async-handler';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParams } from '../validators/common';
import { favoriteAlertsSchema } from '../validators/favorite.validators';

// Mounted at /driver/favorites. All endpoints require a logged-in registered
// driver (UC4, business rule 8).
export const driverFavoritesRouter = Router();
driverFavoritesRouter.use(requireAuth, requireRole('REGISTERED_DRIVER'));

driverFavoritesRouter.get('/', asyncHandler(favoritesController.list));

driverFavoritesRouter.post(
  '/:facilityId',
  validate({ params: uuidParams('facilityId') }),
  asyncHandler(favoritesController.add),
);

driverFavoritesRouter.delete(
  '/:facilityId',
  validate({ params: uuidParams('facilityId') }),
  asyncHandler(favoritesController.remove),
);

driverFavoritesRouter.patch(
  '/:facilityId/alerts',
  validate({ params: uuidParams('facilityId'), body: favoriteAlertsSchema }),
  asyncHandler(favoritesController.updateAlerts),
);
