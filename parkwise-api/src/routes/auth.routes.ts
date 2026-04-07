import { Router } from 'express';
import { login, me, oauthCallback, oauthStart, register } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/oauth/:provider/start', oauthStart);
authRouter.get('/oauth/:provider/callback', oauthCallback);
authRouter.get('/me', authenticate, me);
