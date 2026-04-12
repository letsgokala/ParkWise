import { Router } from 'express';
import { createDriverFavorite, deleteDriverFavorite, listDriverFavorites } from '../controllers/driver-favorites.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const driverFavoritesRouter = Router();

driverFavoritesRouter.get('/driver/favorites', authenticate, authorize(['driver']), listDriverFavorites);
driverFavoritesRouter.post('/driver/favorites', authenticate, authorize(['driver']), createDriverFavorite);
driverFavoritesRouter.delete('/driver/favorites/:facilityId', authenticate, authorize(['driver']), deleteDriverFavorite);
