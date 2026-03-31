import type { Request } from 'express';
import type { UserRole } from './api.types';

export interface AppJwtPayload {
  uid: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AppJwtPayload;
}
