import type { NextFunction, Response } from 'express';
import { DriverFavoritesService } from '../services/driver-favorites.service';
import { AuthenticatedRequest } from '../types/auth.types';

const driverFavoritesService = new DriverFavoritesService();

export const listDriverFavorites = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const response = await driverFavoritesService.listFavorites(req.user!.uid);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const createDriverFavorite = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const favorite = await driverFavoritesService.addFavorite(req.user!.uid, req.body);
    res.status(201).json({ favorite });
  } catch (error) {
    next(error);
  }
};

export const deleteDriverFavorite = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await driverFavoritesService.removeFavorite(req.user!.uid, req.params.facilityId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateDriverFavoriteAlerts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const favorite = await driverFavoritesService.updateAlerts(req.user!.uid, req.params.facilityId, req.body);
    res.json({ favorite });
  } catch (error) {
    next(error);
  }
};
