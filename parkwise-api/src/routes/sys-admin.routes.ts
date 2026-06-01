import { Router } from 'express';
import * as sysAdminController from '../controllers/sys-admin.controller';
import { asyncHandler } from '../lib/async-handler';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParams } from '../validators/common';
import {
  auditQuerySchema,
  facilityStatusQuerySchema,
  reviewSchema,
} from '../validators/sys-admin.validators';

// Mounted at /system-admin. Requires an authenticated SYSTEM_ADMIN.
export const sysAdminRouter = Router();
sysAdminRouter.use(requireAuth, requireRole('SYSTEM_ADMIN'));

sysAdminRouter.get('/overview', asyncHandler(sysAdminController.overview));
sysAdminRouter.get('/facilities/pending', asyncHandler(sysAdminController.pending));
sysAdminRouter.get(
  '/facilities',
  validate({ query: facilityStatusQuerySchema }),
  asyncHandler(sysAdminController.listFacilities),
);

sysAdminRouter.patch(
  '/facilities/:id/approve',
  validate({ params: uuidParams('id'), body: reviewSchema }),
  asyncHandler(sysAdminController.approve),
);
sysAdminRouter.patch(
  '/facilities/:id/reject',
  validate({ params: uuidParams('id'), body: reviewSchema }),
  asyncHandler(sysAdminController.reject),
);
sysAdminRouter.patch(
  '/facilities/:id/suspend',
  validate({ params: uuidParams('id'), body: reviewSchema }),
  asyncHandler(sysAdminController.suspend),
);

sysAdminRouter.get(
  '/audit-logs',
  validate({ query: auditQuerySchema }),
  asyncHandler(sysAdminController.auditLogs),
);
