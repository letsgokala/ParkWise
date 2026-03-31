import { Router } from 'express';
import { listParkingLocations } from '../controllers/parking.controller';

export const parkingRouter = Router();

parkingRouter.get('/parking-locations', listParkingLocations);
