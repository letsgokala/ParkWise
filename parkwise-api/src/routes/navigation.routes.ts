import { Router } from 'express';
import * as navigationController from '../controllers/navigation.controller';
import { asyncHandler } from '../lib/async-handler';
import { validate } from '../middleware/validate.middleware';
import { routeQuerySchema } from '../validators/navigation.validators';

// Public — guests and drivers can both request navigation to approved facilities.
export const navigationRouter = Router();

navigationRouter.get(
  '/navigation/route',
  validate({ query: routeQuerySchema }),
  asyncHandler(navigationController.route),
);
