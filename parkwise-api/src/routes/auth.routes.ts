import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { asyncHandler } from '../lib/async-handler';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { loginSchema, registerDriverSchema, registerOwnerSchema } from '../validators/auth.validators';

export const authRouter = Router();

authRouter.post(
  '/register/driver',
  authLimiter,
  validate({ body: registerDriverSchema }),
  asyncHandler(authController.registerDriver),
);

authRouter.post(
  '/register/facility-owner',
  authLimiter,
  validate({ body: registerOwnerSchema }),
  asyncHandler(authController.registerOwner),
);

authRouter.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));

authRouter.post('/logout', asyncHandler(authController.logout));

authRouter.get('/me', requireAuth, asyncHandler(authController.me));
