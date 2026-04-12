import { Router } from 'express';
import {
  createDriverFavorite,
  deleteDriverFavorite,
  listDriverFavorites,
  updateDriverFavoriteAlerts,
} from '../controllers/driver-favorites.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const driverFavoritesRouter = Router();

driverFavoritesRouter.get('/driver/favorites', authenticate, authorize(['driver']), listDriverFavorites);
driverFavoritesRouter.post('/driver/favorites', authenticate, authorize(['driver']), createDriverFavorite);
driverFavoritesRouter.patch('/driver/favorites/:facilityId/alerts', authenticate, authorize(['driver']), updateDriverFavoriteAlerts);
driverFavoritesRouter.delete('/driver/favorites/:facilityId', authenticate, authorize(['driver']), deleteDriverFavorite);
