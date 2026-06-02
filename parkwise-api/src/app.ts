import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { ensureCsrfCookie, verifyCsrf } from './middleware/csrf.middleware';
import { apiLimiter } from './middleware/rate-limit.middleware';

export const app = express();

// Behind a single reverse proxy in production (Render/Railway/Fly) — needed for
// correct req.ip in rate limiting and Secure cookies.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Issue a CSRF token to every client, then enforce double-submit on mutations.
app.use(ensureCsrfCookie);
app.use(verifyCsrf);

app.use('/api', apiLimiter, apiRouter);

// Unmatched /api routes → standard 404 envelope; then global error handler.
app.use('/api', notFoundHandler);
app.use(errorHandler);
