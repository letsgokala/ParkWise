import type { NextFunction, Request, Response } from 'express';
import { ParkingService } from '../services/parking.service';

const parkingService = new ParkingService();

export const listParkingLocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statuses = typeof req.query.statuses === 'string' ? req.query.statuses.split(',') : [];
    const facilities = await parkingService.listFacilities(statuses);
    res.json({ facilities });
  } catch (error) {
    next(error);
  }
};
