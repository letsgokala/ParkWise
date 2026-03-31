import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { apiRouter } from './routes';

export const app = express();

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', apiRouter);
app.use(errorHandler);
