import { Router } from 'express';
import { adminRouter } from './admin.routes';
import { authRouter } from './auth.routes';
import { driverFavoritesRouter } from './driver-favorites.routes';
import { parkingRouter } from './parking.routes';
import { sysAdminRouter } from './sys-admin.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use(parkingRouter);
apiRouter.use(driverFavoritesRouter);
apiRouter.use(adminRouter);
apiRouter.use(sysAdminRouter);
