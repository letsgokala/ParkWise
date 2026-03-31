import type { NextFunction, Response } from 'express';
import { AdminFacilityService } from '../services/admin-facility.service';
import { AuthenticatedRequest } from '../types/auth.types';

const adminFacilityService = new AdminFacilityService();

export const getAssignedFacility = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const facility = await adminFacilityService.getAssignedFacility(req.user!.uid);
    res.json({ facility });
  } catch (error) {
    next(error);
  }
};

export const updateAssignedFacility = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const facility = await adminFacilityService.updateAssignedFacility(req.user!.uid, req.body);
    res.json({ facility });
  } catch (error) {
    next(error);
  }
};
