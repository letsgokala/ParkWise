import { Router } from 'express';
import * as ownerController from '../controllers/owner.controller';
import { asyncHandler } from '../lib/async-handler';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParams } from '../validators/common';
import {
  assignAdminSchema,
  createFacilitySchema,
  createParkingAdminSchema,
  replaceAssignmentSchema,
  updateFacilitySchema,
} from '../validators/owner.validators';

// Mounted at /owner. All endpoints require an authenticated FACILITY_OWNER.
export const ownerRouter = Router();
ownerRouter.use(requireAuth, requireRole('FACILITY_OWNER'));

ownerRouter.get('/dashboard', asyncHandler(ownerController.dashboard));

ownerRouter.get('/facilities', asyncHandler(ownerController.listFacilities));
ownerRouter.post(
  '/facilities',
  validate({ body: createFacilitySchema }),
  asyncHandler(ownerController.createFacility),
);
ownerRouter.get(
  '/facilities/:id',
  validate({ params: uuidParams('id') }),
  asyncHandler(ownerController.getFacility),
);
ownerRouter.patch(
  '/facilities/:id',
  validate({ params: uuidParams('id'), body: updateFacilitySchema }),
  asyncHandler(ownerController.updateFacility),
);

ownerRouter.get('/assignments', asyncHandler(ownerController.listAssignments));

ownerRouter.get('/parking-admins', asyncHandler(ownerController.listParkingAdmins));
ownerRouter.post(
  '/parking-admins',
  validate({ body: createParkingAdminSchema }),
  asyncHandler(ownerController.createParkingAdmin),
);

ownerRouter.post(
  '/facilities/:facilityId/assign-admin',
  validate({ params: uuidParams('facilityId'), body: assignAdminSchema }),
  asyncHandler(ownerController.assignAdmin),
);

ownerRouter.patch(
  '/assignments/:assignmentId/suspend',
  validate({ params: uuidParams('assignmentId') }),
  asyncHandler(ownerController.suspendAssignment),
);
ownerRouter.patch(
  '/assignments/:assignmentId/remove',
  validate({ params: uuidParams('assignmentId') }),
  asyncHandler(ownerController.removeAssignment),
);
ownerRouter.post(
  '/assignments/:assignmentId/replace',
  validate({ params: uuidParams('assignmentId'), body: replaceAssignmentSchema }),
  asyncHandler(ownerController.replaceAssignment),
);
