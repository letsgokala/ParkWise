import { Router } from 'express';
import { sendOk } from '../lib/api-response';
import { env } from '../config/env';
import { authRouter } from './auth.routes';
import { facilityRouter } from './facility.routes';
import { driverFavoritesRouter } from './driver-favorites.routes';
import { navigationRouter } from './navigation.routes';
import { ownerRouter } from './owner.routes';
import { parkingAdminRouter } from './parking-admin.routes';
import { sysAdminRouter } from './sys-admin.routes';
import { apiIntegrationRouter } from './api-integration.routes';
import { mockExternalRouter } from './mock-external.routes';

const APP_VERSION = '1.0.0';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  sendOk(res, { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

apiRouter.get('/version', (_req, res) => {
  sendOk(res, { name: 'ParkWise API', version: APP_VERSION, environment: env.nodeEnv });
});

apiRouter.use('/auth', authRouter);

// Public (guest-accessible) routers — route-specific middleware only, no gates.
apiRouter.use(facilityRouter);
apiRouter.use(navigationRouter);
apiRouter.use(mockExternalRouter);

// Role-gated routers are mounted under a path PREFIX so their router-level
// requireAuth/requireRole applies only to their own paths — not to everything
// mounted after them.
apiRouter.use('/driver/favorites', driverFavoritesRouter);
apiRouter.use('/owner', ownerRouter);
apiRouter.use('/parking-admin', parkingAdminRouter);
apiRouter.use('/system-admin', sysAdminRouter);
apiRouter.use('/api-integrations', apiIntegrationRouter);
