import { Router } from 'express';
import { assignAdmin, createFacility, deleteFacility, getOverview } from '../controllers/sys-admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const sysAdminRouter = Router();

sysAdminRouter.get('/sysadmin/overview', authenticate, authorize(['sys_admin']), getOverview);
sysAdminRouter.post('/sysadmin/facilities', authenticate, authorize(['sys_admin']), createFacility);
sysAdminRouter.delete('/sysadmin/facilities/:id', authenticate, authorize(['sys_admin']), deleteFacility);
sysAdminRouter.post('/sysadmin/assign-admin', authenticate, authorize(['sys_admin']), assignAdmin);
