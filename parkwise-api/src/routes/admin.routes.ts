import { Router } from 'express';
import { getAssignedFacility, updateAssignedFacility } from '../controllers/admin-facility.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const adminRouter = Router();

adminRouter.get('/admin/facility', authenticate, authorize(['parking_admin']), getAssignedFacility);
adminRouter.patch('/admin/facility', authenticate, authorize(['parking_admin']), updateAssignedFacility);
