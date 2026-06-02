import { Router } from 'express';
import * as apiIntegrationController from '../controllers/api-integration.controller';
import { asyncHandler } from '../lib/async-handler';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParams } from '../validators/common';
import { updateApiIntegrationSchema } from '../validators/owner.validators';

// Mounted at /api-integrations. Requires authentication; role checked per route.
export const apiIntegrationRouter = Router();
apiIntegrationRouter.use(requireAuth);

// Owner, assigned admin, or system admin may view integration status.
apiIntegrationRouter.get(
  '/:facilityId/status',
  requireRole('FACILITY_OWNER', 'PARKING_ADMIN', 'SYSTEM_ADMIN'),
  validate({ params: uuidParams('facilityId') }),
  asyncHandler(apiIntegrationController.status),
);

// Owner or system admin may trigger a sync.
apiIntegrationRouter.post(
  '/:facilityId/sync',
  requireRole('FACILITY_OWNER', 'SYSTEM_ADMIN'),
  validate({ params: uuidParams('facilityId') }),
  asyncHandler(apiIntegrationController.sync),
);

// Only the facility owner may edit integration settings (UC16).
apiIntegrationRouter.patch(
  '/:facilityId',
  requireRole('FACILITY_OWNER'),
  validate({ params: uuidParams('facilityId'), body: updateApiIntegrationSchema }),
  asyncHandler(apiIntegrationController.update),
);
